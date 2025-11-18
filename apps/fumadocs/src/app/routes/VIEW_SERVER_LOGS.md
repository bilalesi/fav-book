# How to View Server Logs

## Problem

You can't see console.log output from your server when it's running in the background.

## Solutions

### Option 1: Run Server in Foreground (Recommended for Development)

Stop the current server and run it in your terminal:

```bash
# Stop the current server
lsof -ti:3000 | xargs kill -9

# Navigate to server directory
cd apps/server

# Run server (you'll see all logs)
bun run dev
```

Now you'll see all console.log output directly in your terminal!

### Option 2: Use Process Output Tool (If running in background)

If your server is running as a background process in Kiro:

1. Check running processes:

   - Look for the server process in Kiro's process list
   - Note the process ID

2. View logs using Kiro's getProcessOutput tool

### Option 3: Add File Logging

Create a log file that you can tail:

```bash
# In apps/server directory
bun run dev > server.log 2>&1 &

# Then view logs in real-time
tail -f server.log
```

### Option 4: Use Better Logging (Already Added!)

I've added enhanced logging to your email service with:

- Clear visual separators (====)
- Emojis for easy scanning
- Detailed step-by-step output
- Error details with stack traces

## Testing the Logs

1. **Stop your current server:**

```bash
lsof -ti:3000 | xargs kill -9
```

2. **Start server in foreground:**

```bash
cd apps/server
bun run dev
```

3. **Try sending a magic link** from your frontend

4. **You should see output like:**

```
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

## Quick Commands

```bash
# Kill server on port 3000
lsof -ti:3000 | xargs kill -9

# Start server with visible logs
cd apps/server && bun run dev

# Check if server is running
lsof -ti:3000

# View last 100 lines of logs (if using file logging)
tail -100 server.log

# Follow logs in real-time (if using file logging)
tail -f server.log
```

## Troubleshooting

### "I still don't see logs"

- Make sure you're running the server in the foreground (not background)
- Check you're in the right terminal window
- Verify the server actually restarted after code changes

### "Server won't start"

- Check if port 3000 is already in use: `lsof -ti:3000`
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Check for syntax errors: `cd apps/server && bun run check-types`

### "Logs are cut off"

- Bun's `--hot` flag might buffer output
- Try running without hot reload: `bun run src/index.ts`
- Or use file logging (Option 3 above)
