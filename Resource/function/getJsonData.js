const fs = require('fs');
const path = require('path');
const sendErrorSystemAdmin = require('../email/sendErrorToAdmin');

/**
 * Reads and validates JSON files in a directory with a flexible array structure.
 * @param {string} dirPath - The path to the directory containing JSON files.
 * @param {Object} schema - An object defining the expected structure and data types.
 * @param {boolean} validateWithSchema - Determines whether data should be validated against the schema.
 * @param {string[]} excludedFiles - An array of filenames that should be ignored.
 * @returns {Promise<Array>} An array of validated objects (or all data if not validated).
 */
async function readAndValidateJsonFiles(dirPath, schema, validateWithSchema = true, excludedFiles = []) {
    const validData = [];

    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            // Skip files listed in excludedFiles
            if (excludedFiles.includes(file)) {
                console.log(`Skipping excluded file: ${file}`);
                continue;
            }

            const filePath = path.join(dirPath, file);

            // Skip non-JSON files
            if (path.extname(file) !== '.json') {
                console.log(`Skipping non-JSON file: ${file}`);
                continue;
            }

            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);

                // If validation is not required, add the data directly
                if (!validateWithSchema) {
                    validData.push(...data);
                    continue;
                }

                // Validate format based on the given schema
                const isValid = data.every(item => {
                    if (item) {
                        return Object.entries(schema).every(([key, type]) => {
                            if (type === 'array') {
                                // Check if the 'command' field is an array without validating its contents
                                if (Array.isArray(item[key])) {
                                    console.log(`Field '${key}' in file ${file} is an array: valid`);
                                    return true;
                                } else {
                                    console.log(`Field '${key}' in file ${file} is not an array`);
                                    return false;
                                }
                            }
                            // Check if the value matches the expected data type (string)
                            return typeof item[key] === type;
                        });
                    }
                    return false;
                });

                if (isValid) {
                    validData.push(...data);
                } else {
                    console.log(`Invalid format in file: ${file}`);
                }
            } catch (err) {
                console.log(`Error processing file ${file}:`, err.message);
                sendErrorSystemAdmin(err);
            }
        }
    } catch (err) {
        console.error('Error reading directory:', err.message);
        sendErrorSystemAdmin(err);
    }

    return validData;
}

module.exports = readAndValidateJsonFiles;
