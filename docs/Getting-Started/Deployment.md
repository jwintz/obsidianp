---
description: Deploy your ObsidianP site to GitHub Pages, Netlify, Vercel, and other hosting platforms
tags:
  - deployment
  - hosting
  - github-pages
  - netlify
  - vercel
  - cdn
  - devops
type: guide
category: getting-started
audience: all
difficulty: intermediate
estimated_time: 25 minutes
last_updated: 2025-10-17
prerequisites:
  - Building Sites
  - Configuration
---

# Deployment

Deploy your ObsidianP-generated site to various hosting platforms.

## GitHub Pages

### Automatic Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build site
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Configuration

Update `obsidianp.config.jsonc`:

```jsonc
{
  "baseUrl": "/repository-name/",  // Your GitHub repo name
  "outputPath": "./dist"
}
```

### Enable GitHub Pages

1. Go to repository Settings
2. Navigate to Pages
3. Select "gh-pages" branch
4. Save

## Netlify

### Deploy with Drag & Drop

1. Build locally: `npm run build`
2. Go to [Netlify](https://app.netlify.com)
3. Drag `dist` folder to deploy

### Deploy with Git

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

# Netlify redirects configuration
# [[redirects]] is TOML array syntax, not a wiki link
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Connect your repository:
1. New site from Git
2. Select repository
3. Deploy!

### Configuration

```jsonc
{
  "baseUrl": "/",
  "outputPath": "./dist"
}
```

## Vercel

### Deploy with CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy with Git

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

Connect repository via Vercel dashboard.

## Cloudflare Pages

### Deploy via Dashboard

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect Git repository
3. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`
4. Deploy

### Deploy with Wrangler

```bash
# Install Wrangler
npm install -g wrangler

# Deploy
wrangler pages publish dist
```

### Configuration

Create `wrangler.toml`:

```toml
name = "my-knowledge-base"
compatibility_date = "2025-01-01"

[site]
  bucket = "./dist"
```

## Custom Server

### Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/obsidianp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Apache

Create `.htaccess` in `dist`:

```apache
# Rewrite rules
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

# Cache static assets
<FilesMatch "\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

# Enable gzip
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

### Docker

Create `Dockerfile`:

```dockerfile
FROM nginx:alpine

# Copy built site
COPY dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t obsidianp-site .
docker run -p 8080:80 obsidianp-site
```

## Custom Domain

### DNS Configuration

Add DNS records:

```
Type    Name    Value
A       @       192.0.2.1
CNAME   www     yourusername.github.io.
```

### HTTPS Configuration

#### GitHub Pages

Create `CNAME` file in `dist`:

```
yourdomain.com
```

Enable HTTPS in repository settings.

#### Netlify/Vercel

1. Add custom domain in dashboard
2. Update DNS records as instructed
3. HTTPS enabled automatically

## Performance Optimization

### Pre-Build Optimization

```jsonc
{
  "optimization": {
    "minifyHTML": true,
    "minifyCSS": true,
    "minifyJS": true,
    "optimizeImages": true,
    "generateSitemap": true
  }
}
```

### CDN Integration

Use CDN for assets:

```html
<!-- Use CDN for libraries -->
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
```

### Service Worker

Add offline support with `sw.js`:

```javascript
const CACHE_NAME = 'obsidianp-v1';
const urlsToCache = [
  '/',
  '/assets/main.css',
  '/assets/app.js',
  '/assets/graph.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

## SEO Configuration

### Meta Tags

Ensure templates include:

```html
<meta name="description" content="{{ siteDescription }}">
<meta property="og:title" content="{{ pageTitle }}">
<meta property="og:description" content="{{ pageDescription }}">
<meta property="og:type" content="website">
<meta property="og:url" content="{{ pageUrl }}">
<meta name="twitter:card" content="summary">
```

### Sitemap

Generated automatically in `dist/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- More URLs -->
</urlset>
```

### Robots.txt

Create in `dist`:

```
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml
```

## Monitoring

### Analytics Integration

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### Error Tracking

```html
<!-- Sentry -->
<script src="https://browser.sentry-cdn.com/sdk.min.js"></script>
<script>
  Sentry.init({ dsn: 'YOUR_DSN' });
</script>
```

---

Read Next: [[../Features/Interactive Graph Views|Interactive Graph Views]] > [[../Architecture/Core Components|Core Components]]
