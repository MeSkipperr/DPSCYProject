const path = require('path');
const fs = require('fs');

const sendEmail = require('../Resource/email/sendEmail');
const sendErrorSystemAdmin = require('../Resource/email/sendErrorToAdmin');
const { saveTableToNotepad,clearNotepad } = require("../Resource/function/notepadManager");
const  delay = require("../Resource/function/delay");
const  formatDate = require("../Resource/function/timeFormat");
const  createListError = require("../Resource/function/createListError");
const  readAndValidateJsonFiles = require("../Resource/function/getJsonData");
const  fetchSystemInformation = require("../Resource/function/getSystemInformation");

const adbPath = path.join(__dirname, '..','Resource','ADB', 'adb.exe');

const ipTVJSON = path.resolve(__dirname, '../Resource/device/ipTV.json');
const IPTVData = fs.readFileSync(ipTVJSON, 'utf-8');

module.exports = {
    sendEmail,
    clearNotepad,
    saveTableToNotepad,
    adbPath,
    IPTVData,
    sendErrorSystemAdmin,
    delay,
    fetchSystemInformation,
    readAndValidateJsonFiles,
    createListError,
    formatDate
};