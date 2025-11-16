# my-better-t-app

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Elysia, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Elysia** - Type-safe, high-performance framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Prisma.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Generate the Prisma client and push the schema:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Deployment

### Quick Deployment

```bash
# Deploy frontend to Cloudflare Pages
bun run deploy:frontend

# Deploy backend to production server
bun run deploy:backend

# Setup production database
bun run deploy:db

# Health check
bun run deploy:health
```

### Documentation

#### User Documentation

- **[USER_GUIDE.md](./docs/USER_GUIDE.md)** - Complete user guide
- **[BOOKMARK_FILTERING.md](./docs/BOOKMARK_FILTERING.md)** - Advanced filtering and view modes
- **[URL_IMPORT_GUIDE.md](./docs/URL_IMPORT_GUIDE.md)** - URL bookmarking guide
- **[FAQ.md](./docs/FAQ.md)** - Frequently asked questions

#### Developer Documentation

- **[DEVELOPER_GUIDE_FILTERING.md](./docs/DEVELOPER_GUIDE_FILTERING.md)** - Filtering system architecture and API
- **[API.md](./docs/API.md)** - API reference

#### Deployment Documentation

- **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** - Quick start guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[MONITORING.md](./MONITORING.md)** - Monitoring and observability

### Deployment Options

- **Frontend**: Cloudflare Pages via Alchemy
- **Backend**: Self-hosted, Docker, or cloud platforms
- **Database**: Neon PostgreSQL (managed)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
my-better-t-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API (Elysia, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting

TRIGGER_PROJECT_ID=proj_crlbzttstobxcsaezyjf npx trigger.dev@latest dev -a http://localhost:8030 -c ../../packages/trigger/trigger.config.ts --env-file .env
