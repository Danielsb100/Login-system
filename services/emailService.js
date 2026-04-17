const nodemailer = require('nodemailer');
const env = require('../config/env');

const isHotmail =
    env.mail.user.includes('hotmail') || env.mail.user.includes('outlook');

const transporter = env.mail.enabled
    ? nodemailer.createTransport({
        service: isHotmail ? 'hotmail' : 'gmail',
        auth: {
            user: env.mail.user,
            pass: env.mail.pass
        },
        tls: {
            rejectUnauthorized: false
        }
    })
    : null;

/**
 * Envia um e-mail com o código de verificação
 */
const sendVerificationEmail = async (to, username, code) => {
    try {
        if (!transporter) {
            console.warn(`[mail] Verification email skipped for ${to}. EMAIL_USER/EMAIL_PASS are not configured.`);
            return false;
        }

        const mailOptions = {
            from: `"${env.mail.fromName}" <${env.mail.user}>`,
            to: to,
            subject: 'Verify Your Account - Action Required',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Welcome, ${username}!</h1>
                    </div>
                    <div style="padding: 30px; color: #333; line-height: 1.6;">
                        <p style="margin-top: 0;">Thanks for signing up! Use the code below to verify your account and start exploring the world.</p>
                        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${code}</span>
                        </div>
                        <p>This code will expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center;">© 2026 Your 3D System. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('--- ERROR SENDING EMAIL ---');
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Response:', error.response);
        console.error('Full Error:', error.message);
        return false;
    }
};

const sendPasswordResetEmail = async (to, username, resetUrl) => {
    try {
        if (!transporter) {
            console.warn(`[mail] Password reset email skipped for ${to}. EMAIL_USER/EMAIL_PASS are not configured.`);
            return false;
        }

        const mailOptions = {
            from: `"${env.mail.fromName}" <${env.mail.user}>`,
            to,
            subject: 'Reset Your Password',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #111827; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Password reset requested</h1>
                    </div>
                    <div style="padding: 30px; color: #333; line-height: 1.6;">
                        <p style="margin-top: 0;">Hello, ${username}. We received a request to reset your password.</p>
                        <p>Click the button below to choose a new password. This link expires soon for your security.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-weight: 600;">
                                Reset password
                            </a>
                        </div>
                        <p style="word-break: break-all; font-size: 13px; color: #6b7280;">If the button does not work, open this URL manually: ${resetUrl}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center;">If you did not request this, you can ignore this email.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('--- ERROR SENDING PASSWORD RESET EMAIL ---');
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Response:', error.response);
        console.error('Full Error:', error.message);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
