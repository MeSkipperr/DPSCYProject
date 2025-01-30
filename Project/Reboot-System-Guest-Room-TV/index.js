const { exec } = require('child_process');
const cron = require('node-cron');
const path = require('path');
const { saveTableToNotepad,sendEmail,adbPath,IPTVData, delayWithProgressBar } = require("../importShortcut");


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
    await delayWithProgressBar(10000,"Stopping ADB server");

    await runCommand(`"${adbPath}" start-server`);
    await delayWithProgressBar(10000,"Starting ADB server");

    const devices = JSON.parse(IPTVData);
    const failedReboot = [];
    for (const device of devices) {
        const deviceAddress = `${device.ipAddress}:5555`;

        try {
            console.log(`Trying connect to : ${device.name} | ${device.ipAddress} ...`);
            const connectCommand = `"${adbPath}" connect ${deviceAddress}`;
            const connectOutput = await runCommand(connectCommand);

            if (connectOutput.toLowerCase().includes('failed')) {
                console.error(`Cannot Connect to device ${device.name}: ${connectOutput}`);
                failedReboot.push({
                    name: device.name,
                    ipAddress: device.ipAddress,
                    status: "Failed to connect"
                });
                continue; 
            }

            console.log(`Trying to get uptime device : ${device.name} | ${device.ipAddress} ...`);
            const uptime = `"${adbPath}" -s ${deviceAddress} shell cat /proc/uptime`;
            try {
                const uptimeOutput = await runCommand(uptime);
    
                if (uptimeOutput.toLowerCase().includes('unauthorized')) {
                    console.error(`Cannot get uptime device : ${device.name}: ${uptimeOutput}`);
                    failedReboot.push({
                        name: device.name,
                        ipAddress: device.ipAddress,
                        status: "Failed to get runtime"
                    });
                    continue;
                }
    
                const uptimeSeconds = parseFloat(uptimeOutput.split(" ")[0]);
                const uptimeDays = uptimeSeconds / (60 * 60 * 24);
                
                failedReboot.push({
                    name: device.name,
                    ipAddress: device.ipAddress,
                    status: `Uptime ${uptimeDays} Days`
                });
                
            } catch (error) {
                failedReboot.push({
                    name: device.name,
                    ipAddress: device.ipAddress,
                    status: "Failed to get runtime"
                });
                console.error(`Cannot get uptime device : ${device.name}: ${uptimeOutput}`);
            }
        } catch (error) {
            console.error(`Error trying to connect device ${device.name}:`, error);
            failedReboot.push({
                name: device.name,
                ipAddress: device.ipAddress,
                status: "Error occurred"
            });
        }
    }

    if (failedReboot.length > 0) {
        console.table(failedReboot);
        await saveTableToNotepad(failedReboot, path.join(__dirname, 'SystemNeedToReboot.txt'));
        sendEmail(null, emailData, null, fileAttachment);
    }
};


cron.schedule('0 9 * * *', () => {
    console.clear();
    console.log('Running Program');
    rebootDevice();
});

rebootDevice();