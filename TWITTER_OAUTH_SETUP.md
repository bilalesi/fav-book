# X (Twitter) OAuth Setup Guide

## What to Fill in X Developer Portal

Based on your screenshot, here's what you need to enter:

### 1. **Callback URI / Redirect URL** (Required)

```
http://localhost:3000/api/auth/callback/twitter
```

For production, add:

```
https://yourdomain.com/api/auth/callback/twitter
```

**Important**: You can add multiple callback URLs. Add both development and production URLs.

### 2. **Website URL** (Required)

For development:

```
http://localhost:3001
```

For production:

```
https://yourdomain.com
```

### 3. **Organization name** (Optional)

```
Social Bookmarks Manager
```

or

```
Your Company Name
```

This will be shown to users when they authorize your app.

### 4. **Organization URL** (Optional)

```
http://localhost:3001
```

For production:

```
https://yourdomain.com
```

### 5. **Terms of service** (Optional)

```
http://localhost:3001/terms
```

For production:

```
https://yourdomain.com/terms
```

### 6. **Privacy policy** (Optional)

```
http://localhost:3001/privacy
```

For production:

```
https://yourdomain.com/privacy
```

## Complete Setup Steps

### Step 1: Create X Developer App

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new project (if you don't have one)
3. Create a new app within the project
4. Note down your **Client ID** and **Client Secret**

### Step 2: Configure OAuth 2.0 Settings

1. In your app settings, go to "User authentication settings"
2. Click "Set up" or "Edit"
3. Enable **OAuth 2.0**
4. Set **Type of App**: Web App
5. Fill in the form with the values above

### Step 3: Set Permissions

Choose the permissions your app needs:

- ✅ Read (to read user profile)
- ✅ Write (if you want to post on behalf of users)

For a bookmark manager, you typically only need **Read** permissions.

### Step 4: Update Your .env Files

After getting your credentials, update these files:

#### `packages/auth/.env`

```env
TWITTER_CLIENT_ID=your-actual-client-id-here
TWITTER_CLIENT_SECRET=your-actual-client-secret-here
```

#### `apps/server/.env`

```env
TWITTER_CLIENT_ID=your-actual-client-id-here
TWITTER_CLIENT_SECRET=your-actual-client-secret-here
```

### Step 5: Enable Twitter OAuth in Better-Auth

The Twitter OAuth is currently commented out in your auth config. You need to uncomment it:

Edit `packages/auth/src/index.ts` and uncomment the socialProviders section:

```typescript
socialProviders: {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || "",
    clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
  },
  // linkedin: {
  //   clientId: process.env.LINKEDIN_CLIENT_ID || "",
  //   clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
  // },
},
```

### Step 6: Restart Your Server

```bash
cd apps/server
bun run dev
```

## Testing

1. Go to http://localhost:3001/login
2. Click "Other options"
3. Click "Continue with X"
4. You should be redirected to X for authorization
5. After authorizing, you'll be redirected back to your app

## Troubleshooting

### Error: "Callback URL not approved"

- Make sure the callback URL in X Developer Portal exactly matches: `http://localhost:3000/api/auth/callback/twitter`
- No trailing slashes
- Check the protocol (http vs https)

### Error: "Invalid client credentials"

- Double-check your Client ID and Client Secret
- Make sure there are no extra spaces
- Verify the credentials are in the correct .env files

### Error: "App not authorized"

- Make sure OAuth 2.0 is enabled in X Developer Portal
- Check that your app has the correct permissions

## Production Checklist

Before going to production:

1. ✅ Add production callback URL: `https://yourdomain.com/api/auth/callback/twitter`
2. ✅ Update Website URL to your production domain
3. ✅ Add real Terms of Service URL
4. ✅ Add real Privacy Policy URL
5. ✅ Update .env files with production credentials
6. ✅ Test the OAuth flow on production

## Quick Reference

**Development Callback URL:**

```
http://localhost:3000/api/auth/callback/twitter
```

**Production Callback URL:**

```
https://yourdomain.com/api/auth/callback/twitter
```

**Auth Endpoint (handled by better-auth):**

- Initiate: `GET /api/auth/twitter`
- Callback: `GET /api/auth/callback/twitter`
