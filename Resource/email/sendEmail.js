require("dotenv").config();
// Import necessary modules
const nodemailer = require("nodemailer"); // To send emails
const path = require("path"); // To handle file paths
const fs = require("fs"); // To check if file exists

// Import helper functions
const formatDate = require("../function/timeFormat");
const sendErrorSystemAdmin = require("./sendErrorToAdmin");
const recipientJSON = require("../auth/recipient");

// Configure the email transporter (e.g., Gmail service)
const transporter = nodemailer.createTransport({
    service: "gmail", // Using Gmail as the email service
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Reusable email sending function with optional file attachment
 * @param {Array} recipients - List of recipient objects (each with email and optional names)
 * @param {Object} emailData - Data for email content (subject, body template, dynamic variables)
 * @param {Object} senderData - Optional custom sender details (email, name)
 * @param {Object} fileAttachment - Optional file attachment ({ filePath, fileName })
 */
async function sendEmail(recipients = null, emailData, senderData = null, fileAttachment = null) {
    const userRecipients = recipients || recipientJSON;

    const senderEmail = senderData?.email || process.env.EMAIL_USER; // Fallback to .env
    const senderName = senderData?.name || "DPSCY SYSTEM"; // Optional custom sender name
    
    for (const recipient of userRecipients) {
        // Use template variables and default values
        const emailBody = emailData.bodyTemplate
            .replace("{middleName}", recipient.middleName || "")
            .replace("{lastName}", recipient.lastName || "")
            .replace("{time}", emailData.dynamicVars?.time || formatDate())
            .replace("{hostName}", emailData.dynamicVars?.hostName || "Unknown Host")
            .replace("{ipAddress}", emailData.dynamicVars?.ipAddress || "Unknown IP")
            .replace("{device}", emailData.dynamicVars?.device || "Unknown Device")
            .replace("{description}", emailData.dynamicVars?.description || "No additional details");

        // Prepare email options
        const mailOptions = {
            from: `${senderName} <${senderEmail}>`,
            to: recipient.email,
            subject: emailData.subject,
            text: emailBody,
            attachments: [],
        };

        // If file attachment exists, validate and attach
        if (fileAttachment?.filePath) {
            const resolvedPath = path.resolve(fileAttachment.filePath);
            if (fs.existsSync(resolvedPath)) {
                mailOptions.attachments.push({
                    filename: fileAttachment.fileName || path.basename(resolvedPath),
                    path: resolvedPath,
                });
            } else {
                console.error(`File not found: ${resolvedPath}`);
            }
        }

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${recipient.email}:`, info.response);
        } catch (err) {
            console.error(`Failed to send email to ${recipient.email}:`, err);
            sendErrorSystemAdmin(err); // Log or handle errors
        }
    }
}

module.exports = sendEmail;
