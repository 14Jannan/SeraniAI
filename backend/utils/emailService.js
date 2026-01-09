const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, token) => {
    // Configure your email service (Gmail example)
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER, // Set this in your .env
            pass: process.env.EMAIL_PASS, // Set this in your .env
        },
    });

    const url = `http://localhost:7001/api/auth/verify/${token}`;

    await transporter.sendMail({
        from: '"Serani AI" <no-reply@seraniai.com>',
        to: email,
        subject: "Verify your Email",
        html: `
            <h3>Verify your account</h3>
            <p>Click the link below to verify your email:</p>
            <a href="${url}">Verify Email</a>
        `,
    });
};

module.exports = sendVerificationEmail;