
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const readAndValidateJsonFiles = require("../getJsonData");
const sendErrorSystemAdmin = require('../../email/sendErrorToAdmin');


/**
 * Fetch system information from devices and save it to a file.
 * @param {Array} devices - Array of device information (name, IP, type, etc.).
 * @param {Array} commandList - Array of commands specific to device types.
 * @param {string} fileName - The file name to save the output. Defaults to 'Device_Information_txt'.
 */
const fetchSystemInformation = async (devices,filePath) => {
    // Path to save the output file
    console.log("Device_Information_txt at ", filePath)

    // Clear the file content if the file already exists
    if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, ''); // Clear file content
        console.log(`File ${filePath} already exists. Content cleared.`);
    }

    // Validation schema for the command JSON files
    const schema = {
        device: 'string',
        username: "string",
        password: "string",
        command: "array"
    };

    // Path to the directory where the command JSON files are located
    const dirPath = path.join(__dirname, 'command');
    const commandList = await readAndValidateJsonFiles(dirPath, schema, false);

    /**
     * Execute an SSH command on a device.
     * @param {string} cmd - The command to execute.
     * @param {object} conn - SSH connection object.
     * @param {object} device - Device details (name, IP, etc.).
     * @returns {Promise<string>} - Promise resolving to the command output.
     */
    const executeSSHCommand = (cmd, conn, device) => {
        return new Promise((resolve, reject) => {
            conn.exec(cmd, { execTimeout: 15000 }, (err, stream) => {
                if (err) {
                    reject(`Error executing command: ${cmd} on ${device.name}`);
                }

                let output = `\n\nDevice: ${device.name} (${device.device})\nIP Address: ${device.ipAddress}\nCommand: ${cmd}\n`;
                stream
                    .on('close', (code, signal) => {
                        console.log(`Command executed: ${cmd}`);
                        resolve(output);
                    })
                    .on('data', (data) => {
                        output += data.toString();
                    })
                    .stderr.on('data', (data) => {
                        reject(`Error: ${data.toString()}`);
                    });
            });
        });
    };

    // Iterate over each device in the list
    devices.forEach((device) => {
        // Find the device configuration based on its type
        const deviceConfig = commandList.find((config) => config.device === device.device);

        if (!deviceConfig) {
            return; // Skip the device if no matching configuration is found
        }

        // Establish SSH connection to the device
        const conn = new Client();
        conn
            .on('ready', async () => {
                console.log(`SSH connection established for ${device.name}`);

                try {
                    // Execute all commands corresponding to the device type
                    for (const cmd of deviceConfig.command) {
                        const output = await executeSSHCommand(cmd, conn, device);
                        // Append output to the file
                        fs.appendFile(filePath, output, (err) => {
                            if (err) {
                                console.error('Error writing to file:', err);
                            } else {
                                console.log(`Output for ${device.name} appended to ${filePath}`);
                            }
                        });
                    }
                    conn.end();
                } catch (err) {
                    console.error(`Error during command execution for ${device.name}:`, err);
                    sendErrorSystemAdmin(err);
                    // Log error to the file
                    const errorLog = `\n\nDevice: ${device.name} (${device.device})\nIP Address: ${device.ipAddress}\nERROR : ${err}\n`;
                    fs.appendFile(filePath, errorLog, (err) => {
                        if (err) {
                            console.error('Error writing error log to file:', err);
                        } else {
                            console.log(`Error for ${device.name} logged to ${filePath}`);
                        }
                    });
                }
            })
            .on('error', (err) => {
                console.error(`SSH connection error for ${device.name}:`, err);
                // Log connection error to the file
                const errorLog = `\n\nDevice: ${device.name} (${device.device})\nIP Address: ${device.ipAddress}\nERROR : ${err}\n`;
                fs.appendFile(filePath, errorLog, (err) => {
                    if (err) {
                        console.error('Error writing error log to file:', err);
                    } else {
                        console.log(`Error for ${device.name} logged to ${filePath}`);
                    }
                });
            })
            .on('end', () => {
                console.log(`SSH connection closed for ${device.name}`);
            })
            .connect({
                host: device.ipAddress,
                port: 22,
                username: deviceConfig.userName ||"",
                password: deviceConfig.password || "",
            });
    });
};

module.exports = fetchSystemInformation;
