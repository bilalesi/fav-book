# Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## Pre-Deployment

### 1. Environment Setup

- [ ] Create Neon production database
- [ ] Copy connection string from Neon Console
- [ ] Set up OAuth apps (Twitter, LinkedIn)
- [ ] Create Resend account and get API key
- [ ] Generate secure `BETTER_AUTH_SECRET` (min 32 chars)

### 2. Configuration Files

- [ ] Copy `apps/web/.env.production.example` to `apps/web/.env.production`
- [ ] Copy `apps/server/.env.production.example` to `apps/server/.env.production`
- [ ] Fill in all required environment variables
- [ ] Verify CORS_ORIGIN matches frontend URL
- [ ] Verify BETTER_AUTH_URL matches backend URL

### 3. Database Setup

- [ ] Run `export DATABASE_URL="your-neon-connection-string"`
- [ ] Run `bun run db:generate`
- [ ] Run `bun run db:push`
- [ ] Verify schema in Prisma Studio
- [ ] Enable connection pooling in Neon Console
- [ ] Configure automatic backups

### 4. Code Quality

- [ ] Run `bun run check` (linting)
- [ ] Run `bun run check-types` (type checking)
- [ ] Run tests: `cd packages/api && bun run test`
- [ ] Review and commit all changes
- [ ] Tag release version

## Deployment

### 5. Backend Deployment

Choose one method:

#### Option A: Manual Deployment

- [ ] Run `bun run build`
- [ ] Run `./scripts/deployment/deploy-backend.sh [host] [user]`
- [ ] Verify deployment with health check

#### Option B: Docker Deployment

- [ ] Build image: `docker build -f apps/server/Dockerfile -t social-bookmarks-api .`
- [ ] Run container with production env file
- [ ] Verify container is running

#### Option C: GitHub Actions

- [ ] Push to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Manually trigger backend deployment if needed

### 6. Frontend Deployment

- [ ] Set environment variables:
  ```bash
  export VITE_SERVER_URL=https://api.yourdomain.com
  export ALCHEMY_PASSWORD=your-password
  ```
- [ ] Run `./scripts/deployment/deploy-frontend.sh`
- [ ] Or run `cd apps/web && bun run deploy`
- [ ] Note the Cloudflare Pages URL

### 7. DNS Configuration (if using custom domain)

- [ ] Add custom domain in Cloudflare Pages
- [ ] Update DNS records as instructed
- [ ] Wait for SSL certificate provisioning
- [ ] Verify HTTPS is working

## Post-Deployment

### 8. Verification

- [ ] Run health check: `./scripts/deployment/health-check.sh [api-url] [web-url]`
- [ ] Test authentication flow (OAuth and magic link)
- [ ] Create a test bookmark via extension
- [ ] Test search functionality
- [ ] Test collection management
- [ ] Verify all pages load correctly

### 9. Monitoring Setup

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (Sentry, optional)
- [ ] Set up log aggregation
- [ ] Monitor Neon database metrics
- [ ] Set up alerts for critical errors

### 10. Documentation

- [ ] Update README with production URLs
- [ ] Document any deployment-specific configurations
- [ ] Share credentials securely with team
- [ ] Update API documentation if needed

## Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] Strong `BETTER_AUTH_SECRET` set
- [ ] CORS properly configured
- [ ] Database SSL connections enabled
- [ ] OAuth redirect URIs configured correctly
- [ ] Rate limiting enabled (if applicable)
- [ ] Secrets not committed to git
- [ ] Production environment variables secured

## Rollback Plan

If issues occur:

1. **Frontend**: Rollback via Cloudflare Pages dashboard
2. **Backend**:
   - SSH into server
   - Run `pm2 stop social-bookmarks-api`
   - Deploy previous version
   - Run `pm2 start dist/index.js --name social-bookmarks-api`
3. **Database**: Use Neon point-in-time recovery if needed

## Support Contacts

- **Neon Support**: https://neon.tech/docs/introduction
- **Cloudflare Support**: https://developers.cloudflare.com/pages/
- **Alchemy Docs**: https://alchemy.run/docs

## Notes

- Keep this checklist updated with each deployment
- Document any issues encountered and solutions
- Review and improve the deployment process regularly
