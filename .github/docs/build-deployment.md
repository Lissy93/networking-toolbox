# Build & Deployment Guide

This guide covers building and deploying the networking toolbox across different platforms and environments. The app uses an intelligent adapter selection system to automatically configure builds for various deployment targets.

## Build System Overview

The application uses SvelteKit with Vite for building and bundling. The build system automatically detects the deployment environment and selects the appropriate adapter.

### Supported Deployment Targets

| Platform | Adapter | Auto-Detection | Manual Override |
|----------|---------|---------------|-----------------|
| **Vercel** | `@sveltejs/adapter-vercel` | `VERCEL` env var | `DEPLOY_ENV=vercel` |
| **Netlify** | `@sveltejs/adapter-netlify` | `NETLIFY` env var | `DEPLOY_ENV=netlify` |
| **Node.js** | `@sveltejs/adapter-node` | `PORT` or `HOST` env vars | `DEPLOY_ENV=node` |
| **Docker** | `@sveltejs/adapter-node` | Container detection | `DEPLOY_ENV=docker` |
| **Static** | `@sveltejs/adapter-static` | CI with `BUILD_STATIC=true` | `DEPLOY_ENV=static` |
| **Auto** | `@sveltejs/adapter-auto` | Fallback | `DEPLOY_ENV=auto` |

## Build Commands

### Development

```bash
# Start development server
npm run dev

# Development with network access
npm run dev -- --host

# Development on custom port
npm run dev -- --port 3000
```

### Production Builds

```bash
# Standard build (auto-detects deployment target)
npm run build

# Specific deployment targets
DEPLOY_ENV=node npm run build      # Node.js server
DEPLOY_ENV=static npm run build    # Static site
DEPLOY_ENV=vercel npm run build    # Vercel platform
DEPLOY_ENV=netlify npm run build   # Netlify platform

# Preview production build
npm run preview
```

### Quality Checks

```bash
# Run all quality checks
npm run check          # TypeScript & Svelte check
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests

# Build verification
npm run build-check    # Build without minification for debugging
```

## Configuration Files

### SvelteKit Configuration

