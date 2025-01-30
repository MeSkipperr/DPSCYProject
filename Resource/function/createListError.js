const xlsx = require("xlsx");
const fs = require("fs").promises; // Menggunakan fs.promises untuk operasi async
const path = require("path");
const sendErrorSystemAdmin = require("../email/sendErrorToAdmin");

async function createListError(deviceData,outputDir) {
    try {
        const transformedData = deviceData.map((item, index) => ({
            no: index + 1,
            status: "down", // Status statis
            "Host Name": item.name,
            "IP Address": item.ipAddress,
            Device: item.device,
            Description: item.description,
        }));

        // Buat worksheet dari data
        const worksheet = xlsx.utils.json_to_sheet(transformedData);

        // Buat workbook dan tambahkan worksheet
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Device Error");

        // Tentukan path output di folder `Project/email`
        const outputFileName = path.join(outputDir, "DeviceError.xlsx");

        // Pastikan folder `Project/email` ada, jika tidak, buat folder
        try {
            await fs.mkdir(outputDir, { recursive: true });
        } catch (err) {
            console.error(`Failed to create directory ${outputDir}:`, err);
            sendErrorSystemAdmin(err);
        }

        // Simpan file Excel
        await fs.writeFile(outputFileName, xlsx.write(workbook, { type: "buffer" }));
        console.log(`File saved to ${outputFileName}`);
    } catch (err) {
        console.error("Error creating the Excel file:", err);
        sendErrorSystemAdmin(err);
    }
}

module.exports = createListError;
