import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) { }

  async sendOtpEmail(
    email: string,
    otp: string,
    type: 'register' | 'login' | 'invite' = 'login',
  ) {
    const isRegister = type === 'register';
    const isInvite = type === 'invite';
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:7000';

    let title = 'Security Verification';
    let subTitle = 'Verify your login attempt';
    let mainMessage =
      "To keep your account secure, please enter the verification code below to complete your login. If this wasn't you, please secure your account immediately.";
    let emailSubject = `DentCare360 - ${otp} is your Login verification code`;

    if (isRegister) {
      title = 'Welcome to DentCare360!';
      subTitle = 'Complete your registration';
      mainMessage =
        "We're excited to have you on board! Use the verification code below to complete your registration.";
      emailSubject = `DentCare360 - ${otp} is your Registration verification code`;
    } else if (isInvite) {
      title = 'Clinic Invitation';
      subTitle = 'Join your dental clinic team';
      mainMessage =
        'You have been invited to join the clinic staff. Use the verification code below to accept your invitation and set up your account.';
      emailSubject = `DentCare360 - ${otp} is your Invitation verification code`;
    }

    const accentColor = '#2563eb';

    const otpBoxes = otp
      .split('')
      .map(
        (digit) => `
        <div style="display: inline-block; width: 44px; height: 54px; line-height: 54px; text-align: center; background-color: #ffffff; border: 1px solid #dbeafe; border-radius: 8px; font-size: 30px; font-weight: 700; color: #2563eb; margin: 0 3px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.05); vertical-align: middle;">
          ${digit}
        </div>
      `,
      )
      .join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f4f7f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #092c74 0%, #153c89 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; text-align: center;">
              <img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="100" height="100" alt="DentCare360 Logo" style="display: inline-block; vertical-align: middle; margin-right: 16px; border-radius: 50%;" />
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. <span style="color: #2dd4bf; font-weight: 600;">Better Dentistry.</span></p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #e8f8f0; color: #10b981; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 24px;">
              ✔ Secure Verification
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            <p style="font-size: 18px; color: #64748b; margin: 0 0 16px 0;">${subTitle}</p>

            <div style="margin: 24px 0; text-align: center;">
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to right, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
              <span style="display: inline-block; margin: 0 10px; color: #2563eb; font-size: 18px; vertical-align: middle; font-weight: bold;">🛡️</span>
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to left, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <!-- Code Box -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f5f8ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin: 32px 0; box-sizing: border-box;">
              <tr>
                <td align="center" valign="middle" style="width: 100%;">
                  <div style="font-size: 11px; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 16px; text-transform: uppercase;">YOUR VERIFICATION CODE</div>
                  <div style="margin-bottom: 16px; white-space: nowrap;">
                    ${otpBoxes}
                  </div>
                  <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                    <img src="https://img.icons8.com/ios/100/2563eb/time.png" width="16" height="16" alt="Time" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                    Valid for <b style="color: #ef4444; font-weight: 700;">10 minutes</b> only
                  </div>
                </td>
              </tr>
            </table>

            <!-- Warning Banner -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px 20px; text-align: left; display: table; width: 100%; box-sizing: border-box; margin-top: 24px;">
              <div style="display: table-cell; vertical-align: middle; width: 44px; padding-right: 12px;">
                <div style="background-color: #f59e0b; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px;">
                  <img src="https://img.icons8.com/ios-filled/100/ffffff/shield.png" width="18" height="18" alt="Shield" style="vertical-align: middle; display: inline-block;" />
                </div>
              </div>
              <div style="display: table-cell; vertical-align: middle;">
                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Please do not share this code with anyone.</div>
                <div style="font-size: 13px; color: #64748b; margin: 0;">Our support team will never ask for your verification code.</div>
              </div>
            </div>
            
            <!-- Separator -->
            <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; margin-bottom: 24px;"></div>
            
            <!-- Sign-off -->
            <div style="text-align: center; font-size: 14px; color: #64748b; line-height: 1.5;">
              Thank you,<br>
              <strong style="color: #0f172a; font-weight: 700; display: block; margin-top: 4px;">DentCare360 Team</strong>
              <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 4px;">dentcare360.in</a>
            </div>
          </div>
          
          <!-- Bottom Badges Bar -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; padding: 16px 12px; text-align: center;">
              <tr>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/shield.png" width="14" height="14" alt="Shield" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">100% Secure</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/lock.png" width="14" height="14" alt="Lock" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Trusted & Reliable</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/like.png" width="14" height="14" alt="Heart" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Care You Can Count On</span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is missing. Emails will not be sent.');
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'DentCare360',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'noreply@dentcare360.in',
          },
          to: [{ email: email }],
          subject: emailSubject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `OTP Email sent successfully to ${email}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  async sendInviteEmail(email: string, inviteLink: string) {
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:7000';
    const title = 'Clinic Invitation';
    const subTitle = 'Join your dental clinic team';
    const mainMessage =
      'You have been invited to join the clinic staff. Click the button below to accept your invitation and set up your account.';
    const accentColor = '#2563eb';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f4f7f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #092c74 0%, #153c89 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; text-align: center;">
              <img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="100" height="100" alt="DentCare360 Logo" style="display: inline-block; vertical-align: middle; margin-right: 16px; border-radius: 50%;" />
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. <span style="color: #2dd4bf; font-weight: 600;">Better Dentistry.</span></p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #e8f8f0; color: #10b981; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 24px;">
              ✔ Secure Invitation
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            <p style="font-size: 18px; color: #64748b; margin: 0 0 16px 0;">${subTitle}</p>

            <div style="margin: 24px 0; text-align: center;">
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to right, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
              <span style="display: inline-block; margin: 0 10px; color: #2563eb; font-size: 18px; vertical-align: middle; font-weight: bold;">🛡️</span>
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to left, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <!-- Button Card -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f5f8ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin: 32px 0; box-sizing: border-box;">
              <tr>
                <td align="center" valign="middle" style="width: 100%;">
                  <div style="font-size: 11px; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 16px; text-transform: uppercase;">CLINIC STAFF ACCESS</div>
                  <div style="margin-bottom: 24px;">
                    <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 36px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                      👤 Accept Invitation
                    </a>
                  </div>
                  <div style="border-top: 1px dashed #cbd5e1; margin: 20px 0;"></div>
                  <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">Or copy and paste this URL into your browser:</p>
                  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: left; word-break: break-all;">
                    <a href="${inviteLink}" style="color: #2563eb; font-size: 13px; text-decoration: none;">${inviteLink}</a>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Warning Banner -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px 20px; text-align: left; display: table; width: 100%; box-sizing: border-box; margin-top: 24px;">
              <div style="display: table-cell; vertical-align: middle; width: 44px; padding-right: 12px;">
                <div style="background-color: #f59e0b; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px;">
                  <img src="https://img.icons8.com/ios-filled/100/ffffff/shield.png" width="18" height="18" alt="Shield" style="vertical-align: middle; display: inline-block;" />
                </div>
              </div>
              <div style="display: table-cell; vertical-align: middle;">
                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Please accept the invitation within 24 hours.</div>
                <div style="font-size: 13px; color: #64748b; margin: 0;">If you did not expect this invitation, please contact your administrator.</div>
              </div>
            </div>
            
            <!-- Separator -->
            <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; margin-bottom: 24px;"></div>
            
            <!-- Sign-off -->
            <div style="text-align: center; font-size: 14px; color: #64748b; line-height: 1.5;">
              Thank you,<br>
              <strong style="color: #0f172a; font-weight: 700; display: block; margin-top: 4px;">DentCare360 Team</strong>
              <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 4px;">dentcare360.in</a>
            </div>
          </div>
          
          <!-- Bottom Badges Bar -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; padding: 16px 12px; text-align: center;">
              <tr>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/shield.png" width="14" height="14" alt="Shield" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">100% Secure</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/lock.png" width="14" height="14" alt="Lock" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Trusted & Reliable</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/like.png" width="14" height="14" alt="Heart" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Care You Can Count On</span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is missing. Emails will not be sent.');
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'DentCare360',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'dentcare360.official@gmail.com',
          },
          to: [{ email: email }],
          subject: `DentCare360 - You are invited to join the team`,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `Invite Email sent successfully to ${email}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Invite email to ${email}`, error);
      throw error;
    }
  }

  async sendInternshipConfirmationEmail(email: string, name: string) {
    const title = 'Application Received';
    const subTitle = 'Internship Application';
    const mainMessage = `Dear ${name},<br><br>Thank you for submitting your internship application to Dental Clinic. We have successfully received your details and will review your profile. If your qualifications match our requirements, we will get back to you shortly.<br><br><b>Important Note:</b> For your security, please be aware that your profile will be automatically disabled after 1 month. Should this happen, you can easily reactivate it at any time by returning to the application portal and entering your registered email address.`;
    const accentColor = '#2563eb';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; padding-top: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
        .header { background-color: ${accentColor}; padding: 40px 20px; text-align: center; }
        .logo { color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-decoration: none; }
        .content { padding: 40px; text-align: center; }
        .title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .subtitle { font-size: 16px; font-weight: 500; color: #64748b; margin-bottom: 24px; }
        .message { font-size: 16px; line-height: 24px; color: #475569; margin-bottom: 32px; text-align: left; }
        .footer { padding: 32px 40px; background-color: #f1f5f9; text-align: center; font-size: 14px; color: #64748b; }
        .footer p { margin: 4px 0; }
        .security-badge { display: inline-flex; align-items: center; background-color: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header"><div class="logo">Dental Clinic</div></div>
          <div class="content">
            <div class="security-badge">
              <span style="margin-right: 4px;">✅</span> Application Successful
            </div>
            <div class="title">${title}</div>
            <div class="subtitle">${subTitle}</div>
            <div class="message">${mainMessage}</div>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 32px;">
              Please do not reply to this email.
            </p>
          </div>
          <div class="footer">
            <p><b>Dental Clinic Management System</b></p>
            <p style="margin-top: 24px;">&copy; ${new Date().getFullYear()} Dental Clinic. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is missing. Emails will not be sent.');
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Dental Clinic',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'dentcare360.official@gmail.com',
          },
          to: [{ email: email, name: name }],
          subject: 'Dental Clinic - Internship Application Received',
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `Internship Email sent successfully to ${email}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Internship email to ${email}`, error);
      throw error;
    }
  }

  async sendPricingInquiryEmail(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    submittedAt: Date,
  ) {
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ||
      'dentcare360.official@gmail.com';
    const dateTimeStr = dayjs(submittedAt).format('DD MMMM YYYY, hh:mm A');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Pricing Inquiry</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f4f7f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div style="background: #2563eb; padding: 40px 20px; text-align: center; color: #ffffff;">
            <h2 style="font-size: 26px; font-weight: 800; margin: 0 0 8px 0; color: #ffffff;">New Pricing Inquiry Received</h2>
            <p style="font-size: 15px; color: #bfdbfe; margin: 0; line-height: 1.5;">A user has shown interest in the DentCare360 subscription plans and pricing options from the landing page.</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px;">
            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">User Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 150px; font-size: 14px;">First Name:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${firstName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Last Name:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Email Address:</td>
                <td style="padding: 10px 0; color: #2563eb; font-size: 14px;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Phone Number:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${phone}</td>
              </tr>
            </table>

            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Inquiry Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 150px; font-size: 14px;">Inquiry Type:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">Pricing Inquiry</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Source:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">Landing Page &rarr; Pricing</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Submitted At:</td>
                <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${dateTimeStr}</td>
              </tr>
            </table>

            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Action Required</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0;">Please contact the user to provide information about the available subscription plans and pricing options.</p>
          </div>

          <!-- Footer -->
          <div style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <strong style="color: #0f172a; font-weight: 700; font-size: 15px; display: block;">DentCare360</strong>
            <span style="color: #64748b; font-size: 13px; margin-top: 4px; display: block;">Pricing Inquiry Notification</span>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is missing. Pricing Inquiry email will not be sent.',
      );
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'DentCare360',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'dentcare360.official@gmail.com',
          },
          to: [{ email: adminEmail }],
          subject: 'New Pricing Inquiry – DentCare360',
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Brevo send failed for admin email ${adminEmail}: ${errorText}`,
        );
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `Pricing Inquiry email sent successfully to ${adminEmail}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(
        `Failed to send Pricing Inquiry email to ${adminEmail}`,
        error,
      );
      throw error;
    }
  }

  async sendPlanPurchaseEmail(email: string, planName: string, isFirstTime: boolean = false) {
    const title = isFirstTime ? 'Your First-Time Plan Has Been Assigned' : 'Subscription Confirmed';
    const subTitle = isFirstTime
      ? ''
      : 'Thank you for your purchase';
    const mainMessage = isFirstTime
      ? `Your free plan <strong>${planName}</strong> has been successfully assigned to your account. You can now start using the platform.`
      : `Your subscription to the <strong>${planName}</strong> plan has been successfully activated. We're excited to support your clinic's growth.`;
    const emailSubject = isFirstTime
      ? `DentCare360 - Your First-Time Plan Has Been Assigned`
      : `DentCare360 - Subscription Confirmed: ${planName}`;
    const badgeText = isFirstTime ? '✔ Free Plan Assigned' : '✔ Purchase Successful';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f4f7f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #092c74 0%, #153c89 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; text-align: center;">
              <img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="100" height="100" alt="DentCare360 Logo" style="display: inline-block; vertical-align: middle; margin-right: 16px; border-radius: 50%;" />
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. <span style="color: #2dd4bf; font-weight: 600;">Better Dentistry.</span></p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #e8f8f0; color: #10b981; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 24px;">
              ${badgeText}
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            ${subTitle ? `<p style="font-size: 18px; color: #64748b; margin: 0 0 16px 0;">${subTitle}</p>` : ''}

            <div style="margin: 24px 0; text-align: center;">
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to right, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
              <span style="display: inline-block; margin: 0 10px; color: #2563eb; font-size: 18px; vertical-align: middle; font-weight: bold;">🎉</span>
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to left, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <!-- Code Box Alternative for Purchase -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f5f8ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin: 32px 0; box-sizing: border-box;">
              <tr>
                <td align="center" valign="middle" style="width: 100%;">
                  <div style="font-size: 11px; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 16px; text-transform: uppercase;">ACTIVE PLAN</div>
                  <div style="margin-bottom: 16px; white-space: nowrap;">
                    <div style="display: inline-block; padding: 12px 24px; background-color: #ffffff; border: 1px solid #dbeafe; border-radius: 8px; font-size: 24px; font-weight: 700; color: #2563eb; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.05);">
                      ${planName}
                    </div>
                  </div>
                  <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                    <img src="https://img.icons8.com/ios-filled/100/2563eb/ok.png" width="16" height="16" alt="Check" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                    Your account has been instantly upgraded
                  </div>
                </td>
              </tr>
            </table>

            <!-- Warning Banner Alternative -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; text-align: left; display: table; width: 100%; box-sizing: border-box; margin-top: 24px;">
              <div style="display: table-cell; vertical-align: middle; width: 44px; padding-right: 12px;">
                <div style="background-color: #22c55e; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px;">
                  <img src="https://img.icons8.com/ios-filled/100/ffffff/star.png" width="18" height="18" alt="Star" style="vertical-align: middle; display: inline-block;" />
                </div>
              </div>
              <div style="display: table-cell; vertical-align: middle;">
                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Ready to go!</div>
                <div style="font-size: 13px; color: #64748b; margin: 0;">You can now access all the features included in your plan.</div>
              </div>
            </div>
            
            <!-- Separator -->
            <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; margin-bottom: 24px;"></div>
            
            <!-- Sign-off -->
            <div style="text-align: center; font-size: 14px; color: #64748b; line-height: 1.5;">
              Thank you,<br>
              <strong style="color: #0f172a; font-weight: 700; display: block; margin-top: 4px;">DentCare360 Team</strong>
              <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 4px;">dentcare360.in</a>
            </div>
          </div>
          
          <!-- Bottom Badges Bar -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; padding: 16px 12px; text-align: center;">
              <tr>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/shield.png" width="14" height="14" alt="Shield" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">100% Secure</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/lock.png" width="14" height="14" alt="Lock" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Trusted & Reliable</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/like.png" width="14" height="14" alt="Heart" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Care You Can Count On</span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is missing. Emails will not be sent.');
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'DentCare360',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'dentcare360.official@gmail.com',
          },
          to: [{ email: email }],
          subject: emailSubject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `Plan Purchase Email sent successfully to ${email}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Plan Purchase email to ${email}`, error);
      throw error;
    }
  }

  async sendPlanExpiryReminderEmail(email: string, planName: string, daysLeft: number, expiryDate: Date) {
    const title = 'Action Required: Plan Expiring Soon';
    const subTitle = `Your ${planName} plan will expire in ${daysLeft} days.`;
    const formattedDate = new Date(expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const mainMessage = `We hope you are enjoying DentCare360! This is a reminder that your <strong>${planName}</strong> plan is scheduled to expire on <strong>${formattedDate}</strong>. To avoid any interruption in service, please renew your subscription or upgrade to a new plan.`;
    const emailSubject = `Action Required: Your DentCare360 Plan Expires in ${daysLeft} Days`;
    const badgeText = '⚠️ Expiring Soon';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f4f7f6; padding: 40px 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #092c74 0%, #153c89 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; text-align: center;">
              <img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="100" height="100" alt="DentCare360 Logo" style="display: inline-block; vertical-align: middle; margin-right: 16px; border-radius: 50%;" />
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. <span style="color: #2dd4bf; font-weight: 600;">Better Dentistry.</span></p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #fffbeb; color: #d97706; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 24px;">
              ${badgeText}
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            <p style="font-size: 18px; color: #64748b; margin: 0 0 16px 0;">${subTitle}</p>

            <div style="margin: 24px 0; text-align: center;">
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to right, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
              <span style="display: inline-block; margin: 0 10px; color: #2563eb; font-size: 18px; vertical-align: middle; font-weight: bold;">⏳</span>
              <span style="display: inline-block; width: 50px; height: 2px; background: linear-gradient(to left, rgba(37,99,235,0), rgba(37,99,235,1)); vertical-align: middle;"></span>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <!-- Code Box Alternative for Expiry -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f5f8ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 24px; margin: 32px 0; box-sizing: border-box;">
              <tr>
                <td align="center" valign="middle" style="width: 100%;">
                  <div style="font-size: 11px; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 16px; text-transform: uppercase;">PLAN DETAILS</div>
                  <div style="margin-bottom: 16px; white-space: nowrap;">
                    <div style="display: inline-block; padding: 12px 24px; background-color: #ffffff; border: 1px solid #dbeafe; border-radius: 8px; font-size: 20px; font-weight: 700; color: #2563eb; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.05);">
                      ${planName}
                    </div>
                  </div>
                  <div style="font-size: 13px; color: #ef4444; font-weight: 700;">
                    <img src="https://img.icons8.com/ios-filled/100/ef4444/time.png" width="16" height="16" alt="Time" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                    Expires on ${formattedDate}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Warning Banner -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px 20px; text-align: left; display: table; width: 100%; box-sizing: border-box; margin-top: 24px;">
              <div style="display: table-cell; vertical-align: middle; width: 44px; padding-right: 12px;">
                <div style="background-color: #f59e0b; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px;">
                  <img src="https://img.icons8.com/ios-filled/100/ffffff/shield.png" width="18" height="18" alt="Shield" style="vertical-align: middle; display: inline-block;" />
                </div>
              </div>
              <div style="display: table-cell; vertical-align: middle;">
                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Don't lose your access!</div>
                <div style="font-size: 13px; color: #64748b; margin: 0;">Log into your dashboard and renew your plan to ensure uninterrupted service.</div>
              </div>
            </div>
            
            <!-- Separator -->
            <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; margin-bottom: 24px;"></div>
            
            <!-- Sign-off -->
            <div style="text-align: center; font-size: 14px; color: #64748b; line-height: 1.5;">
              Thank you,<br>
              <strong style="color: #0f172a; font-weight: 700; display: block; margin-top: 4px;">DentCare360 Team</strong>
              <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 4px;">dentcare360.in</a>
            </div>
          </div>
          
          <!-- Bottom Badges Bar -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; padding: 16px 12px; text-align: center;">
              <tr>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/shield.png" width="14" height="14" alt="Shield" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">100% Secure</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500; border-right: 1px solid #e2e8f0;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/lock.png" width="14" height="14" alt="Lock" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Trusted & Reliable</span>
                </td>
                <td align="center" style="width: 33%; font-size: 12px; color: #475569; font-weight: 500;">
                  <img src="https://img.icons8.com/ios-filled/100/2563eb/like.png" width="14" height="14" alt="Heart" style="vertical-align: middle; display: inline-block; margin-right: 6px;" />
                  <span style="vertical-align: middle;">Care You Can Count On</span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is missing. Emails will not be sent.');
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'DentCare360',
            email:
              this.configService.get<string>('MAIL_FROM') ||
              'dentcare360.official@gmail.com',
          },
          to: [{ email: email }],
          subject: emailSubject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(
        `Plan Expiry Reminder Email sent successfully to ${email}. MessageID: ${data.messageId}`,
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Plan Expiry Reminder email to ${email}`, error);
      throw error;
    }
  }
}
