const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const sendOtpEmail = async (to, code, username) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Georgia', serif; background: #f5f0e8; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 2px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: #1a1a1a; padding: 40px; text-align: center; }
        .logo-text { color: #C9A96E; font-size: 28px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; }
        .tagline { color: #888; font-size: 11px; letter-spacing: 3px; margin-top: 8px; text-transform: uppercase; }
        .body { padding: 40px; }
        .greeting { color: #333; font-size: 16px; margin-bottom: 20px; }
        .otp-box { background: #1a1a1a; border-radius: 4px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-label { color: #C9A96E; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; }
        .otp-code { color: #fff; font-size: 42px; font-weight: bold; letter-spacing: 12px; font-family: monospace; }
        .expiry { color: #888; font-size: 13px; text-align: center; margin-top: 10px; }
        .warning { background: #fff8e1; border-left: 3px solid #C9A96E; padding: 15px; margin: 20px 0; font-size: 13px; color: #666; }
        .footer { background: #f5f0e8; padding: 20px; text-align: center; font-size: 12px; color: #999; }
        .footer a { color: #C9A96E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-text">Villa Vogue</div>
          <div class="tagline">Where Fashion Finds a Home</div>
        </div>
        <div class="body">
          <p class="greeting">Hello, <strong>${username}</strong>!</p>
          <p style="color:#555; font-size:14px; line-height:1.6;">You requested a two-factor authentication code to sign in to Villa Vogue BMS. Use the code below:</p>
          <div class="otp-box">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${code}</div>
          </div>
          <p class="expiry">⏱ This code expires in <strong>10 minutes</strong></p>
          <div class="warning">
            <strong>Security Notice:</strong> Never share this code with anyone. Villa Vogue staff will never ask for your OTP code.
          </div>
          <p style="color:#555; font-size:13px;">If you did not request this code, please contact your system administrator immediately.</p>
        </div>
        <div class="footer">
          <p>Villa Vogue Fashions &bull; Kampala, Uganda</p>
          <p>+256 782 860372 &bull; <a href="mailto:villavoguef@gmail.com">villavoguef@gmail.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Villa Vogue BMS" <kayanjawilfred@gmail.com>',
    to,
    subject: `[${code}] Your Villa Vogue BMS Login Code`,
    html,
    text: `Your Villa Vogue BMS verification code is: ${code}. It expires in 10 minutes. Do not share this code.`,
  });
};

const sendLowStockAlert = async (products) => {
  const rows = products.map(p => `<tr><td>${p.name}</td><td>${p.sku || '-'}</td><td style="color:#e74c3c"><strong>${p.stock}</strong></td><td>${p.lowStockThreshold}</td></tr>`).join('');
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: `⚠️ Low Stock Alert - ${products.length} products`,
    html: `<h2>Low Stock Alert</h2><table border="1" cellpadding="8" style="border-collapse:collapse"><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Threshold</th></tr>${rows}</table>`,
  });
};

const sendDailyReport = async (report) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: `Daily Report - ${new Date().toDateString()} - Sales: UGX ${report.totalSales?.toLocaleString()}`,
    html: `<h2>Daily Sales Report</h2><p>Total Sales: <strong>UGX ${report.totalSales?.toLocaleString()}</strong></p><p>Orders: ${report.orderCount}</p><p>Net Profit: UGX ${report.netProfit?.toLocaleString()}</p>`,
  });
};

module.exports = { sendOtpEmail, sendLowStockAlert, sendDailyReport };
