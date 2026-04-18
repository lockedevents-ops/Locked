/**
 * Transactional Email Service
 * Handles sending confirmation emails for registrations, ticket purchases, and merchant orders.
 */

// Configure SMTP transport using Gmail (lazily initialized)
let transporter: any = null;

async function getTransporter() {
  if (typeof window !== 'undefined') return null; // Prevent execution on client

  if (!transporter) {
    // Dynamically require nodemailer only on the server
    const nodemailer = require('nodemailer');
    
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.error('[EmailService] SMTP credentials missing');
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Connection pooling for faster email sending
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Keep connection alive to avoid reconnection delays
      socketTimeout: 60000,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
    });

    // Verify connection on first use
    transporter.verify().catch((err: Error) => {
      console.error('[EmailService] SMTP connection failed:', err.message);
    });
  }
  return transporter;
}

function getBaseUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 
              (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return url.replace(/\/$/, '');
}

interface BaseEmailData {
  to: string;
  subject: string;
}

interface TransactionalEmailData extends BaseEmailData {
  type: 'transactional';
  templateData: {
    customerName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventVenue: string;
    eventImage?: string;
    ticketDetails: string;
    orderTotal?: string;
    viewTicketsUrl: string;
  };
}

interface AuthEmailData extends BaseEmailData {
  type: 'auth';
  templateType: 'invite' | 'admin_invite' | 'admin_welcome' | 'reset_password' | 'magic_link' | 'confirm_signup' | 'security_alert' | 'email_change' | 'reauthenticate' | 'mfa_code' | 'password_updated' | 'cart_reminder' | 'event_reminder' | 'event_update' | 'welcome' | 'role_request_submitted' | 'role_request_approved' | 'role_request_rejected' | 'role_request_revoked';
  templateData: {
    customerName?: string;
    actionUrl?: string;
    supportEmail?: string;
    browser?: string;
    os?: string;
    time?: string;
    ip?: string;
    code?: string;
    eventTitle?: string;
    eventVenue?: string;
    eventTime?: string;
    roleLabel?: string;
    note?: string;
  };
}

type EmailData = TransactionalEmailData | AuthEmailData;

