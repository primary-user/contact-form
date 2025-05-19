// Serverless function for Vercel to handle contact form submissions
import nodemailer from 'nodemailer';

// Schema validation for form data
function validateContactForm(data) {
  const errors = {};

  if (!data.firstName || data.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.message || data.message.trim() === '') {
    errors.message = 'Message is required';
  } else if (data.message.length > 600) {
    errors.message = 'Message cannot exceed 600 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export default async function handler(req, res) {
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Get request body
    const data = req.body;
    
    // Log incoming request (will appear in Vercel logs)
    console.log('Received form submission:', data);

    // Validate form data
    const validation = validateContactForm(data);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validation.errors 
      });
    }

    // Recipient email - your own email address
    const targetEmail = 'info@davidncreative.com';
    
    // Email configuration using environment variables
    const smtpHost = process.env.SMTP_HOST || 'mail.privateemail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || targetEmail;
    const smtpPass = process.env.SMTP_PASS;

    // Check if we have the required credentials
    if (!smtpPass) {
      console.error('SMTP_PASS environment variable is not set');
      throw new Error('Email configuration error');
    }
    
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Log connection attempt (will appear in Vercel logs)
    console.log(`Attempting to send email using: ${smtpHost}:${smtpPort}`);

    // Send the email
    const info = await transporter.sendMail({
      from: `"Contact Form" <${smtpUser}>`,
      to: targetEmail,
      subject: `New Form Submission from ${data.firstName} ${data.lastName}`,
      text: `
Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Message: ${data.message}
      `,
      html: `
<h3>New Contact Form Submission</h3>
<p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
<p><strong>Email:</strong> ${data.email}</p>
<p><strong>Message:</strong></p>
<p>${data.message.replace(/\n/g, '<br>')}</p>
      `,
    });

    // Log success (will appear in Vercel logs)
    console.log(`Email sent successfully to ${targetEmail}`);
    
    // Return success response to the client
    return res.status(200).json({ 
      success: true, 
      message: 'Form submitted successfully' 
    });
  } catch (error) {
    // Log error for debugging (will appear in Vercel logs)
    console.error('Error processing contact form:', error);
    
    // Return error response to the client
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
