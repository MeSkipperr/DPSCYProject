const fs = require("fs").promises;

/**
 * Adds text to a notepad file.
 * @param {string} text - The text to be added.
 * @param {string} filePath - The full file path (including the file name).
 */
async function saveTableToNotepad(data, filePath) {
  let tableText = "Name                | IP Address         | Status\n";
  tableText += "---------------------------------------------------------\n";

  data.forEach(row => {
    tableText += `${row.name.padEnd(20)} | ${row.ipAddress.padEnd(20)} | ${row.status}\n`;
  });

  try {
    await fs.writeFile(filePath, tableText, "utf8");
    console.log(`✅ Table saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error saving file: ${error.message}`);
  }
}

/**
 * Clears the contents of a notepad file.
 * @param {string} filePath - The full file path (including the file name).
 */
async function clearNotepad(filePath) {
  try {
    // Overwrite the file with an empty string
    await fs.writeFile(filePath, "", "utf8");
    console.log(`Notepad successfully cleared: ${filePath}`);
  } catch (error) {
    console.error(`Failed to clear the notepad: ${error.message}`);
  }
}

module.exports = { saveTableToNotepad, clearNotepad };
