# Vercel Serverless Function - Send Email

This is a Vercel serverless function that sends tracking emails to customers using nodemailer.

## Setup Instructions

### 1. Install Dependencies

The required packages are already in `package.json`:
- `nodemailer` - for sending emails
- `@types/nodemailer` - TypeScript types

### 2. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `GMAIL_USER` - Your Gmail address (e.g., `your-email@gmail.com`)
   - `GMAIL_PASS` - Your Gmail app password (not your regular password)

**Important:** Make sure to add these for all environments (Production, Preview, Development).

### 3. Gmail App Password Setup

1. Go to your Google Account settings: https://myaccount.google.com/
2. Enable **2-Step Verification** (required for app passwords)
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate a new app password for "Mail"
5. Use this 16-character app password (not your regular Gmail password) as `GMAIL_PASS`

### 4. Deploy to Vercel

The function will automatically be deployed when you push to your repository or deploy via Vercel CLI:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel
```

Or simply push to your connected Git repository - Vercel will auto-deploy.

## How It Works

- **File Location**: `/api/send-email.ts`
- **Runtime**: Node.js (Vercel automatically detects and uses Node.js runtime)
- **Endpoint**: `https://your-domain.vercel.app/api/send-email`
- **Method**: POST

## API Usage

### Request Format

```typescript
POST /api/send-email
Content-Type: application/json

{
  "to": "customer@example.com",
  "trackingNumber": "QH-ABC123",
  "customerName": "John Doe"
}
```

### Response Format

**Success:**
```json
{
  "success": true
}
```

**Error:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Testing Locally

For local development, you can use Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Run development server
vercel dev
```

Then test the endpoint:
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "trackingNumber": "QH-TEST123",
    "customerName": "Test User"
  }'
```

## Integration

The function is automatically called from `src/lib/emailService.ts` when creating deliveries. The email service detects the current domain and calls the appropriate API endpoint.

## Troubleshooting

### Error: "Email service not configured"
- Make sure `GMAIL_USER` and `GMAIL_PASS` are set in Vercel environment variables
- Redeploy after adding environment variables

### Error: "Invalid login"
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled on your Google Account

### Error: "Connection timeout"
- Check your internet connection
- Verify Gmail SMTP settings are correct (should use port 587 or 465)

### Function not found in production
- Make sure the file is in the `/api` directory
- Verify the file is named `send-email.ts` (not `.js`)
- Check that the function exports a default handler

## Notes

- The function supports both tracking emails (with trackingNumber) and generic emails (with custom subject/html)
- CORS is enabled for all origins
- The function uses nodemailer with Gmail SMTP
- Emails are sent asynchronously and won't block the delivery creation process
