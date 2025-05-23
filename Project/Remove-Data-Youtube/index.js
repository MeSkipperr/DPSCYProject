const { exec } = require("child_process");
const fs = require("fs");
const cron = require("node-cron");
const path = require("path");
const { saveTableToNotepad, sendEmail, adbPath, IPTVData ,delayWithProgressBar} = require("../importShortcut");

const youtubePackage = "com.google.android.youtube.tv";

// Fungsi untuk menjalankan perintah ADB
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

// Fungsi untuk memperbarui status perangkat
const updateStatusTV = (array, targetName, updateStatus) => {
  array.forEach((item) => {
    if (item.name === targetName) {
      item.status = updateStatus;
    }
  });
};

// Data email untuk laporan
const emailData = {
  subject: "YouTube Data Clearance Report - Successful & Failed Devices",
  bodyTemplate: `
Dear {middleName} {lastName},

Attached is the latest report on the YouTube data clearance process for your network devices. 
The report includes details of devices that successfully cleared data and those that encountered errors.

Please review the attached log file for more information.

Best regards,  
Courtyard by Marriott Bali Nusa Dua Resort
  `,
  dynamicVars: {},
};

const logFile = path.join(__dirname, "removeDataYoutube.txt");

const fileAttachment = {
  filePath: logFile,
  fileName: "Remove-Data-Youtube.txt",
};

// Fungsi utama untuk menangani tiap perangkat
const processDevices = async () => {
  console.log("Restarting ADB server...");
  await runCommand(`"${adbPath}" kill-server`);
  await delayWithProgressBar(10000, "Stopping ADB server");

  await runCommand(`"${adbPath}" start-server`);
  await delayWithProgressBar(10000, "Starting ADB server");

  const statusError = {
    CONNECTING: "Connecting",
    FAILED_CONNECT: "Cannot connect to device",
    FAILED_CLEAR: "Failed to clear YouTube data application",
    SUCCESS: "Success",
    UNAUTHORIZED: "Unauthorized device - Please allow ADB debugging",
  };

  const devices = JSON.parse(IPTVData);
  const clearDevices = [];

  const processDevice = async (device,deviceAddressParams = null) => {
    const deviceAddress = deviceAddressParams ||`${device.ipAddress}:5555` ;

    try {

      console.log(`Trying to connect to: ${device.name} | ${device.ipAddress} ...`);
      const connectCommand = `"${adbPath}" connect ${deviceAddress}`;
      const connectOutputFirstTry = await runCommand(connectCommand);

      console.log("Testing connect", connectOutputFirstTry);
      const connectOutput = await runCommand(connectCommand);

      if (connectOutput.toLowerCase().includes("failed")) {
        updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);
        console.error(`Cannot connect to device ${device.name}: ${connectOutput}`);
        return;
      }

      console.log(`Trying to clear YouTube data: ${device.name} | ${device.ipAddress} ...`);
      const clearCommand = `"${adbPath}" -s ${deviceAddress} shell pm clear ${youtubePackage}`;

      try {
        const clearOutput = await runCommand(clearCommand);

        if (clearOutput.toLowerCase().includes("failed")) {
          updateStatusTV(clearDevices, device.name, statusError.FAILED_CLEAR);
          console.error(`Failed to clear YouTube data on ${device.name}: ${clearOutput}`);
          return;
        }

        if (clearOutput.toLowerCase().includes("unauthorized")) {
          updateStatusTV(clearDevices, device.name, statusError.UNAUTHORIZED);
          console.error(`Device unauthorized: ${device.name}. Please check ADB authorization.`);
          return;
        }

        updateStatusTV(clearDevices, device.name, statusError.SUCCESS);
      } catch (error) {
        updateStatusTV(clearDevices, device.name, statusError.FAILED_CLEAR);
        console.error(`Error clearing YouTube data for ${device.name}:`, error);
      }
    } catch (error) {
      updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);
      console.error(`Error connecting to device ${device.name}:`, error);
    }
  };

  for (const device of devices) {
    const deviceAddress = `${device.ipAddress}:5555`;

    clearDevices.push({
      name: device.name,
      ipAddress: deviceAddress,
      status: statusError.CONNECTING,
    });
    await processDevice(device);
  }
  await runCommand(`"${adbPath}" devices`);
  
  // Jika ada perangkat yang gagal, ulangi proses untuk perangkat tersebut
  const tryConnectDevices = clearDevices.filter(device => !device.status.includes(statusError.SUCCESS));  

  console.log("Error Device : ",tryConnectDevices);
  if (tryConnectDevices.length > 0) {
    console.log("\nRetrying failed devices...\n");

    console.log("Restarting ADB server...");
    await runCommand(`"${adbPath}" kill-server`);
    await delayWithProgressBar(10000, "Stopping ADB server");

    await runCommand(`"${adbPath}" start-server`);
    await delayWithProgressBar(10000, "Starting ADB server");

    for (const device of tryConnectDevices) {
      await processDevice(device,device.ipAddress);
    }
  }

  await runCommand(`"${adbPath}" devices`);

  console.table(clearDevices);
  await saveTableToNotepad(clearDevices, logFile);
  sendEmail(null, emailData, null, fileAttachment);
};

// Menjadwalkan eksekusi setiap hari pada pukul 13:00
cron.schedule("0 13 * * *", () => {
  console.clear();
  console.log("Running Program");
  processDevices();
});

// Eksekusi pertama kali saat script dijalankan
// processDevices();
