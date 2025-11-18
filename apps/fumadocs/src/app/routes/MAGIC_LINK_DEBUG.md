# Magic Link Email Debugging Guide

## Issue

Magic link emails show success notification but never arrive in inbox or Resend dashboard.

## Root Causes Found

### 1. ✅ FIXED: Invalid Email Format

**Problem**: The `EMAIL_FROM` had brackets around the email address:

```
EMAIL_FROM=Social Bookmarks <[bx93tn@gmail.com]>
```

**Solution**: Removed brackets:

```
EMAIL_FROM=Social Bookmarks <bx93tn@gmail.com>
```

### 2. ⚠️ Resend Domain Verification Required

**Problem**: Resend requires domain verification to send emails. Using `@gmail.com` won't work in production.

**Solutions**:

#### Option A: Use Resend's Test Domain (Development Only)

For testing, you can use Resend's test domain:

```
EMAIL_FROM=onboarding@resend.dev
```

This will deliver emails to the Resend dashboard but NOT to actual inboxes.

#### Option B: Verify Your Own Domain (Production)

1. Go to https://resend.com/domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records Resend provides
4. Wait for verification (usually a few minutes)
5. Update your `.env`:

```
EMAIL_FROM=Social Bookmarks <noreply@yourdomain.com>
```

#### Option C: Use Gmail SMTP (Alternative)

If you want to use Gmail, you'll need to:

1. Switch from Resend to Nodemailer
2. Set up Gmail App Password
3. Configure SMTP settings

### 3. Check Resend API Key

Verify your API key is valid:

1. Go to https://resend.com/api-keys
2. Check if `re_NQ5ZA6vv_APvoRmRiUqiXaBePLFbVpLfq` is active
3. Make sure it has "Sending access" permission

## Testing Steps

### 1. Restart Your Server

After fixing the EMAIL_FROM, restart your backend server:

```bash
cd apps/server
npm run dev
```

### 2. Test with Resend Test Domain

Update `packages/auth/.env`:

```
EMAIL_FROM=onboarding@resend.dev
```

Restart server and try sending a magic link. Check:

- Resend dashboard: https://resend.com/emails
- You should see the email there (but it won't deliver to real inbox)

### 3. Check Server Logs

Look for these log messages:

- ✅ "Magic link email sent successfully: [email-id]"
- ❌ "Failed to send magic link email: [error]"

### 4. Test Email Delivery

```bash
# In your server directory
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test@email.com","callbackURL":"http://localhost:3001/dashboard"}'
```

## Quick Fix for Development

**Immediate solution to test magic links:**

1. Update `packages/auth/.env`:

```env
EMAIL_FROM=onboarding@resend.dev
```

2. Restart server

3. Try magic link login

4. Check Resend dashboard at https://resend.com/emails to see the email

5. Copy the magic link URL from the dashboard and paste it in your browser

## Production Setup

For production, you MUST:

1. Own a domain
2. Verify it with Resend
3. Use that domain in EMAIL_FROM
4. Update BETTER_AUTH_URL to your production URL

## Common Errors

### "Invalid from address"

- Check EMAIL_FROM format (no brackets, valid email)
- Verify domain is added to Resend

### "API key not found"

- Check RESEND_API_KEY is correct
- Verify it's not expired

### "Domain not verified"

- Add and verify your domain in Resend dashboard
- Use `onboarding@resend.dev` for testing

## Environment Variables Checklist

```env
# packages/auth/.env
RESEND_API_KEY=re_NQ5ZA6vv_APvoRmRiUqiXaBePLFbVpLfq
EMAIL_FROM=onboarding@resend.dev  # For testing
# EMAIL_FROM=Social Bookmarks <noreply@yourdomain.com>  # For production

# apps/server/.env
RESEND_API_KEY=re_NQ5ZA6vv_APvoRmRiUqiXaBePLFbVpLfq
EMAIL_FROM=onboarding@resend.dev  # For testing
```

## Next Steps

1. ✅ Fix EMAIL_FROM format (DONE)
2. 🔄 Use `onboarding@resend.dev` for testing
3. 🔄 Restart server
4. 🔄 Test magic link
5. 🔄 Check Resend dashboard for emails
6. 📋 For production: Verify your domain with Resend
