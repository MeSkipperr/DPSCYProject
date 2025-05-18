const inquirer = require('inquirer');

const { adbPath, IPTVData, delayWithProgressBar } = require('../importShortcut');

const { exec } = require('child_process');


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

const updateStatusTV = (array, targetName, updateStatus) => {
    array.forEach((item) => {
        if (item.name === targetName) {
            item.status = updateStatus;
        }
    });
}

// Fungsi utama untuk menangani tiap perangkat
const maxRetries = 3; // maksimal percobaan ulang

const processDevices = async (devicePrams) => {
    console.log(adbPath);

    console.log("Restarting ADB server...");
    await runCommand(`"${adbPath}" kill-server`);
    await delayWithProgressBar(10000, "Stopping ADB server");

    await runCommand(`"${adbPath}" start-server`);
    await delayWithProgressBar(10000, "Starting ADB server");

    const statusError = [
        "Connecting",
        "Cannot connect to device",
        "Failed to get serial number",
        "Success",
    ];
    const devices = devicePrams;
    const clearDevices = [];

    for (const device of devices) {
        const deviceAddress = `${device.ipAddress}:5555`;
        clearDevices.push({ name: device.name, ipAddress: deviceAddress, status: statusError[0], serialNumber: null });

        try {
            console.log(`Trying connect to : ${device.name} | ${device.ipAddress} ...`);
            const connectCommand = `"${adbPath}" connect ${deviceAddress}`;
            const connectOutput = await runCommand(connectCommand);

            if (connectOutput.toLowerCase().includes("failed")) {
                updateStatusTV(clearDevices, device.name, statusError[1]);
                console.error(`Cannot Connect to device  ${device.name}: ${connectOutput}`);
                continue;
            }

            // coba dapatkan serial number dengan retry
            let serialNumber = null;
            let attempt = 0;
            let success = false;
            const getSerialCommand = `"${adbPath}" -s ${deviceAddress} shell getprop ro.serialno`;

            while (attempt < maxRetries && !success) {
                try {
                    console.log(`Attempt ${attempt + 1} to get serial number for ${device.name}`);
                    const output = await runCommand(getSerialCommand);

                    if (output && output.trim() !== "") {
                        serialNumber = output.trim();
                        success = true;
                        updateStatusTV(clearDevices, device.name, statusError[3]);
                    } else {
                        throw new Error("Empty serial number");
                    }
                } catch (error) {
                    attempt++;
                    if (attempt === maxRetries) {
                        updateStatusTV(clearDevices, device.name, statusError[2]);
                        console.error(`Failed to get serial number for ${device.name} after ${maxRetries} attempts`);
                    } else {
                        console.log(`Retrying to get serial number for ${device.name}...`);
                    }
                }
            }

            // update serial number di objek
            clearDevices.forEach(item => {
                if (item.name === device.name) item.serialNumber = serialNumber;
            });
        } catch (error) {
            updateStatusTV(clearDevices, device.name, statusError[1]);
            console.error(`Error trying to connect device ${device.name}:`, error);
        }
    }

    console.table(clearDevices);
};

async function main() {
    const selectRoom = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectRoom',
            message: 'Get Serial Number for Specific Room(s) or All Rooms',
            choices: ['Single or Multiple Rooms', 'All Rooms'],
        },
    ]);

    if(selectRoom.selectRoom === "Single or Multiple Rooms"){
        const chooseRoom = await inquirer.prompt([
            {
                type: 'input',
                name: 'roomnumber',
                message: 'Enter Room Number(s) (e.g., 1001, 1002): ',
            },
        ]);
        const roomNumbers = chooseRoom.roomnumber
        .split(',')
        .map(room => room.trim());

        const iptvData = JSON.parse(IPTVData); // parsing dari JSON string jadi array objek

        const filteredRooms = iptvData.filter(room => {
            const roomNumberInName = room.name.match(/\d+/);
            if (!roomNumberInName) return false;
            return roomNumbers.includes(roomNumberInName[0]);
        });
        processDevices(filteredRooms)
        main()

    }
    if (selectRoom.selectRoom === 'All Rooms') {
        const confirmAll = await inquirer.prompt([
            {
            type: 'confirm',
            name: 'confirmAllRooms',
            message: 'Are you sure you want to get serial numbers for ALL rooms?',
            default: false,
            },
        ]);

        if (!confirmAll.confirmAllRooms) {
            console.log('Operation cancelled.');
            main()
        }else{
            const iptvData = JSON.parse(IPTVData); // parsing dari JSON string jadi array objek
            processDevices(iptvData)
        }
    }
}

main();
