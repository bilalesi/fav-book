# Deployment Guide

## Overview

This guide covers deploying the Social Bookmarks Manager to production environments.

## Architecture

- **Frontend (Web App)**: Deployed to Cloudflare Pages via Alchemy
- **Backend (API Server)**: Self-hosted or cloud VM
- **Database**: Neon PostgreSQL (managed)

## Prerequisites

- Bun runtime installed
- Alchemy CLI installed (`bun add -g alchemy`)
- Access to Neon database
- OAuth credentials (Twitter, LinkedIn)
- Resend API key for emails

## Environment Variables

### Production Web App (.env.production)

```bash
VITE_SERVER_URL=https://api.yourdomain.com
ALCHEMY_PASSWORD=your-secure-password
```

### Production Server (.env.production)

```bash
# Authentication
BETTER_AUTH_SECRET=your-production-secret-min-32-chars
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# OAuth Providers
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email Service
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Social Bookmarks <noreply@yourdomain.com>

# Database (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Optional: Monitoring
NODE_ENV=production
LOG_LEVEL=info
```

## Database Setup (Neon)

### 1. Create Production Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: "social-bookmarks-prod"
3. Copy the connection string
4. Enable connection pooling for better performance

### 2. Configure Database

```bash
# Set production database URL
export DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Generate Prisma client
bun run db:generate

# Push schema to production database
bun run db:push
```

### 3. Database Backups

Neon provides automatic backups:

- Point-in-time recovery (PITR) enabled by default
- Retention: 7 days (free tier) or 30 days (paid)
- Manual backups via Neon Console

### 4. Database Monitoring

Monitor via Neon Console:

- Query performance metrics
- Connection pool usage
- Storage usage
- Active connections

## Frontend Deployment (Alchemy)

### 1. Configure Alchemy

The web app is already configured in `apps/web/alchemy.run.ts`.

### 2. Deploy to Production

```bash
# Navigate to web app
cd apps/web

# Set production environment variables
export VITE_SERVER_URL=https://api.yourdomain.com
export ALCHEMY_PASSWORD=your-secure-password

# Deploy
bun run deploy
```

### 3. Custom Domain (Optional)

1. In Cloudflare dashboard, go to your Pages project
2. Add custom domain
3. Update DNS records as instructed
4. SSL certificate is automatically provisioned

### 4. Environment Variables in Alchemy

Environment variables are set in `alchemy.run.ts`:

- `VITE_SERVER_URL`: Backend API URL
- Additional variables can be added to the `bindings` object

## Backend Deployment

### Option 1: Self-Hosted (Recommended for MVP)

#### 1. Build the Server

```bash
# Build all packages
bun run build

# Or build server specifically
cd apps/server
bun run build
```

#### 2. Deploy to Server

```bash
# Copy files to server
scp -r dist/ user@server:/opt/social-bookmarks/
scp .env.production user@server:/opt/social-bookmarks/.env
scp package.json user@server:/opt/social-bookmarks/

# SSH into server
ssh user@server

# Install dependencies
cd /opt/social-bookmarks
bun install --production

# Start server
bun run start
```

#### 3. Process Manager (PM2)

```bash
# Install PM2
bun add -g pm2

# Start with PM2
pm2 start dist/index.js --name social-bookmarks-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 4. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

See `apps/server/Dockerfile` for configuration.

#### 2. Build and Run

```bash
# Build image
docker build -t social-bookmarks-api .

# Run container
docker run -d \
  --name social-bookmarks-api \
  -p 3000:3000 \
  --env-file .env.production \
  social-bookmarks-api
```

### Option 3: Cloud Platforms

- **Railway**: Connect GitHub repo, set environment variables
- **Fly.io**: Use `fly launch` and configure fly.toml
- **DigitalOcean App Platform**: Deploy from GitHub
- **AWS/GCP/Azure**: Use container services or VMs

## CI/CD Pipeline

### GitHub Actions Workflow

See `.github/workflows/deploy.yml` for automated deployment.

### Manual Deployment Steps

1. **Build**: `bun run build`
2. **Test**: `bun run test`
3. **Deploy Frontend**: `cd apps/web && bun run deploy`
4. **Deploy Backend**: Upload to server and restart

### Deployment Checklist

- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Build all packages
- [ ] Run tests
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify health endpoints
- [ ] Test authentication flow
- [ ] Monitor logs for errors

## Monitoring and Logging

### Application Monitoring

- **Logs**: Use PM2 logs or Docker logs
- **Uptime**: Use UptimeRobot or similar service
- **Performance**: Monitor response times and error rates

### Database Monitoring

- **Neon Console**: Built-in metrics and query performance
- **Connection Pool**: Monitor active connections
- **Storage**: Track database size growth

### Error Tracking

Consider integrating:

- Sentry for error tracking
- LogRocket for session replay
- Datadog or New Relic for APM

## Security Considerations

### Production Checklist

- [ ] Use strong `BETTER_AUTH_SECRET` (min 32 characters)
- [ ] Enable HTTPS for all endpoints
- [ ] Set secure CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Set up rate limiting
- [ ] Configure CSP headers
- [ ] Regular security updates

### SSL/TLS

- Frontend: Automatic via Cloudflare Pages
- Backend: Use Let's Encrypt with Nginx or Caddy

## Rollback Procedure

### Frontend Rollback

```bash
# Alchemy maintains deployment history
# Rollback via Cloudflare Pages dashboard
```

### Backend Rollback

```bash
# With PM2
pm2 stop social-bookmarks-api
# Deploy previous version
pm2 start dist/index.js --name social-bookmarks-api
```

### Database Rollback

```bash
# Use Neon point-in-time recovery
# Or restore from backup via Neon Console
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check DATABASE_URL format
   - Verify Neon database is running
   - Check connection pool limits

2. **CORS Errors**

   - Verify CORS_ORIGIN matches frontend URL
   - Check protocol (http vs https)

3. **Authentication Failures**

   - Verify OAuth credentials
   - Check BETTER_AUTH_URL is correct
   - Ensure BETTER_AUTH_SECRET is set

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify all dependencies are installed

## Support

For deployment issues:

- Check logs: `pm2 logs` or `docker logs`
- Review Neon Console for database issues
- Check Cloudflare Pages build logs
