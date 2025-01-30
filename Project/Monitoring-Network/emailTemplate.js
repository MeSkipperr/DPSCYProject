const { sendEmail } = require("../importShortcut");

const sendErrorEmail = async (data) => {
    const emailData = {
        subject: "Device Ping Error Notification",
        bodyTemplate: `
Dear {middleName} {lastName},

We would like to inform you that an error has occurred in the network system. Below are the details:

    - Time : {time}
    - Host Name: ${data.name}
    - IP Address: ${data.ipAddress}
    - Device: ${data.device}
    ${
        data.description.trim() === ""
        ? ""
        : `- Descriptions : ${data.description} `
    }

Kindly review the information provided and take necessary actions to resolve the issue at your earliest convenience.

Best regards,
Courtyard by Marriott Bali Nusa Dua Resort
        `,
        dynamicVars: {},
    };

    await sendEmail(null, emailData, null, null);
} 
const sendRecoveryEmail = async (data) => {
    const emailData = {
        subject: "Device Ping Error Notification",
        bodyTemplate: `
Dear {middleName} {lastName},

This is to notify you of a network system recovery update. Below are the recovery details:

    - Time : {time}
    - Host Name: ${data.name}
    - IP Address: ${data.ipAddress}
    - Device: ${data.device}
    ${
        data.description.trim() === ""
        ? ""
        : `- Descriptions : ${data.description} `
    }

Inspect the details and confirm the system is back to normal.

Best regards,
Courtyard by Marriott Bali Nusa Dua Resort
        `,
        dynamicVars: {},
    };

    await sendEmail(null, emailData, null, null);
}
const sendListError =  async (filePath) => {
    const emailData = {
        subject: "Notification of Network Device Status - Error Detected",
        bodyTemplate: `
Dear {middleName} {lastName},
    
Please find attached a collection of devices that still have errors detected in your system. This report provides detailed information about the affected devices for your review.

Best regards,
Courtyard by Marriott Bali Nusa Dua Resort
        `,
        dynamicVars: {},
    };
    
    const fileAttachment = {
        filePath,
        fileName: "DeviceError.xlsx",
    };
    await sendEmail(null, emailData, null, fileAttachment);
}
const sendSystemInformation = async (filePath) => {
    const emailData = {
        subject: "Device Information",
        bodyTemplate: `
Dear {middleName} {lastName},

The attached report contains detailed information about the current status of devices in the network. This information has been generated to help identify and address potential issues within the system.

Best regards,
Courtyard by Marriott Bali Nusa Dua Resort
        `,
        dynamicVars: {},
    };
    
    const fileAttachment = {
        filePath,
        fileName: "Device_Information.txt",
    };
    await sendEmail(null, emailData, null, fileAttachment);
}

module.exports = {
    sendErrorEmail,
    sendRecoveryEmail,
    sendSystemInformation,
    sendListError
}

