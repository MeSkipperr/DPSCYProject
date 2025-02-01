const { exec } = require('child_process');
const cron = require('node-cron');
const path = require('path');
const { saveTableToNotepad, sendEmail, adbPath, IPTVData, delayWithProgressBar } = require("../importShortcut");

const updateStatusTV = (array, targetName, updateStatus) => {
    array.forEach((item) => {
    if (item.name === targetName) {
        item.status = updateStatus;
    }
    });
};

const emailData = {
    subject: "TV Device Reboot Summary for Guest Rooms",
    bodyTemplate: `
Dear {middleName} {lastName},

Below is a summary of the TV devices in the rooms that require a reboot. 
The report includes details of devices that successfully rebooted and those that encountered errors during the process.

Please review the attached log file for more information.

Best regards,  
Courtyard by Marriott Bali Nusa Dua Resort
    `,
    dynamicVars: {},
};

const logFile = path.join(__dirname, 'SystemNeedToReboot.txt');

const fileAttachment = {
    filePath: logFile,
    fileName: "SystemNeedToReboot.txt",
};

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

const rebootDevice = async () => {
    console.log("Restarting ADB server...");
    await runCommand(`"${adbPath}" kill-server`);
    await delayWithProgressBar(10000, "Stopping ADB server");

    await runCommand(`"${adbPath}" start-server`);
    await delayWithProgressBar(10000, "Starting ADB server");

    const statusError = {
        CONNECTING: "Connecting",
        FAILED_CONNECT: "Failed to connect",
        FAILED_UPTIME: "Failed to get uptime",
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
            const connectOutput = await runCommand(connectCommand);

            if (connectOutput.toLowerCase().includes("failed")) {
                console.error(`Cannot connect to device ${device.name}: ${connectOutput}`);
                updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);

                return;
            }

            console.log(`Trying to get uptime for: ${device.name} | ${device.ipAddress} ...`);
            const uptimeCommand = `"${adbPath}" -s ${deviceAddress} shell cat /proc/uptime`;

            try {
                const uptimeOutput = await runCommand(uptimeCommand);

                if (uptimeOutput.toLowerCase().includes("unauthorized")) {
                    console.error(`Cannot get uptime for device: ${device.name}: ${uptimeOutput}`);
                    updateStatusTV(clearDevices, device.name, statusError.UNAUTHORIZED);

                    return;
                }

                const uptimeSeconds = parseFloat(uptimeOutput.split(" ")[0]);
                const uptimeDays = uptimeSeconds / (60 * 60 * 24);

                updateStatusTV(clearDevices, device.name, `${statusError.SUCCESS} - Uptime ${uptimeDays.toFixed(2)} Days`);


            } catch (error) {
                console.error(`Error getting uptime for device ${device.name}:`, error);
                updateStatusTV(clearDevices, device.name, statusError.FAILED_UPTIME);

            }
        } catch (error) {
            console.error(`Error connecting to device ${device.name}:`, error);
            updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);

        }
    };

    // Loop utama
    for (const device of devices) {
        const deviceAddress = `${device.ipAddress}:5555`;

        clearDevices.push({
            name: device.name,
            ipAddress: deviceAddress,
            status: statusError.CONNECTING,
        });
        await processDevice(device);
    }

    // Jika ada perangkat yang gagal, restart ADB lagi lalu ulangi proses
    await runCommand(`"${adbPath}" devices`);

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

    if (clearDevices.length > 0) {
        console.table(clearDevices);
        await saveTableToNotepad(clearDevices, path.join(__dirname, 'SystemNeedToReboot.txt'));
        sendEmail(null, emailData, null, fileAttachment);
    }
};


cron.schedule('0 9 * * *', () => {
    console.clear();
    console.log('Running Program');
    rebootDevice();
});

rebootDevice();