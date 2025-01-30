const { exec } = require("child_process"); // To execute shell commands
const cron = require("node-cron"); // For scheduling tasks
const {sendErrorSystemAdmin} = require("../importShortcut")

//Restart Computer
cron.schedule("0 9 * * 1", async () => {
    try {
        // Restart the computer based on the operating system
        const command =
            process.platform === "win32" ? "shutdown /r /t 0" : "sudo reboot";

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to execute restart command: ${error.message}`);
                return;
            }
            console.log(`Restart command executed successfully: ${stdout}`);
        });
    } catch (error) {
        console.error("An error occurred during the scheduled task:", error);
        sendErrorSystemAdmin(error);
    }
});

// Scheduled task to clear logs on the 1st of every month at 12 AM
cron.schedule("0 0 1 * *", () => {
    console.log("Running scheduled task on the 1st of the month at 12 AM...");
    const logFolder =path.join(__dirname, '../Monitoring-Network/log');
    

    fs.readdir(logFolder, (err, files) => {
        if (err) {
            console.error("Error reading log folder:", err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(logFolder, file);

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file ${filePath}:`, err);
                } else {
                    console.log(`Deleted file: ${filePath}`);
                }
            });
        });
    });
});