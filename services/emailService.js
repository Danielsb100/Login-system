const nodemailer = require('nodemailer');

const isHotmail = process.env.EMAIL_USER.includes('hotmail') || process.env.EMAIL_USER.includes('outlook');

const transporter = nodemailer.createTransport({
    service: isHotmail ? 'hotmail' : 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
                rejectUnauthorized: false
            }
});

/**
 * Envia um e-mail com o código de verificação
 */
const sendVerificationEmail = async (to, username, code) => {
    try {
        const mailOptions = {
            from: `"Support Team" <${process.env.EMAIL_USER}>`,
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

module.exports = {
    sendVerificationEmail
};
