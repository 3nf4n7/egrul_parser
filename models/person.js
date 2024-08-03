const mongoose = require("mongoose");

const personSchema = new mongoose.Schema({
  legal: String,
  ogrnip: String,
  ogrn: String,
  inn: String,
  kpp: String,
  ogrnipStart: String,
  ogrnStart: String,
  endDate: String,
  filePath: String,
  updateTimestamp: Number,
});

module.exports = mongoose.model("Person", personSchema);
