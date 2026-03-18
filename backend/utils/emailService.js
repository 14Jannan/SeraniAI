const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // Your Gmail App Password
      },
    });

    // Professional HTML Email Template
    const mailOptions = {
      from: '"Serani AI" <no-reply@seraniai.com>',
      to: email,
      subject: "Your Verification Code - Serani AI",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Welcome to Serani AI</h2>
            <p style="font-size: 16px; color: #555;">Hello,</p>
            <p style="font-size: 16px; color: #555;">Thank you for registering. Please use the following OTP to verify your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; background-color: #EEF2FF; padding: 10px 20px; border-radius: 5px;">
                    ${otp}
                </span>
            </div>

            <p style="font-size: 14px; color: #888; text-align: center;">This code expires in 10 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendVerificationEmail;