const express = require("express");
const mongoose = require("mongoose");
const parseEgrulNalog = require("./parseEgrulNalog");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.static("public"));
app.use(express.json());

const mongoURI = "mongodb://127.0.0.1:27017/egrul";

mongoose.connect(mongoURI);

const personSchema = new mongoose.Schema({
  legal: String,
  ogrnip: String,
  ogrn: String,
  inn: String,
  kpp: String,
  ogrnipStart: String,
  ogrnStart: String,
  filePath: String,
});

const Person = mongoose.model("Person", personSchema);

app.listen(3000, () => {
  console.log("Сервер запущен на порте 3000");
});

app.get("/api/egrul", async (req, res) => {
  try {
    const regex = new RegExp(req.query.query, "i");

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
        },
      },
    ];

    const persons = await Person.aggregate(pipeline);

    if (persons && persons.length > 0) {
      res.send(persons);
    } else {
      const parsedPersons = await parseEgrulNalog(req.query.query);
      if (!parsedPersons.lenght) return [];

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
        };
      });

      await Person.insertMany(newPersons);

      if (newPersons && newPersons.length > 0) {
        res.send(newPersons);
      } else {
        res.sendStatus(404);
      }
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/api/egrul/download", async (req, res) => {
  if (req.query.id) {
    let person = await Person.findOne({ _id: req.query.id });
    console.log(person);
    res.download(person.filePath, (err) => {
      if (err) {
        console.log(err);
        res.status(404).send("File not found");
      }
    });
  }
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Приложение завершило работу");
  process.exit();
});
