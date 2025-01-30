const ping = require("ping"); // Lightweight module for pinging
const fs = require("fs"); // For interacting with the file system
const path = require("path"); // For manipulating file paths


const {
  sendErrorSystemAdmin,
  formatDate,
  readAndValidateJsonFiles,
  createListError,
  fetchSystemInformation,
  delay
} = require("../importShortcut");
const {
  sendErrorEmail,
  sendRecoveryEmail,
  sendListError,
  sendSystemInformation
} = require("./emailTemplate");

// Cache to prevent repeated email notifications
const emailCooldown = new Map();
const unreachableDevices = [];

// Helper function to throttle email sending
function shouldSendEmail(data, type) {
  const key = `${data.name}-${type}`;
  const now = Date.now();
  const lastSent = emailCooldown.get(key) || 0;

  if (now - lastSent > 30000) {
    // Cooldown period of 30 seconds
    emailCooldown.set(key, now);
    return true;
  }
  return false;
}

// Function to ping a given IP address and analyze its status
async function pingAddress(data) {
  const lineNetwork = 15; // Number of lines to analyze in the log
  const filePath = path.join(__dirname, "log", `${data.name}.txt`);

  try {
    // Ping the IP address using the `ping` module
    const res = await ping.promise.probe(data.ipAddress, { timeout: 1 });

    const outputLines = res.output.split("\r\n");

    // Create a log message
    const logMessage = `${
      res.alive ? outputLines[2] : `${data.ipAddress} - Request timed out.`
    } - ${formatDate()} `;
    console.log(logMessage);

    // Append the log message to the log file
    await fs.promises.appendFile(filePath, logMessage + "\n");

    // Read the last few lines of the log file (optional, for analysis)
    const fileData = await fs.promises.readFile(filePath, "utf8");
    const lines = fileData.trim().split("\n");
    const lastFiveLines = lines.slice(-lineNetwork);

    // Check if all recent logs are failures or successes
    const allNoReply = lastFiveLines.every(
      (line) => !line.startsWith("Reply from")
    );
    const allSuccess = lastFiveLines.every((line) =>
      line.startsWith("Reply from")
    );

    // Send email if the status has changed
    if (allNoReply && shouldSendEmail(data, "error") && !data.error) {
      sendErrorEmail(data); // Send error notification email
      console.log("Send error email");
      data.error = true;
      if (!unreachableDevices.includes(data)) {
        unreachableDevices.push(data); // Add to the list of unreachable devices
      }
    } else if (allSuccess && shouldSendEmail(data, "recovery") && data.error) {
      console.log("Send recovery email");
      sendRecoveryEmail(data); // Send recovery notification email
      data.error = false;
      const index = unreachableDevices.indexOf(data);
      if (index !== -1) {
        unreachableDevices.splice(index, 1); // Remove device from the unreachable list
      }
    }
  } catch (err) {
    console.error(`Ping error for ${data.name}:`, err);
    sendErrorSystemAdmin(err);
  }
}

const allDevices = [];
let getAlldata = false;

// Load and validate JSON device data
(async () => {
  const schema = {
    name: "string",
    ipAddress: "string",
    device: "string",
    error: "boolean",
    description: "string",
  };

  const dirPath = path.join(__dirname, "../../Resource/device");
  const allValidData = await readAndValidateJsonFiles(dirPath, schema);

  // Add the valid data to the global allDevices array
  allDevices.push(...allValidData);

  console.log("Combined Valid Data:", allValidData);
  getAlldata = true;
  if (getAlldata) {
    const pingPromises = allDevices.map(pingAddress);
    await Promise.all(pingPromises); // Wait for all pings to complete
  }

  await createListError(unreachableDevices,path.join(__dirname, "summary"));
  await fetchSystemInformation(allDevices,path.join(__dirname, "summary","Device_Information.txt"));

  await delay(180000);

  await sendListError(path.join(__dirname, "summary","DeviceError.xlsx"));
  await sendSystemInformation(path.join(__dirname, "summary","Device_Information.txt"));
})();

// Batch pinging of devices
const batchPing = async () => {
  if (getAlldata) {
    const pingPromises = allDevices.map(pingAddress);
    await Promise.all(pingPromises); // Wait for all pings to complete
  }
  console.log("Batch pinging complete.");
};




// Ping all  devices every 30 second
setInterval(batchPing, 30000);
