import nodemailer from 'nodemailer';

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false, // true only for 465
      auth: {
        user: process.env.GOOGLE_EMAIL_USER,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.log(error);
  }
};


export const sendOtp = async (to: string, otp: string) => {
  const subject = 'Verify Your Email';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">Email Verification</h2>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-bottom:20px; color:#555; font-size:15px;">
                Use the OTP below to verify your email address.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px 0;">
                <div style="
                  display:inline-block;
                  padding:18px 32px;
                  font-size:28px;
                  font-weight:bold;
                  letter-spacing:8px;
                  background:#f0f4ff;
                  border-radius:10px;
                  color:#3b5bdb;
                ">
                  ${otp}
                </div>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:10px; color:#777; font-size:14px;">
                This code will expire in <strong>5 minutes</strong>.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:30px; font-size:13px; color:#999;">
                If you did not request this email, you can safely ignore it.
              </td>
            </tr>

          </table>

          <table width="500" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-top:20px; font-size:12px; color:#aaa;">
                © ${new Date().getFullYear()} Your App Name. All rights reserved.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await sendEmail({
    to,
    subject,
    html,
  });
};

export const sendResetPasswordEmail = async (to: string, resetUrl: string) => {
  const subject = 'Reset Your Password';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#333;">Reset Your Password</h2>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-bottom:20px; color:#555; font-size:15px;">
                We received a request to reset your password. Click the button below to set a new password.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px 0;">
                <a href="${resetUrl}" style="
                  display:inline-block;
                  padding:16px 32px;
                  font-size:16px;
                  font-weight:bold;
                  background:#3b5bdb;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:10px;
                ">
                  Reset Password
                </a>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:10px; color:#777; font-size:14px;">
                This link will expire in <strong>15 minutes</strong>.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:20px; color:#777; font-size:13px;">
                If the button doesn’t work, copy and paste this link into your browser:
                <br/>
                <span style="color:#3b5bdb; word-break:break-all;">
                  ${resetUrl}
                </span>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:30px; font-size:13px; color:#999;">
                If you did not request a password reset, you can safely ignore this email.
              </td>
            </tr>

          </table>

          <table width="500" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-top:20px; font-size:12px; color:#aaa;">
                © ${new Date().getFullYear()} Your App Name. All rights reserved.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await sendEmail({
    to,
    subject,
    html,
  });
};
