import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface InviteData {
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'FlipFlop <noreply@flipflop.ai>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent: ${info.messageId}`);
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendTeamInvitation(email: string, inviteData: InviteData): Promise<void> {
    const html = this.generateInviteHTML(inviteData);
    const text = this.generateInviteText(inviteData);

    await this.sendEmail({
      to: email,
      subject: `You're invited to join ${inviteData.teamName} on FlipFlop`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, teamName: string): Promise<void> {
    const html = this.generateWelcomeHTML(teamName);
    
    await this.sendEmail({
      to: email,
      subject: `Welcome to ${teamName} on FlipFlop!`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const html = this.generatePasswordResetHTML(resetUrl);
    
    await this.sendEmail({
      to: email,
      subject: 'Reset your FlipFlop password',
      html,
    });
  }

  private generateInviteHTML(data: InviteData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #6366F1; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FlipFlop</div>
        </div>
        
        <div class="content">
            <h2>You're invited to join ${data.teamName}!</h2>
            
            <p>Hi there,</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.teamName}</strong> on FlipFlop.</p>
            
            <p>FlipFlop helps teams capture, organize, and recall important decisions, discussions, and action items from meetings and conversations.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
            </p>
            
            <p><small>This invitation will expire in 7 days. If you can't click the button above, copy and paste this URL into your browser: ${data.inviteUrl}</small></p>
        </div>
        
        <div class="footer">
            <p>This email was sent by FlipFlop. If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateInviteText(data: InviteData): string {
    return `
You're invited to join ${data.teamName}!

${data.inviterName} has invited you to join ${data.teamName} on FlipFlop.

FlipFlop helps teams capture, organize, and recall important decisions, discussions, and action items from meetings and conversations.

Accept your invitation: ${data.inviteUrl}

This invitation will expire in 7 days.

---
FlipFlop Team
    `;
  }

  private generateWelcomeHTML(teamName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FlipFlop</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #6366F1; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FlipFlop</div>
        </div>
        
        <div class="content">
            <h2>Welcome to ${teamName}!</h2>
            
            <p>You've successfully joined ${teamName} on FlipFlop. Here's what you can do now:</p>
            
            <ul>
                <li><strong>Install the browser extension</strong> to capture web content and meeting notes</li>
                <li><strong>Connect integrations</strong> like Slack, Notion, and Google to sync your existing data</li>
                <li><strong>Ask questions</strong> to quickly find relevant information from your team's knowledge base</li>
            </ul>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}" class="button">Get Started</a>
            </p>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at support@flipflop.ai</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generatePasswordResetHTML(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #6366F1; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">FlipFlop</div>
        </div>
        
        <div class="content">
            <h2>Reset Your Password</h2>
            
            <p>We received a request to reset your FlipFlop password.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            
            <p><small>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</small></p>
        </div>
        
        <div class="footer">
            <p>FlipFlop Security Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Export function for use in queue
export async function sendEmail(options: EmailOptions): Promise<void> {
  const emailService = new EmailService();
  return emailService.sendEmail(options);
}

// Export singleton instance
export const emailService = new EmailService();