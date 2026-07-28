import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

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
          <div style="background: #2563eb; padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; text-align: center;">
              <div style="display: inline-block; vertical-align: middle; margin-right: 16px; background-color: #ffffff; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px;"><img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="64" height="64" alt="DentCare360 Logo" style="display: block; border-radius: 50%;" /></div>
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. Better Dentistry.</p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
              🔒 Secure Verification
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            <p style="font-size: 18px; color: #64748b; margin: 0 0 32px 0;">${subTitle}</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #93c5fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; display: inline-block; min-width: 240px;">
              <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #2563eb; font-family: 'Courier New', Courier, monospace; margin-left: 12px;">${otp}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 12px;">Valid for <b style="color: #ef4444;">10 minutes</b> only</div>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8; max-width: 400px; margin: 0 auto;">
              Please do not share this code with anyone. Our support team will never ask for your verification code.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <div style="display: inline-block; text-align: left;">
              <div style="display: inline-block; vertical-align: middle; margin-right: 16px; font-size: 32px;"><img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="32" height="32" alt="DentCare360 Logo" style="display: block; border-radius: 50%;" /></div>
              <div style="display: inline-block; vertical-align: middle; color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">
                Thank you,<br>
                <strong style="color: #0f172a; font-weight: 600; display: block;">DentCare360 Team</strong>
                <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600;">dentcare360.in</a>
              </div>
            </div>
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
      <title>Clinic Invitation</title>
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
            <div style="display: inline-block; text-align: center;">
              <div style="display: inline-block; vertical-align: middle; margin-right: 16px; background-color: #ffffff; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px;"><img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="64" height="64" alt="DentCare360 Logo" style="display: block; border-radius: 50%;" /></div>
              <div style="display: inline-block; vertical-align: middle; text-align: left;">
                <h1 style="font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; color: #ffffff;">DentCare360</h1>
                <p style="font-size: 14px; color: #bfdbfe; margin: 4px 0 0 0;">Smart Care. Better Dentistry.</p>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; text-align: center;">
            <div style="display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
              🔒 Secure Invitation
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
            <p style="font-size: 18px; color: #64748b; margin: 0 0 32px 0;">${subTitle}</p>
            
            <div style="margin: 32px 0; text-align: center;">
              <span style="display: inline-block; width: 80px; border-top: 1px solid #e2e8f0; vertical-align: middle;"></span>
              <span style="display: inline-block; background-color: #eff6ff; color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 4px solid #ffffff; line-height: 32px; text-align: center; vertical-align: middle; font-size: 18px; font-weight: bold; margin: 0 12px;">+</span>
              <span style="display: inline-block; width: 80px; border-top: 1px solid #e2e8f0; vertical-align: middle;"></span>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 auto 32px auto; max-width: 480px;">${mainMessage}</p>
            
            <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 36px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
              👤 Accept Invitation
            </a>
            
            <div style="border-top: 1px dashed #cbd5e1; margin: 40px 0;"></div>

            <p style="font-size: 14px; color: #64748b; margin: 0 0 12px 0;">Or copy and paste this URL into your browser:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: left; word-break: break-all;">
              <a href="${inviteLink}" style="color: #2563eb; font-size: 13px; text-decoration: none;">${inviteLink}</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
            <div style="display: inline-block; text-align: left;">
              <div style="display: inline-block; vertical-align: middle; margin-right: 16px; font-size: 32px;"><img src="https://res.cloudinary.com/dve9etzft/image/upload/v1784205052/dentcare360_logo.png" width="32" height="32" alt="DentCare360 Logo" style="display: block; border-radius: 50%;" /></div>
              <div style="display: inline-block; vertical-align: middle; color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">
                Thank you,<br>
                <strong style="color: #0f172a; font-weight: 600; display: block;">DentCare360 Team</strong>
                <a href="https://dentcare360.in" style="color: #2563eb; text-decoration: none; font-weight: 600;">dentcare360.in</a>
              </div>
            </div>
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
              'noreply@dentalclinic.com',
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
}
