import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendOtpEmail(email: string, otp: string, type: 'register' | 'login' | 'invite' = 'login') {
    const isRegister = type === 'register';
    const isInvite = type === 'invite';
    
    let title = 'Security Verification';
    let subTitle = 'Verify your login attempt';
    let mainMessage = "To keep your account secure, please enter the verification code below to complete your login. If this wasn't you, please secure your account immediately.";
    let emailSubject = `Dental Clinic - ${otp} is your Login verification code`;
    
    if (isRegister) {
      title = 'Welcome to Dental Clinic!';
      subTitle = 'Complete your registration';
      mainMessage = "We're excited to have you on board! Use the verification code below to complete your registration.";
      emailSubject = `Dental Clinic - ${otp} is your Registration verification code`;
    } else if (isInvite) {
      title = 'Clinic Invitation';
      subTitle = 'Join your dental clinic team';
      mainMessage = "You have been invited to join the clinic staff. Use the verification code below to accept your invitation and set up your account.";
      emailSubject = `Dental Clinic - ${otp} is your Invitation verification code`;
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
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; padding-top: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
        .header { background-color: ${accentColor}; padding: 40px 20px; text-align: center; }
        .logo { color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-decoration: none; }
        .content { padding: 40px; text-align: center; }
        .title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .subtitle { font-size: 16px; font-weight: 500; color: #64748b; margin-bottom: 24px; }
        .message { font-size: 16px; line-height: 24px; color: #475569; margin-bottom: 32px; }
        .otp-box { background-color: #f1f5f9; border: 2px dashed ${accentColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px; display: inline-block; min-width: 240px; }
        .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 10px; color: ${accentColor}; font-family: 'Courier New', Courier, monospace; }
        .expiry { font-size: 14px; color: #94a3b8; margin-top: 8px; }
        .expiry b { color: #ef4444; }
        .footer { padding: 32px 40px; background-color: #f1f5f9; text-align: center; font-size: 14px; color: #64748b; }
        .footer p { margin: 4px 0; }
        .security-badge { display: inline-flex; align-items: center; background-color: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
        @media only screen and (max-width: 600px) { .content { padding: 30px 20px; } .otp-code { font-size: 32px; letter-spacing: 6px; } }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">Dental Clinic</div>
          </div>
          <div class="content">
            <div class="security-badge">
              <span style="margin-right: 4px;">🛡️</span> Secure Verification
            </div>
            <div class="title">${title}</div>
            <div class="subtitle">${subTitle}</div>
            <div class="message">${mainMessage}</div>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Valid for <b>10 minutes</b> only</div>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8;">
              Please do not share this code with anyone. Our support team will never ask for your verification code.
            </p>
          </div>
          <div class="footer">
            <p><b>Dental Clinic Management System</b></p>
            <p>Your premier clinic management solution.</p>
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
          'accept': 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { 
            name: 'Dental Clinic', 
            email: this.configService.get<string>('MAIL_FROM') || 'noreply@dentalclinic.com' 
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
      this.logger.log(`OTP Email sent successfully to ${email}. MessageID: ${data.messageId}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  async sendInviteEmail(email: string, inviteLink: string) {
    const title = 'Clinic Invitation';
    const subTitle = 'Join your dental clinic team';
    const mainMessage = "You have been invited to join the clinic staff. Click the button below to accept your invitation and set up your account.";
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
        .message { font-size: 16px; line-height: 24px; color: #475569; margin-bottom: 32px; }
        .btn-primary { display: inline-block; background-color: ${accentColor}; color: #ffffff !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4); transition: background-color 0.2s; }
        .expiry { font-size: 14px; color: #94a3b8; margin-top: 8px; }
        .expiry b { color: #ef4444; }
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
              <span style="margin-right: 4px;">🔒</span> Secure Invitation
            </div>
            <div class="title">${title}</div>
            <div class="subtitle">${subTitle}</div>
            <div class="message">${mainMessage}</div>
            <a href="${inviteLink}" class="btn-primary">Accept Invitation</a>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 32px;">
              Or copy and paste this URL into your browser:<br>
              <a href="${inviteLink}" style="color: ${accentColor}; word-break: break-all; margin-top: 8px; display: inline-block; text-decoration: none;">${inviteLink}</a>
            </p>
          </div>
          <div class="footer">
            <p><b>Dental Clinic Management System</b></p>
            <p>Your premier clinic management solution.</p>
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
          'accept': 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { 
            name: 'Dental Clinic', 
            email: this.configService.get<string>('MAIL_FROM') || 'noreply@dentalclinic.com' 
          },
          to: [{ email: email }],
          subject: `Dental Clinic - You are invited to join the team`,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo send failed for ${email}: ${errorText}`);
        throw new Error(errorText);
      }

      const data = await response.json();
      this.logger.log(`Invite Email sent successfully to ${email}. MessageID: ${data.messageId}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Invite email to ${email}`, error);
      throw error;
    }
  }

  async sendInternshipConfirmationEmail(email: string, name: string) {
    const title = 'Application Received';
    const subTitle = 'Internship Application';
    const mainMessage = `Dear ${name},<br><br>Thank you for submitting your internship application to Dental Clinic. We have successfully received your details and will review your profile. If your qualifications match our requirements, we will get back to you shortly.`;
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
          'accept': 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { 
            name: 'Dental Clinic', 
            email: this.configService.get<string>('MAIL_FROM') || 'noreply@dentalclinic.com' 
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
      this.logger.log(`Internship Email sent successfully to ${email}. MessageID: ${data.messageId}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send Internship email to ${email}`, error);
      throw error;
    }
  }
}
