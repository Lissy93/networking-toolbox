# Build & Deployment Guide

This guide covers building and deploying the networking toolbox across different platforms and environments.

The app uses an intelligent adapter selection system to automatically configure and optimize the build for various platforms and deployment targets. This can be overridden, by setting the `DEPLOY_ENV` environmental variable to a specific target. Supported options are: `vercel`, `netlify`, `node`, `docker`, `static` or `auto` (default).

#### Option 1 - Docker
Run `docker run -p 3000:3000 lissy93/networking-toolbox`<br>
Or, use our example [`docker-compose.yml`](https://github.com/Lissy93/networking-toolbox/blob/main/docker-compose.yml)

#### Option 2 - Cloud
Fork the repo, and import into Vercel, Netlify or any static hosting provider of your choice.

#### Option 3 - Source: Node
Follow the dev steps below.
Then run `npm run build:node` to compile output.<br>
You can then start the server with `node build`.

#### Option 4 - GitHub Pages
Fork the repo.<br>
Head to the Actions tab, find the "Deploy to GitHub Pages" workflow, and trigger it.<br>
Then go to Settings > Pages > Source and select the `gh-pages` branch.<br>
Visit `https://<your-username>.github.io/networking-toolbox/` to see your deployed app.

#### Option 5 - Source: Static
Follow the dev steps below.
Then run `npm run build:static` to compile output.<br>
And upload the contents of `./build` to any web server, CDN or static host.

#### Option 6 - Source: Docker
Follow the dev steps below.
Then run `docker build -t networking-toolbox .` to build the image.<br>
You can then start the container with `docker run -p 3000:3000 networking-toolbox`.

#### Option 7 - Source: Other Platforms
You can build the app from source for a variety of platforms. This is done via SvelteKit adapters.<br>
First, follow the dev steps below.
Then, simply set the `DEPLOY_ENV` environmental variable, to one of `vercel`, `node`, `docker`, `netlify`, `static` or just `auto`, and build the app<br>
For example: `DEPLOY_ENV='node' npm run build`


---

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DEPLOY_ENV` | Force specific adapter | `vercel`, `node`, `static` |
| `BASE_PATH` | Deploy on subpath | `/tools`, `/networking` |
| `NODE_ENV` | Environment mode | `development`, `production` |
| `PORT` | Server port (Node.js) | `3000`, `8080` |
| `HOST` | Server host (Node.js) | `0.0.0.0`, `localhost` |
| `NTB_[...]` | App-specific configs | See [App Customization](https://github.com/Lissy93/networking-toolbox/edit/main/.github/docs/app-customization.md) docs |

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



### Self-Hosting Options

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
```

Generated optimizations include:
- Code splitting by route
- Asset minification and compression
- Tree shaking of unused code
- CSS purging and optimization
- Image optimization

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
- Caches static assets
- Implements offline-first strategy
- Updates cache on new deployments
- Provides offline page fallbacks

## Health Checks

The application includes health check endpoints:

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

# Use environment-specific .env files, and never commit to git
```
