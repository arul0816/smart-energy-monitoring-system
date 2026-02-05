require('dotenv').config({ path: '../.env' });
const emailService = require('./emailService');

const testEmail = async () => {
    const targetEmail = process.argv[2];

    if (!targetEmail) {
        console.log("Usage: node test-email.js <your-email>");
        process.exit(1);
    }

    console.log(`📧 Attempting to send test email to ${targetEmail}...`);
    console.log(`   User: ${process.env.EMAIL_USER}`);

    try {
        await emailService.sendEmail(
            targetEmail,
            "Test Email from Smart Energy System",
            "<h1>It Works!</h1><p>Your email service is configured correctly.</p>"
        );
        console.log("✅ Success! Check your inbox.");
    } catch (error) {
        console.error("❌ Failed:", error.message);
    }
};

testEmail();
