const express = require("express");
const egrulController = require("../controllers/egrulController");
const egrulRouter = express.Router();

egrulRouter.use("/download", egrulController.downloadPersonInfo);
egrulRouter.use("/", egrulController.getPeopleEgrul);

module.exports = egrulRouter;
