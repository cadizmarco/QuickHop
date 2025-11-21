// Vercel Serverless Function - uses Node.js runtime
// This file should be in the /api directory for Vercel to recognize it
import nodemailer from 'nodemailer';

// Vercel serverless function handler
// If @vercel/node is not installed, use this simpler type definition
type VercelRequest = {
  method?: string;
  body?: any;
  query?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, trackingNumber, customerName, subject, html } = req.body;

    // Support both tracking email format and generic email format
    const emailTo = to;
    const emailSubject = subject || `Your QuickHop Order #${trackingNumber}`;
    const emailHtml = html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3b82f6;">QuickHop Delivery Update</h1>
        <p>Hello ${customerName || 'Customer'},</p>
        <p>Your order is on the way! You can track your delivery using the tracking number below:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${trackingNumber}</span>
        </div>
        <p>Visit our website and enter this tracking number to see real-time updates.</p>
        <p>Thank you for choosing QuickHop!</p>
      </div>
    `;

    if (!emailTo) {
      return res.status(400).json({ error: 'Missing required field: to' });
    }

    // Get environment variables (Vercel uses process.env)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error('Missing GMAIL_USER or GMAIL_PASS environment variables');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const mailOptions = {
      from: gmailUser,
      to: emailTo,
      subject: emailSubject,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    console.log(`
    [VERCEL SERVERLESS FUNCTION] Email Sent:
    To: ${emailTo}
    Subject: ${emailSubject}
    ${trackingNumber ? `Tracking: ${trackingNumber}` : ''}
    `);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}
