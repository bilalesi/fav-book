# Environment Variables Setup

This document explains how environment variables are handled in the Social Bookmarks Manager project.

## How It Works

**Bun automatically loads `.env` files** from the current working directory. No additional configuration or packages are needed.

When you run:

```bash
bun run dev
```

Bun will automatically load environment variables from `.env` files in this order:

1. `.env.local` (highest priority, git-ignored)
2. `.env.development` (for development)
3. `.env` (default)

## Required Environment Variables

### Server (`apps/server/.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Email (Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Social Bookmarks <noreply@yourdomain.com>

# OAuth (Optional)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

### Web App (`apps/web/.env`)

```env
VITE_SERVER_URL=http://localhost:3000
```

## Getting API Keys

### Resend (Email Service)

1. Sign up at https://resend.com
2. Go to https://resend.com/api-keys
3. Create a new API key
4. Copy the key (starts with `re_`)
5. Add to `apps/server/.env`:
   ```env
   RESEND_API_KEY=re_your_actual_key_here
   ```

### Twitter OAuth (Optional)

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app
3. Get your Client ID and Client Secret
4. Add to `apps/server/.env`

### LinkedIn OAuth (Optional)

1. Go to https://www.linkedin.com/developers/apps
2. Create a new app
3. Get your Client ID and Client Secret
4. Add to `apps/server/.env`

## Development Setup

1. **Copy example files:**

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. **Fill in your values:**

   - Edit `apps/server/.env` with your actual API keys
   - Edit `apps/web/.env` if needed (usually defaults are fine)

3. **Start development:**

   ```bash
   # Terminal 1: Start server
   bun run dev:server

   # Terminal 2: Start web app
   bun run dev:web
   ```

## Production Setup

For production, set environment variables through your hosting platform:

### Vercel / Netlify / Cloudflare Pages

- Add environment variables in the dashboard
- Use the same variable names as in `.env.example`

### VPS / Docker

- Create `.env` file on the server
- Or use environment variables in your process manager (PM2, systemd, etc.)

### Docker Compose

```yaml
services:
  server:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      # ... other variables
```

## Troubleshooting

### "Missing API key" Error

If you see:

```
Error: Missing API key. Pass it to the constructor `new Resend("re_123")`
```

**Solution:**

1. Check that `RESEND_API_KEY` is set in `apps/server/.env`
2. Restart the server (Bun loads .env on startup)
3. Verify the key is correct (starts with `re_`)

### Environment Variables Not Loading

**Check:**

1. `.env` file is in the correct directory (`apps/server/` or `apps/web/`)
2. Variable names match exactly (case-sensitive)
3. No spaces around `=` sign
4. Values with spaces are quoted: `EMAIL_FROM="My App <noreply@example.com>"`
5. Restart the development server

### Different Values for Development/Production

Create environment-specific files:

```bash
# Development
apps/server/.env.development

# Production
apps/server/.env.production
```

Bun will automatically load the correct file based on `NODE_ENV`.

## Security Best Practices

1. **Never commit `.env` files to git**

   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use strong secrets**

   - Generate with: `openssl rand -base64 32`
   - Or: `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`

3. **Rotate keys regularly**

   - Especially after team member changes
   - Use different keys for dev/staging/production

4. **Limit key permissions**

   - Use read-only database users where possible
   - Restrict API key scopes (e.g., Resend: only send emails)

5. **Use secrets management in production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Cloud provider secret stores

## Environment Variable Reference

| Variable                 | Required  | Default                                     | Description                    |
| ------------------------ | --------- | ------------------------------------------- | ------------------------------ |
| `DATABASE_URL`           | Yes       | -                                           | PostgreSQL connection string   |
| `BETTER_AUTH_SECRET`     | Yes       | -                                           | Secret for signing auth tokens |
| `BETTER_AUTH_URL`        | Yes       | -                                           | Base URL of your API           |
| `CORS_ORIGIN`            | Yes       | -                                           | Allowed origin for CORS        |
| `RESEND_API_KEY`         | Yes       | -                                           | Resend API key for emails      |
| `EMAIL_FROM`             | No        | `Social Bookmarks <noreply@yourdomain.com>` | From address for emails        |
| `TWITTER_CLIENT_ID`      | No        | -                                           | Twitter OAuth client ID        |
| `TWITTER_CLIENT_SECRET`  | No        | -                                           | Twitter OAuth secret           |
| `LINKEDIN_CLIENT_ID`     | No        | -                                           | LinkedIn OAuth client ID       |
| `LINKEDIN_CLIENT_SECRET` | No        | -                                           | LinkedIn OAuth secret          |
| `NODE_ENV`               | No        | `development`                               | Environment mode               |
| `VITE_SERVER_URL`        | Yes (web) | -                                           | API server URL for web app     |

## Notes

- **Bun's built-in .env support** means no additional packages needed
- **Lazy initialization** in `email-service.ts` prevents errors when env vars aren't needed
- **Vite** automatically exposes variables prefixed with `VITE_` to the client
- **Server-side** variables are never exposed to the client