export const emailService = {
  /**
   * Generates the premium HTML template for event confirmations
   */
  generateTemplate(data: TransactionalEmailData['templateData']) {
    const {
      customerName,
      eventTitle,
      eventDate,
      eventTime,
      eventVenue,
      eventImage,
      ticketDetails,
      viewTicketsUrl
    } = data;

    const brandColor = '#000000'; 

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${eventTitle} - Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; color: #1f2937;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Banner Image -->
            <tr>
              <td style="padding: 20px 20px 0;">
                ${eventImage ? `
                  <img src="${eventImage}" alt="${eventTitle}" style="width: 100%; height: 250px; object-fit: cover; display: block; border-radius: 12px;">
                ` : `
                  <div style="width: 100%; height: 150px; background: linear-gradient(135deg, #000000 0%, #1f2937 100%); border-radius: 12px;"></div>
                `}
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 30px;">
                <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 800; color: #111827;">${eventTitle}</h1>
                
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #374151;">Hello ${customerName},</h2>
                <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                  Your registration for <strong>${eventTitle}</strong> has been confirmed. Get ready for an incredible experience!
                </p>

                <!-- Event Details Card -->
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom: 12px;">
                        <span style="display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Time & Date</span>
                        <strong style="font-size: 15px; color: #111827;">${eventDate} at ${eventTime}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 12px;">
                        <span style="display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Location</span>
                        <strong style="font-size: 15px; color: #111827;">${eventVenue}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span style="display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Tickets</span>
                        <strong style="font-size: 15px; color: #111827;">${ticketDetails}</strong>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Action Button -->
                <div style="text-align: left;">
                  <a href="${viewTicketsUrl}" style="display: block; background-color: ${brandColor}; color: #ffffff; padding: 18px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; text-align: center;">
                    View My Ticket
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: left;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                  Questions? We're here to help. Contact us at <a href="mailto:lockedeventsgh@gmail.com" style="color: #10b981; text-decoration: none;">lockedeventsgh@gmail.com</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  &copy; ${new Date().getFullYear()} Locked Events. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  /**
   * Generates templates for Auth flows (Invite, Reset, etc.)
   */
  generateAuthTemplate(type: AuthEmailData['templateType'], data: AuthEmailData['templateData']) {
    let { actionUrl = '', customerName = 'there', browser, os, time, ip } = data;
    const brandColor = '#000000';
    const logoUrl = `${getBaseUrl()}/logo.png`;
    
    let title = '';
    let message = '';
    let buttonText = '';
    
    switch (type) {
      case 'invite':
        title = 'You\'re invited to Locked Events';
        message = 'You have been invited to join Locked Events. Click the button below to set up your account and get started.';
        buttonText = 'Accept Invitation';
        break;
      case 'admin_invite':
        title = 'You\'re invited to be an Admin';
        message = `You have been invited to join the Locked Events team as an <strong>Administrator</strong>. Please click the button below to set up your secure admin account.`;
        buttonText = 'Set Up Admin Account';
        break;
      case 'admin_welcome':
        title = 'Welcome to the Admin Team';
        message = `An administrator account has been created for you at Locked Events. If you are unaware of this action, please contact support immediately. Otherwise, you can log in using your credentials.`;
        buttonText = 'Contact Support';
        actionUrl = 'mailto:lockedeventsgh@gmail.com';
        break;
      case 'reset_password':
        title = 'Reset Your Password';
        message = 'We received a request to reset your password. If you didn/t make this request, you can safely ignore this email.';
        buttonText = 'Reset Password';
        break;
      case 'magic_link':
        title = 'Sign in to Locked Events';
        message = 'Click the link below to sign in to your account. This link will expire in 24 hours.';
        buttonText = 'Sign In';
        break;
      case 'confirm_signup':
        title = 'Confirm Your Email';
        message = 'Thanks for signing up! Please confirm your email address to activate your account.';
        buttonText = 'Confirm Email';
        break;
      case 'security_alert':
        title = 'New Sign-in Detected';
        message = `A new sign-in was detected for your account on <strong>${browser || 'a new device'}</strong> (${os || 'Unknown OS'}).<br><br>
                   <strong>Time:</strong> ${time || new Date().toLocaleString()}<br>
                   <strong>IP Address:</strong> ${ip || 'Unknown IP'}<br><br>
                   If this was you, you can safely ignore this email. If not, please secure your account immediately.`;
        buttonText = 'Secure My Account';
        break;
      case 'email_change':
        title = 'Verify Your New Email';
        message = 'We received a request to change the email address for your Locked Events account. Please verify this change by clicking the button below.';
        buttonText = 'Verify Email';
        break;
      case 'reauthenticate':
        title = 'Verify Your Identity';
        message = 'A sensitive action requires you to verify your identity. Please use the button below to continue.';
        buttonText = 'Verify Identity';
        break;
      case 'mfa_code':
        title = 'Your Verification Code';
        message = `To complete your sign-in, please use the following verification code:<br><br>
                   <div style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #111827; padding: 20px; background-color: #f3f4f6; border-radius: 12px; display: inline-block; margin: 10px 0;">
                     ${data.code}
                   </div><br><br>
                   This code will expire in 10 minutes. If you did not request this code, please ignore this email.`;
        buttonText = ''; // No button for code email
        break;
      case 'password_updated':
        title = 'Password Updated Successfully';
        message = `Your password for Locked Events was recently updated.<br><br>
                   <strong>Time:</strong> ${time || new Date().toLocaleString()}<br>
                   <strong>Device:</strong> ${browser || 'Unknown Device'} (${os || 'Unknown OS'})<br><br>
                   If you did not make this change, please contact our support team immediately.`;
        buttonText = 'Secure My Account';
        break;
      case 'cart_reminder':
        title = 'Items Waiting in Your Cart';
        message = `You still have some premium merchandise waiting in your cart for <strong>${data.eventTitle || 'the event'}</strong>. Don/t miss out on these exclusive items!`;
        buttonText = 'Complete Purchase';
        actionUrl = `${getBaseUrl()}/dashboards/user/cart`;
        break;
      case 'event_reminder':
        title = 'See You Soon!';
        message = `Just a friendly reminder that <strong>${data.eventTitle}</strong> is starting soon.<br><br>
                   <strong>Location:</strong> ${data.eventVenue || 'See details'}<br>
                   <strong>Time:</strong> ${data.eventTime}<br><br>
                   We can/t wait to see you there!`;
        buttonText = 'View Event Details';
        break;
      case 'event_update':
        title = 'Important Update: ' + (data.eventTitle || 'Event');
        message = `There has been an update to an event you/re attending.<br><br>
                   Please check the updated details below to ensure you have the latest information.`;
        buttonText = 'View Updated Details';
        break;
      case 'welcome':
        title = 'Welcome to Locked Events!';
        message = `We're thrilled to have you join the <strong>Locked</strong> community! You've just unlocked a world of exclusive events and premium experiences, plus a welcome gift of <strong>50 Keys</strong> to unlock exclusive perks.<br><br>
                   <em style="color: #6b7280; font-size: 14px;">If you did not create this account or are unaware of this registration, please contact our support team immediately at <a href="mailto:lockedeventsgh@gmail.com" style="color: #10b981; text-decoration: none;">lockedeventsgh@gmail.com</a>.</em>`;
        buttonText = 'Explore Events';
        actionUrl = `${getBaseUrl()}/pages/discover`;
        break;
      case 'role_request_submitted':
        title = 'Role Request Received';
        message = `We've received your request to become a <strong>${data.roleLabel || 'Partner'}</strong> on Locked Events. Our team is currently reviewing your application and verification details. We'll notify you once a decision has been made.`;
        buttonText = 'View Request Status';
        actionUrl = `${getBaseUrl()}/dashboards/organizer`;
        break;
      case 'role_request_approved':
        title = 'Congratulations! Access Granted';
        message = `Your request for the <strong>${data.roleLabel || 'Partner'}</strong> role has been approved! You now have access to specialized creator tools on Locked Events. Hop in and start building!`;
        buttonText = 'Go to Dashboard';
        actionUrl = `${getBaseUrl()}/dashboards/organizer`;
        break;
      case 'role_request_rejected':
        title = 'Update on Your Role Request';
        message = `Thank you for your interest in becoming a ${data.roleLabel || 'Partner'} on Locked Events. After reviewing your application, we are unable to approve your request at this time.<br><br>
                   ${data.note ? `<strong>Reason:</strong> ${data.note}<br><br>` : ''}
                   If you have any questions or would like to provide additional information, please don't hesitate to reach out to our support team.`;
        buttonText = 'Contact Support';
        actionUrl = 'mailto:lockedeventsgh@gmail.com';
        break;
      case 'role_request_revoked':
        title = 'Role Access Revoked';
        message = `Your access to the <strong>${data.roleLabel || 'Partner'}</strong> role has been revoked by an administrator.<br><br>
                   ${data.note ? `<strong>Note:</strong> ${data.note}<br><br>` : ''}
                   If you believe this is a mistake or need further assistance, please contact our support team.`;
        buttonText = 'Contact Support';
        actionUrl = 'mailto:lockedeventsgh@gmail.com';
        break;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7ff; color: #1f2937;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 40px 20px;">
            <!-- Logo row -->
            <tr>
              <td align="center" style="padding-bottom: 32px;">
                <img src="cid:logo" alt="Locked Events" style="height: 44px; width: auto; display: block;">
              </td>
            </tr>

            <!-- Title Row -->
            <tr>
              <td align="center" style="padding-bottom: 32px;">
                <h1 style="margin: 0; font-size: 32px; line-height: 1.2; font-weight: 800; color: #111827; max-width: 460px;">${title}</h1>
              </td>
            </tr>

            <!-- Welcome Image (Optional) -->
            ${type === 'welcome' ? `
            <tr>
              <td align="center" style="padding-bottom: 32px;">
                <img src="cid:welcome" alt="Welcome to Locked" style="width: 100%; max-width: 500px; height: auto; display: block; border-radius: 16px;">
              </td>
            </tr>
            ` : ''}

            <!-- Main Card Row -->
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: left;">
                        <strong style="font-size: 18px; color: #111827;">Hello ${customerName},</strong><br><br>
                        ${message}
                      </p>

                      <!-- Pill-shaped Action Button -->
                      ${buttonText ? `
                      <div style="text-align: center;">
                        <a href="${actionUrl || '#'}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 64px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 9999px; transition: background-color 0.2s;">
                          ${buttonText}
                        </a>
                      </div>
                      ` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer row -->
            <tr>
              <td align="center" style="padding-top: 32px; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Locked Events. All rights reserved.</p>
                <p style="margin: 8px 0 0;">Questions? <a href="mailto:lockedeventsgh@gmail.com" style="color: #6366f1; text-decoration: none;">Contact Support</a></p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  /**
   * Sends a confirmation email
   */
  async sendConfirmation(data: EmailData) {
    const transporter = await getTransporter();
    if (!transporter) return { success: false, error: 'Email service not configured' };

    try {
      let html = '';
      if (data.type === 'transactional') {
        html = this.generateTemplate(data.templateData);
      } else if (data.type === 'auth') {
        html = this.generateAuthTemplate(data.templateType, data.templateData);
      }
      
      const attachments: any[] = [];

      try {
        const path = require('path');
        const fs = require('fs');
        
        // Always try to attach logo for auth emails
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (data.type === 'auth' && fs.existsSync(logoPath)) {
          attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo',
            disposition: 'inline'
          });
        }

        // Attach welcome image for welcome emails
        if (data.type === 'auth' && data.templateType === 'welcome') {
          const welcomePath = path.join(process.cwd(), 'public', 'images', 'welcome-mail.png');
          if (fs.existsSync(welcomePath)) {
            attachments.push({
              filename: 'welcome-mail.png',
              path: welcomePath,
              cid: 'welcome',
              disposition: 'inline'
            });
          }
        }
      } catch (e) {
        console.error('[EmailService] Failed to attach images:', e);
      }
      
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Locked Events" <${process.env.SMTP_USER}>`,
        to: data.to,
        subject: data.subject,
        html: html,
        attachments: attachments
      });

      console.log('[EmailService] Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }
};
