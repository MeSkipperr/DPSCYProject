const {sendEmail,adbPath,IPTVData} = require('../importShortcut');

const { exec } = require('child_process');

const youtubePackage = 'com.google.android.youtube.tv';

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

const  updateStatusTV = (array, targetName, updateStatus) => {
    array.forEach((item) => {
    if (item.name === targetName) {
        item.status = updateStatus;
    }
    });
}

// Fungsi utama untuk menangani tiap perangkat
const processDevices = async () => {
    console.log(adbPath)
    const statusError  = ["Connecting","Cannot connect to device" , "Failed to enable Youtube data application" ,"Success","Cannot reboot system"]
    const devices = JSON.parse(IPTVData);
    const clearDevices = [];

    for (const device of devices) {
        const deviceAddress = `${device.ipAddress}:5555`;
        try {
            clearDevices.push({ name: device.name, ipAddress: deviceAddress, status : statusError[0]});

            console.log(`Trying connect to : ${device.name} | ${device.ipAddress} ...`)
            const connectCommand = `"${adbPath}" connect ${deviceAddress}`;
            const connectOutput = await runCommand(connectCommand);

            if (connectOutput.toLowerCase().includes('failed')) {
                updateStatusTV(clearDevices,device.name,statusError[1])
                console.error(`Cannot Connect to device  ${device.name}: ${connectOutput}`);
                continue;
            }
            
            console.log(`Trying to enable Youtube data application : ${device.name} | ${device.ipAddress} ...`)
            const enableYoutube = `"${adbPath}" -s ${deviceAddress} shell pm enable ${youtubePackage}`;
            const clearOutput = await runCommand(enableYoutube);

            if (clearOutput.toLowerCase().includes('failed')) {
                updateStatusTV(clearDevices,device.name,statusError[2])
                console.error(`Cannot enable youtube data application ${device.name}: ${clearOutput}`);
                continue; 
            }


            console.log(`Trying to reboot device : ${device.name} | ${device.ipAddress} ...`)
            const rebootSystem = `"${adbPath}" -s ${deviceAddress} reboot`;
            const rebootSystemOutput = await runCommand(rebootSystem);

            if (rebootSystemOutput.toLowerCase().includes('failed')) {
                updateStatusTV(rebootSystemOutput,device.name,statusError[4])
                console.error(`Cannot enable youtube data application ${device.name}: ${clearOutput}`);
                continue; 
            }

            updateStatusTV(clearDevices,device.name,statusError[3])
        } catch (error) {
            console.error(`Error trying to connect device ${device.name}:`, error);
        }
    }
    console.table(clearDevices)
};


processDevices()