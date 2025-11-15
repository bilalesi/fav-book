# Authentication Package

This package provides authentication configuration for the Social Bookmarks Manager using better-auth.

## Features

- **OAuth Authentication**: Twitter (X) and LinkedIn social login
- **Magic Link Authentication**: Passwordless email authentication using Resend
- **Email Templates**: Branded magic link emails using react-email
- **Session Management**: Secure cookie-based sessions with CSRF protection
- **Security**: HTTP-only cookies, secure cookies in production, rate limiting

## Setup

### 1. Environment Variables

Copy the `.env.example` file and fill in your credentials:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# OAuth Providers
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Social Bookmarks <[email]>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 2. OAuth Provider Setup

#### Twitter (X)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. Enable OAuth 2.0
4. Add callback URL: `http://localhost:3000/api/auth/callback/twitter`
5. Copy Client ID and Client Secret to your `.env` file

#### LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Add OAuth 2.0 redirect URL: `http://localhost:3000/api/auth/callback/linkedin`
4. Request access to Sign In with LinkedIn
5. Copy Client ID and Client Secret to your `.env` file

### 3. Resend Setup

1. Sign up at [Resend](https://resend.com)
2. Verify your domain or use the test domain
3. Create an API key
4. Add the API key to your `.env` file

## Usage

### Server Integration

The auth instance is already integrated in the server. See `apps/server/src/index.ts`.

### Available Endpoints

All authentication endpoints are handled by better-auth at `/api/auth/*`:

- `POST /api/auth/sign-in/email` - Email/password sign in
- `POST /api/auth/sign-up/email` - Email/password sign up
- `GET /api/auth/twitter` - Initiate Twitter OAuth
- `GET /api/auth/linkedin` - Initiate LinkedIn OAuth
- `POST /api/auth/send-verification-email` - Send magic link
- `GET /api/auth/verify-email` - Verify magic link token
- `POST /api/auth/sign-out` - Sign out
- `GET /api/session` - Get current session info

### Session Validation

Use the middleware in your server routes:

```typescript
import { requireAuth } from "./middleware/auth";

// In your route handler
const { user, session } = await requireAuth(request);
```

## Email Templates

The magic link email template is located at `src/emails/magic-link.tsx`. You can customize it to match your branding.

To preview the email template:

```bash
# Install react-email CLI globally
npm install -g react-email

# Preview emails
react-email dev
```

## Security Features

- **CSRF Protection**: Enabled by default
- **Secure Cookies**: HTTP-only, secure in production, SameSite=lax
- **Rate Limiting**: 10 requests per minute per IP
- **Session Expiry**: 7 days with automatic refresh
- **Magic Link Expiry**: 15 minutes

## Development

```bash
# Build the package
bun run build

# Type check
bun run check-types
```

## Troubleshooting

### Magic Link Not Sending

- Check that `RESEND_API_KEY` is set correctly
- Verify your domain is verified in Resend
- Check server logs for email sending errors

### OAuth Not Working

- Verify callback URLs match in provider settings
- Check that client ID and secret are correct
- Ensure `BETTER_AUTH_URL` is set correctly

### Session Not Persisting

- Check that cookies are enabled in your browser
- Verify CORS settings allow credentials
- Ensure `CORS_ORIGIN` matches your frontend URL
