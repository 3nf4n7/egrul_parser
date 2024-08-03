const {
  parseEgrulNalog,
  egrulDownload,
} = require("../helpers/parseEgrulNalog");
const fs = require("fs");
const Person = require("../models/person");

exports.getPeopleEgrul = async (req, res) => {
  try {
    const query = req.query.query || "";
    const regex = new RegExp(query, "i");
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter || false;
    const limit = 20;
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $addFields: {
          combinedFields: {
            $concat: [
              { $ifNull: ["$legal", ""] },
              " ",
              { $ifNull: ["$ogrnip", ""] },
              " ",
              { $ifNull: ["$ogrn", ""] },
              " ",
              { $ifNull: ["$inn", ""] },
            ],
          },
        },
      },
      {
        $match: {
          combinedFields: { $regex: regex },
          ...(filter === "no" && { endDate: { $ne: null } }),
          ...(filter === "yes" && { endDate: { $eq: null } }),
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const persons = await Person.aggregate(pipeline);

    const baseQueryCount = {
      $or: [
        { legal: { $regex: regex } },
        { ogrnip: { $regex: regex } },
        { ogrn: { $regex: regex } },
        { inn: { $regex: regex } },
      ],
    };

    let queryCount;

    if (filter === "no") {
      queryCount = {
        $and: [{ endDate: { $ne: null } }, baseQueryCount],
      };
    } else if (filter === "yes") {
      queryCount = {
        $and: [{ endDate: { $eq: null } }, baseQueryCount],
      };
    } else {
      queryCount = baseQueryCount;
    }

    const count = await Person.countDocuments(queryCount);

    if (persons && persons.length > 0) {
      res.send({ persons, count });
    } else {
      const parsedPersons = await parseEgrulNalog(req.query.query);
      if (!parsedPersons.length) {
        res.send({ persons: [], count: 0 });
        return;
      }

      const newPersons = parsedPersons.map((person) => {
        const ogrnipMatch = person.description.match(/ОГРНИП:\s*(\d+)/i);
        const ogrnMatch = person.description.match(/ОГРН:\s*(\d+)/i);
        const innMatch = person.description.match(/ИНН:\s*(\d+)/i);
        const kppMatch = person.description.match(/КПП:\s*(\d+)/i);
        const dateOgrnMatch = person.description.match(
          /Дата присвоения ОГРН:\s*([\d.]+)/i
        );
        const dateOgrnipMatch = person.description.match(
          /Дата присвоения ОГРНИП:\s*([\d.]+)/i
        );
        const endDateMatch = person.description.match(
          /Дата прекращения деятельности:\s*([\d.]+)/i
        );

        return {
          legal: person.title?.trim() ?? null,
          ogrnip: ogrnipMatch ? ogrnipMatch[1] : null,
          ogrn: ogrnMatch ? ogrnMatch[1] : null,
          inn: innMatch ? innMatch[1] : null,
          kpp: kppMatch ? kppMatch[1] : null,
          ogrnStart: dateOgrnMatch ? dateOgrnMatch[1] : null,
          ogrnipStart: dateOgrnipMatch ? dateOgrnipMatch[1] : null,
          endDate: endDateMatch ? endDateMatch[1] : null,
          filePath: person.filePath ?? null,
          updateTimestamp: Date.now(),
        };
      });

      await Person.insertMany(newPersons);

      if (newPersons && newPersons.length > 0) {
        res.send({
          persons: await Person.aggregate(pipeline),
          count: await Person.countDocuments({
            $or: [
              { legal: { $regex: regex } },
              { ogrnip: { $regex: regex } },
              { ogrn: { $regex: regex } },
              { inn: { $regex: regex } },
            ],
          }),
        });
      } else {
        res.sendStatus(404);
      }
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.downloadPersonInfo = async (req, res) => {
  if (req.query.id) {
    try {
      let person = await Person.findOne({ _id: req.query.id });
      if (!person) {
        return res.status(404).send("Person not found");
      }

      let filePath = "";
      const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
      const personFileNeedUpdate =
        person.updateTimestamp <
        new Date(Date.now() - oneDayInMilliseconds).getTime();
      if (!person.filePath || personFileNeedUpdate) {
        if (person.filePath) {
          fs.unlink(person.filePath, (err) => {
            if (err) throw err;
            console.log("Старый файл удален");
          });
        }
        filePath = await egrulDownload(person.inn);
        person.filePath = filePath;
        person.updateTimestamp = Date.now();
        await person.save();
      }

      res.download(person.filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(404).send("File not found");
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  } else {
    res.status(400).send("ID parameter is missing");
  }
};
