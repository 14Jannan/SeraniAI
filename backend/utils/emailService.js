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

const sendEnterpriseInviteEmail = async ({
  toEmail,
  inviterName,
  enterpriseName,
  inviteUrl,
  expiresAt,
}) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const expiryText = new Date(expiresAt).toLocaleString();

    const mailOptions = {
      from: '"Serani AI" <no-reply@seraniai.com>',
      to: toEmail,
      subject: "You're invited to join an enterprise on Serani AI",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #111827; margin-top: 0;">Enterprise Invitation</h2>
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          <p style="font-size: 16px; color: #374151;">
            <strong>${inviterName}</strong> invited you to join <strong>${enterpriseName}</strong> on Serani AI.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${inviteUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            This invitation expires on <strong>${expiryText}</strong>.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            If you were not expecting this invitation, you can ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending enterprise invite email:", error);
    throw new Error("Enterprise invite email could not be sent");
  }
};

module.exports = sendVerificationEmail;
module.exports.sendEnterpriseInviteEmail = sendEnterpriseInviteEmail;