The [`svelte.config.js`](https://github.com/Lissy93/networking-toolbox/blob/main/svelte.config.js) file handles intelligent adapter selection:

```javascript
function getAdapter() {
  // Manual override via DEPLOY_ENV
  const deployEnv = process.env.DEPLOY_ENV?.toLowerCase();
  if (deployEnv) {
    switch (deployEnv) {
      case 'vercel': return adapterVercel();
      case 'node': case 'docker': return adapterNode();
      case 'netlify': return adapterNetlify();
      case 'static': return adapterStatic({ fallback: '404.html' });
      default: return adapterAuto();
    }
  }

  // Auto-detection logic
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  const isNetlify = !!(process.env.NETLIFY || process.env.NETLIFY_SITE_ID);
  // ... additional detection logic

  return adapterAuto(); // Fallback
}
```

### Base Path Support

The app supports deployment on subpaths:

```javascript
// svelte.config.js
kit: {
  paths: {
    base: process.env.BASE_URL || process.env.BASE_PATH || '',
  }
}
```

Deploy on subpath using:

```bash
BASE_PATH=/networking-tools npm run build
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DEPLOY_ENV` | Force specific adapter | `vercel`, `node`, `static` |
| `BASE_PATH` | Deploy on subpath | `/tools`, `/networking` |
| `NODE_ENV` | Environment mode | `development`, `production` |
| `PORT` | Server port (Node.js) | `3000`, `8080` |
| `HOST` | Server host (Node.js) | `0.0.0.0`, `localhost` |

## Deployment Guides

### Vercel Deployment

Vercel deployment is automatic with zero configuration:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect your GitHub repo to Vercel for auto-deployment
```

The adapter automatically configures:
- **Serverless functions** for API routes
- **Static asset optimization**
- **Edge functions** for dynamic content

### Netlify Deployment

Deploy to Netlify with automatic detection:

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
netlify deploy --prod
```

Build settings for Netlify:
- **Build command**: `npm run build`
- **Publish directory**: `build`
- **Functions directory**: `netlify/functions` (auto-generated)

### Node.js Server Deployment

Build for Node.js server deployment:

```bash
# Build with Node adapter
DEPLOY_ENV=node npm run build

# Start production server
node build

# Or with environment variables
PORT=3000 HOST=0.0.0.0 node build
```

The Node adapter creates:
- **`build/index.js`** - Server entry point
- **`build/handler.js`** - Request handler
- **Static assets** in build directory

### Docker Deployment

The [`Dockerfile`](https://github.com/Lissy93/networking-toolbox/blob/main/Dockerfile) uses a multi-stage build for optimized containers:

```dockerfile
# Multi-stage build process
FROM node:22-alpine AS deps
# Install production dependencies

FROM node:22-alpine AS builder
# Build application

FROM node:22-alpine AS runner
# Runtime container with minimal footprint
```

#### Docker Build & Run

```bash
# Build image
docker build -t networking-toolbox .

# Run container
docker run -p 3000:3000 networking-toolbox

# Or with environment variables
docker run -p 8080:3000 -e PORT=8080 networking-toolbox
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### Static Site Deployment

Generate a static site for hosting on CDNs:

```bash
# Build static site
DEPLOY_ENV=static npm run build

# Output goes to 'build' directory
# Deploy build/ to any static host
```

Static deployment options:
- **GitHub Pages** - Commit build directory to gh-pages branch
- **CloudFlare Pages** - Connect repository for auto-deployment
- **AWS S3** - Upload build directory to S3 bucket
- **CDN** - Serve build directory from any CDN

### Self-Hosting

For self-hosting on your own infrastructure:

#### Systemd Service (Linux)

```ini
# /etc/systemd/system/networking-toolbox.service
[Unit]
Description=Networking Toolbox
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/networking-toolbox
ExecStart=/usr/bin/node build
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable networking-toolbox
sudo systemctl start networking-toolbox
```

#### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/networking-toolbox
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Performance Optimization

### Build Optimization

The build process includes several optimizations:

```bash
# Production build with optimizations
npm run build

# Generated optimizations include:
# - Code splitting by route
# - Asset minification and compression
# - Tree shaking of unused code
# - CSS purging and optimization
# - Image optimization
```

### Bundle Analysis

Analyze bundle size and composition:

```bash
# Build with analysis
npm run build

# Check build output
ls -la build/

# Analyze with tools like bundle-analyzer
npx vite-bundle-analyzer build
```

### Service Worker

The app includes a service worker for offline functionality:

```typescript
// Service worker automatically:
// - Caches static assets
// - Implements offline-first strategy
// - Updates cache on new deployments
// - Provides offline page fallbacks
```

## Health Checks

The application includes health check endpoints:

### Basic Health Check

```typescript
// src/routes/health/+server.ts
export async function GET() {
  return new Response('OK', { status: 200 });
}
```

### Detailed Health Check

```bash
# Check application health
curl http://localhost:3000/health

# Response: 200 OK
```

## Troubleshooting

### Common Build Issues

<details>
<summary><strong>Build fails with "Cannot resolve module"</strong></summary>

Check for missing dependencies:
```bash
npm install
npm run build
```

</details>

<details>
<summary><strong>Wrong adapter selected</strong></summary>

Override with explicit environment variable:
```bash
DEPLOY_ENV=node npm run build
```

</details>

<details>
<summary><strong>Static assets not loading</strong></summary>

Check base path configuration:
```bash
BASE_PATH=/your-subpath npm run build
```

</details>

### Docker Issues

```bash
# Check container logs
docker logs <container-id>

# Debug inside container
docker exec -it <container-id> sh

# Verify health check
docker inspect <container-id> | grep Health
```

### Performance Issues

Monitor resource usage and optimize:

```bash
# Check bundle size
npm run build
du -sh build/

# Analyze runtime performance
NODE_ENV=production node --inspect build

# Monitor memory usage
docker stats <container-id>
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build
      - run: npm test

      # Deploy to your preferred platform
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

The build system handles over 100 tool pages efficiently through code splitting and intelligent caching strategies. Each tool is built as a separate chunk, allowing for optimal loading performance.

## Security Considerations

### Production Hardening

- **Content Security Policy** - Implemented in app.html
- **HTTPS Only** - Configure at reverse proxy level
- **Environment Variables** - Never commit secrets
- **Docker Security** - Runs as non-root user
- **Health Checks** - Monitor application status

### Secrets Management

```bash
# Never commit these to git
VERCEL_TOKEN=<token>
NETLIFY_AUTH_TOKEN=<token>
DATABASE_URL=<connection-string>

# Use environment-specific .env files
# .env.production (never commit)
# .env.local (gitignored)
```

This comprehensive build system ensures the networking toolbox can be deployed reliably across any platform while maintaining optimal performance and security.
