import nodemailer from 'nodemailer';

// Cache credentials in memory to avoid making an API call for every single email
let cachedCreds: { user: string; pass: string } | null = null;

async function fetchSmtpCredentials() {
  if (cachedCreds) return cachedCreds;

  const secretName = process.env.SMTP_CREDENTIALS_SECRET_NAME;
  const keyName = process.env.SMTP_CREDENTIALS_KEY_NAME;

  try {
    const response = await fetch('https://authentication.learningweaver.com/fetch-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_name: secretName,
        key_name: keyName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status && data.status !== "success") {
      throw new Error(`Unexpected response from SMTP credential service: ${JSON.stringify(data)}`);
    }

    // Safely extract the AWS keys mirroring the Python reference
    const keyData = (keyName && data[keyName]) ? data[keyName] : (data.key || {});
    const user = keyData.aws_access_key_id;
    const pass = keyData.aws_secret_access_key;

    if (!user || !pass) {
      throw new Error(`SMTP credential payload missing keys: ${JSON.stringify(data)}`);
    }

    cachedCreds = { user, pass };
    console.log("🔐 Successfully fetched SMTP credentials from API.");
    return cachedCreds;

  } catch (error) {
    console.error("❌ Failed to fetch SES credentials dynamically:", error);
    return null;
  }
}

export const MailService = {
  async sendMail(to: string, subject: string, htmlContent: string) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const fromEmail = process.env.SMTP_FROM;
    const fromName = process.env.SMTP_FROM_NAME || 'DocHub';

    if (!host) {
      console.warn(`⚠️ SMTP_HOST not set. Mocking email to ${to}`);
      return true;
    }

    // 1. Fetch credentials at the exact moment we need to send an email
    const creds = await fetchSmtpCredentials();
    
    if (!creds) {
      console.error(`🚨 Cannot send email to ${to}: Missing dynamic credentials.`);
      return false;
    }

    // 2. Initialize the transporter with the newly fetched credentials
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: creds.user,
        pass: creds.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 3. Send the email
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Successfully sent email to ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}. Error:`, error);
      return false;
    }
  },

  async send(template: string, to: string, context: Record<string, string>) {
    let subject = '';
    let htmlContent = '';

    if (template === 'invite') {
      subject = `You've been invited to join ${context.workspace_name || 'DocHub'}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">You've been invited!</h2>
            <p style="color: #475569; font-size: 16px;">
                <strong>${context.inviter_name}</strong> has invited you to join DocHub Enterprise.
            </p>
            <div style="margin: 30px 0; text-align: center;">
                <a href="${context.invite_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Accept Invitation
                </a>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                If you don't know ${context.inviter_name} or aren't expecting this invitation, you can safely ignore this email.
            </p>
        </div>
      `;
    } else {
      throw new Error(`Unknown email template: ${template}`);
    }

    return await this.sendMail(to, subject, htmlContent);
  }
};