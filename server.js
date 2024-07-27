const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const parseEgrulNalog = require("./parseEgrulNalog");

const app = express();
app.use(express.static("public"));
app.use(express.json());

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017/");

(async () => {
  try {
    await mongoClient.connect();
    app.locals.collection = mongoClient.db("egrul").collection("person");
    app.listen(3000);
    console.log("Сервер ожидает подключения...");
  } catch (err) {
    return console.log(err);
  }
})();

app.get("/api/egrul", async (req, res) => {
  const collection = req.app.locals.collection;
  const searchQuery = {};
  if (req.query.legal) searchQuery.legal = req.query.legal;
  if (req.query.fio) {
    searchQuery.fio = { $regex: req.query.fio, $options: "i" };
  }
  if (req.query.inn) searchQuery.inn = req.query.inn;
  console.log(searchQuery);
  try {
    let persons = await collection.find(searchQuery).toArray();
    if (persons && persons.length > 0) res.send(persons);

    res.sendStatus(404);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

process.on("SIGINT", async () => {
  await mongoClient.close();
  console.log("Приложение завершило работу");
  process.exit();
});
