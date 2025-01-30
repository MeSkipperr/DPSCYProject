const fs = require('fs');
const path = require('path');
const sendErrorSystemAdmin = require('../email/sendErrorToAdmin');

/**
 * Membaca dan memvalidasi file JSON di dalam sebuah direktori dengan isi array yang fleksibel.
 * @param {string} dirPath - Path ke direktori yang berisi file JSON.
 * @param {Object} schema - Objek yang mendefinisikan struktur dan tipe yang diharapkan.
 * @param {boolean} validateWithSchema - Menentukan apakah data perlu divalidasi dengan schema atau tidak.
 * @returns {Promise<Array>} Array dari objek data yang sudah divalidasi (atau semua data jika tidak divalidasi).
 */
async function readAndValidateJsonFiles(dirPath, schema, validateWithSchema = true) {
    const validData = [];

    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);

            // Lewati file yang bukan file .json
            if (path.extname(file) !== '.json') {
                console.log(`Melewati file non-JSON: ${file}`);
                continue;
            }

            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);

                // Jika tidak perlu validasi, langsung tambahkan data
                if (!validateWithSchema) {
                    validData.push(...data);
                    continue;
                }

                // Validasi format berdasarkan schema yang diberikan
                const isValid = data.every(item => {
                    if (item) {
                        return Object.entries(schema).every(([key, type]) => {
                            if (type === 'array') {
                                // Cek apakah kolom 'command' adalah array, tanpa memvalidasi isi array
                                if (Array.isArray(item[key])) {
                                    console.log(`Field '${key}' di file ${file} adalah array: valid`);
                                    return true;
                                } else {
                                    console.log(`Field '${key}' di file ${file} bukan array`);
                                    return false;
                                }
                            }
                            // Cek apakah sesuai dengan tipe yang diharapkan (string)
                            return typeof item[key] === type;
                        });
                    }
                    return false;
                });

                if (isValid) {
                    validData.push(...data);
                } else {
                    console.log(`Format tidak valid di file: ${file}`);
                }
            } catch (err) {
                console.log(`Terjadi kesalahan saat memproses file ${file}:`, err.message);
                sendErrorSystemAdmin(err);
            }
        }
    } catch (err) {
        console.error('Kesalahan saat membaca direktori:', err.message);
        sendErrorSystemAdmin(err);
    }

    return validData;
}

module.exports = readAndValidateJsonFiles;
