import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export const sendPasswordResetEmail = async (email: string, token: string, firstName: string) => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"RSMS" <${config.smtp.from}>`,
      to: email,
      subject: 'Password Reset Request - RSMS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>You requested a password reset for your RSMS account.</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Reset Password
          </a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>RSMS Team</p>
        </div>
      `,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
  }
};

export const sendSurveyInvitation = async (email: string, surveyTitle: string, surveyUrl: string, participantToken: string) => {
  try {
    await transporter.sendMail({
      from: `"RSMS" <${config.smtp.from}>`,
      to: email,
      subject: `You're invited to participate in: ${surveyTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Survey Invitation</h2>
          <p>You have been invited to participate in the following research survey:</p>
          <h3>${surveyTitle}</h3>
          <p>Your unique participation link:</p>
          <a href="${surveyUrl}?token=${participantToken}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Start Survey
          </a>
          <p>You can return to this link at any time to continue where you left off.</p>
          <p>Best regards,<br>RSMS Research Team</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Failed to send survey invitation:', error);
  }
};
