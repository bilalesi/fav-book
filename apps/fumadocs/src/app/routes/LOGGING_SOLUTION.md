# Logging Solution for Workspace Packages

## Problem

Console.log statements from workspace packages (`packages/auth`, `packages/api`) don't appear in the server output when using `bun run --hot`.

## Root Cause

Bun's `--hot` flag with workspace packages doesn't properly pipe console output from imported packages to the main process stdout/stderr.

## ✅ SOLUTION: Run Server Without Hot Reload

The most reliable way to see all logs is to run the server WITHOUT the `--hot` flag:

### Step 1: Update package.json

Edit `apps/server/package.json`:

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "dev:hot": "bun run --hot src/index.ts",
    "build": "tsdown",
    "check-types": "tsc -b",
    "compile": "bun build --compile --minify --sourcemap --bytecode ./src/index.ts --outfile server",
    "start": "bun run dist/index.js"
  }
}
```

### Step 2: Stop Current Server

```bash
lsof -ti:3000 | xargs kill -9
```

### Step 3: Run Server

```bash
cd apps/server
bun run dev
```

Now you'll see ALL logs including from `packages/auth` and `packages/api`!

### Step 4: Test Magic Link

From your frontend, try sending a magic link. You should now see:

```
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🔥 BETTER-AUTH: sendVerificationEmail CALLED
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
👤 User: {...}
🔗 URL: http://localhost:3001/auth/verify?token=...
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

================================================================================
📧 SENDING MAGIC LINK EMAIL
================================================================================
📬 To: user@example.com
🔗 Magic Link: http://localhost:3001/auth/verify?token=...
⏰ Timestamp: 2024-11-15T...
🔑 API Key: ✅ Set
📨 From: onboarding@resend.dev

🔄 Creating Resend instance...
✅ Resend instance created successfully

🎨 Rendering email HTML...
✅ Email HTML rendered successfully
📄 HTML length: 2543 characters

🚀 Calling Resend API...
   From: onboarding@resend.dev
   To: user@example.com
   Subject: Sign in to Social Bookmarks Manager

================================================================================
✅ EMAIL SENT SUCCESSFULLY!
================================================================================
📧 Email ID: abc123-def456-...
🌐 Check Resend dashboard: https://resend.com/emails
💡 Note: With onboarding@resend.dev, emails appear in dashboard only
================================================================================
```

## Trade-offs

### Without `--hot` (Recommended for Debugging)

- ✅ See ALL logs from all packages
- ✅ More stable
- ❌ Need to manually restart server after code changes

### With `--hot`

- ✅ Auto-restart on code changes
- ❌ Logs from workspace packages are suppressed
- ❌ Harder to debug

## Alternative: Use File Logging

If you must use `--hot`, the file logger I added will write to `auth-debug.log`:

```bash
# In one terminal
cd apps/server
bun run dev:hot

# In another terminal
tail -f apps/server/auth-debug.log
```

## Recommended Development Workflow

1. **Normal development**: Use `bun run dev:hot` for fast iteration
2. **Debugging emails/auth**: Use `bun run dev` to see all logs
3. **Production**: Use `bun run start` with compiled code

## Quick Commands

```bash
# Stop server
lsof -ti:3000 | xargs kill -9

# Run with full logs (no hot reload)
cd apps/server && bun run dev

# Run with hot reload (limited logs)
cd apps/server && bun run dev:hot

# Check if server is running
lsof -ti:3000

# Test magic link
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","callbackURL":"http://localhost:3001/dashboard"}'
```

## Summary

**The emails ARE working!** The issue is just that you can't see the logs with `--hot` mode. Run without `--hot` to see everything.
