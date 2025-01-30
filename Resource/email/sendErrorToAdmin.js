// Import necessary modules
const nodemailer = require("nodemailer"); // Module to send emails

// Import user data (list of users to send emails to)
const adminUser = require("../auth/admin");
const formatDate = require("../function/timeFormat");

// Configure the email transporter using Gmail service
const transporter = nodemailer.createTransport({
  service: "gmail", // Using Gmail as the email service
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send an error notification email to system admins
async function sendErrorSystemAdmin(error) {
  const errorDetails = {
    message: error.message || "An unknown error occurred.", // Error message
    name: error.name || "UnknownError", // Error type (e.g., TypeError, ReferenceError)
    stack: error.stack || "No stack trace available.", // Stack trace to help trace the source of the error
    code: error.code || "No error code", // Many errors have a code (e.g., DB_ERROR)
    cause: error.cause || "No cause provided", // Further cause if available
    timestamp: formatDate(), // Timestamp of when the error occurred
    additionalInfo: error.additionalInfo || "No additional information", // Additional information if any
  };

  // Iterate through each user to send the error notification
  for (const user of adminUser) {
    // Define the path to the log file associated with the IPTV error (if any)

    // Configure the email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email, // Recipient's email (from user data)
      subject: "System Error Notification", // Email subject
      text: `
Dear ${user.middleName} ${user.lastName},

An error has occurred in the system. Below are the details of the error:

Error Message: ${errorDetails.message}
Error Type: ${errorDetails.name} 
Timestamp: ${errorDetails.timestamp} 
Stack Trace: ${errorDetails.stack} 
Cause: ${errorDetails.cause} 
Additional Information: ${errorDetails.additionalInfo} 

Please review the error and take appropriate action.

Best regards,
            `, // Email body with personalized error information
    };

    try {
      // Send the email with the defined options
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.response); // Log success response if email is sent
    } catch (err) {
      console.error("Failed to send email to:", user.email, "Error:", err); // Log error if sending fails
    }
  }
}
// Export the sendErrorSystemAdmin function so it can be used in other modules
module.exports = sendErrorSystemAdmin;
