const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const egrulRouter = require("./routes/egrulRouter");

dotenv.config();
const app = express();
app.use(express.static("public"));
app.use(express.json());

const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("БД работает:", mongoURI);
    app.listen(process.env.PORT, () => {
      console.log("Сервер запущен на порте 3000");
    });
  })
  .catch((err) => console.log(err));

app.use("/api/egrul", egrulRouter);

app.use(function (_, res) {
  res.status(404).send("Not Found");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Приложение завершило работу");
  process.exit();
});
