const readline = require('readline');
const { adbPath, IPTVData } = require("../importShortcut");
const { exec } = require('child_process');

// Create an interface to read input from the terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

// Function to ask for number input and process it
async function askRoomNumberToReboot() {
    console.log("Please enter the room number that needs to be rebooted:");

    rl.question('=', async (input) => {
        const roomNumber = parseFloat(input);

        if(isNaN(roomNumber)){
            console.log("Invalid Room Number")
            return askRoomNumberToReboot();
        } 

        const devices = JSON.parse(IPTVData);
        const device = devices.find(d => d.name.includes(`IPTV Room ${roomNumber}`));

        if(!device){
            console.log("Room Number Not Found")
            return askRoomNumberToReboot();
        } 

        const statusError = {
            CONNECTING:       "Connecting", //Device Office
            FAILED_CONNECT:   "Cannot connect to device", //Unauthorized
            FAILED_REBOOT:     "Failed to reboot system",//Unauthorized
            SUCCESS:          "Success",
            UNAUTHORIZED:     "Unauthorized device - Please allow ADB debugging", // Unauthorized
        };
        const deviceAddress = `${device.ipAddress}:5555`;
        const clearDevices = [];

        try {
            clearDevices.push({ name: device.name, ipAddress: deviceAddress, status : statusError[0]});

            console.log(`Trying to connect to: ${device.name} | ${device.ipAddress} ...`);
            const connectCommand = `"${adbPath}" connect ${deviceAddress}`;
            await runCommand(connectCommand); 
            const connectOutput = await runCommand(connectCommand);
    
            if (connectOutput.toLowerCase().includes("failed")) {
                updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);
                console.error(`Cannot connect to device ${device.name}: ${connectOutput}`);
                return askRoomNumberToReboot();
            }
            
            try {
                console.log(`Trying to reboot device : ${device.name} | ${device.ipAddress} ...`)
                const rebootSystem = `"${adbPath}" -s ${deviceAddress} reboot`;
                const rebootSystemOutput = await runCommand(rebootSystem);
    
                if (rebootSystemOutput.toLowerCase().includes('failed')) {
                    updateStatusTV(clearDevices, device.name, statusError.FAILED_REBOOT);
                    console.error(`Error connecting to device ${device.name}:`, error);
                    return askRoomNumberToReboot();
                }
                updateStatusTV(clearDevices, device.name, statusError.SUCCESS);
            } catch (error) {
                updateStatusTV(clearDevices, device.name, statusError.FAILED_REBOOT);
                console.error(`Error connecting to device ${device.name}:`, error);
            }finally{
                askRoomNumberToReboot();
            }
        } catch (error) {
            updateStatusTV(clearDevices, device.name, statusError.FAILED_CONNECT);
            console.error(`Error connecting to device ${device.name}:`, error);
        }finally{
            console.table(clearDevices);
            askRoomNumberToReboot();
        }
    });
}

// Start the function
askRoomNumberToReboot();
