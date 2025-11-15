# Production Setup Guide

Quick reference for setting up the Social Bookmarks Manager in production.

## 📋 Prerequisites

- [ ] Neon PostgreSQL account
- [ ] Cloudflare account (for Pages)
- [ ] Twitter Developer account (OAuth app)
- [ ] LinkedIn Developer account (OAuth app)
- [ ] Resend account (for emails)
- [ ] Production server (for backend) or Docker environment

## 🚀 Quick Start

### 1. Database Setup (5 minutes)

```bash
# Create Neon database at https://console.neon.tech
# Copy connection string

export DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
bun run deploy:db
```

### 2. Configure Environment Variables

**Frontend** (`apps/web/.env.production`):

```bash
VITE_SERVER_URL=https://api.yourdomain.com
ALCHEMY_PASSWORD=your-secure-password
```

**Backend** (`apps/server/.env.production`):

```bash
BETTER_AUTH_SECRET=generate-32-char-secret
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
TWITTER_CLIENT_ID=your-twitter-id
TWITTER_CLIENT_SECRET=your-twitter-secret
LINKEDIN_CLIENT_ID=your-linkedin-id
LINKEDIN_CLIENT_SECRET=your-linkedin-secret
RESEND_API_KEY=your-resend-key
EMAIL_FROM=Social Bookmarks <noreply@yourdomain.com>
DATABASE_URL=your-neon-connection-string
NODE_ENV=production
```

### 3. Deploy Backend

**Option A: Manual Deployment**

```bash
bun run deploy:backend api.yourdomain.com deploy-user
```

**Option B: Docker**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Deploy Frontend

```bash
export VITE_SERVER_URL=https://api.yourdomain.com
export ALCHEMY_PASSWORD=your-password
bun run deploy:frontend
```

### 5. Verify Deployment

```bash
bun run deploy:health https://api.yourdomain.com https://yourdomain.com
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[MONITORING.md](./MONITORING.md)** - Monitoring and observability
- **[scripts/deployment/README.md](./scripts/deployment/README.md)** - Deployment scripts

## 🔧 Configuration Files

- `apps/web/.env.production.example` - Frontend environment template
- `apps/server/.env.production.example` - Backend environment template
- `nginx.conf.example` - Nginx reverse proxy configuration
- `ecosystem.config.js` - PM2 process manager configuration
- `docker-compose.prod.yml` - Docker production setup
- `.github/workflows/deploy.yml` - CI/CD pipeline

## 🛠️ Deployment Scripts

Located in `scripts/deployment/`:

- `deploy-frontend.sh` - Deploy web app to Cloudflare Pages
- `deploy-backend.sh` - Deploy API to production server
- `setup-database.sh` - Initialize production database
- `health-check.sh` - Verify deployment health

## 🔐 Security Checklist

- [ ] Strong `BETTER_AUTH_SECRET` (min 32 characters)
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured
- [ ] Database SSL connections enabled
- [ ] OAuth redirect URIs configured
- [ ] Secrets not in version control
- [ ] Rate limiting configured

## 📊 Monitoring Setup

1. **Uptime Monitoring**: Configure UptimeRobot for `/health` endpoint
2. **Error Tracking**: Optional Sentry integration
3. **Database Monitoring**: Use Neon Console
4. **Logs**: PM2 logs or Docker logs

## 🆘 Support

- **Issues**: Check logs first (`pm2 logs` or `docker logs`)
- **Database**: Neon Console for metrics and queries
- **Frontend**: Cloudflare Pages dashboard for build logs
- **Rollback**: See DEPLOYMENT.md for rollback procedures

## 📞 Quick Commands

```bash
# Check server status
ssh user@server 'pm2 status'

# View logs
ssh user@server 'pm2 logs social-bookmarks-api'

# Restart server
ssh user@server 'pm2 restart social-bookmarks-api'

# Database console
bun run db:studio

# Health check
curl https://api.yourdomain.com/health
```

## 🎯 Next Steps

After deployment:

1. Test authentication flow (OAuth and magic link)
2. Create test bookmark via extension
3. Verify search and filtering
4. Set up monitoring alerts
5. Configure backups
6. Document any custom configurations

## 📝 Notes

- Keep environment variables secure
- Regular security updates
- Monitor costs (Neon, Cloudflare, Resend)
- Test rollback procedures
- Document incidents and solutions
