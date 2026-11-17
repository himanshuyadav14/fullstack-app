const nodemailer = require("nodemailer");

// Gmail Official SMTP Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // himyadav.yh@gmail.com
    pass: process.env.EMAIL_PASS, // 16-digit Google App Password
  },
});

/**
 * Sends a styled invitation email directly from your Gmail
 */
const sendInvitationEmail = async ({
  to,
  inviterName,
  organizationName,
  roleName,
  invitationToken,
}) => {
  try {
    const acceptUrl = `${process.env.CLIENT_URL}/${invitationToken}/accept`;

    const mailOptions = {
      from: `"OrbitHQ" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `${inviterName} has invited you to join ${organizationName} on OrbitHQ`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">You're Invited to OrbitHQ!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            Hello, <br /><br />
            <strong>${inviterName}</strong> has invited you to join the <strong>${organizationName}</strong> workspace as a <strong>${roleName}</strong>.
          </p>
          <div style="margin: 28px 0;">
            <a href="${acceptUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            Or copy and paste this link in your browser: <br />
            <a href="${acceptUrl}" style="color: #4f46e5; word-break: break-all;">${acceptUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            This invitation link will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      "📨 Email sent successfully from himyadav.yh@gmail.com:",
      info.messageId,
    );

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Gmail Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends an email verification link
 */
const sendVerificationEmail = async ({ to, name, verificationToken }) => {
  try {
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"OrbitHQ" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Verify your email for OrbitHQ`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Welcome to OrbitHQ, ${name}!</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            Please verify your email address to activate your account and access workspace invitations.
          </p>
          <div style="margin: 28px 0;">
            <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            Verification Token: <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${verificationToken}</code>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Verification email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Gmail Verification Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a password reset link
 */
const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"OrbitHQ" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Reset your OrbitHQ Password`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">
            Hello ${name || "there"},<br /><br />
            We received a request to reset the password for your OrbitHQ account. Click the button below to choose a new password:
          </p>
          <div style="margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            Or copy and paste this link in your browser:<br />
            <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            Reset Token: <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${resetToken}</code>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Password reset email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Gmail Password Reset Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a 6-digit email verification OTP
 */
const sendVerificationOtpEmail = async ({ to, name, otp }) => {
  try {
    const mailOptions = {
      from: `"OrbitHQ" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `${otp} is your OrbitHQ verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🪐</div>
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Confirm Your Email</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Welcome to OrbitHQ, ${name || "there"}!</p>
          </div>
          
          <p style="color: #334155; font-size: 14px; line-height: 1.6; text-align: center;">
            Please use the 6-digit verification code below to complete your registration and activate your account:
          </p>
          
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb; font-family: monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            This code will expire in <strong>10 minutes</strong>. If you did not create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Verification OTP email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Gmail OTP Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendInvitationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationOtpEmail,
};
