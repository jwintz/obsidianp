---
description: Deploy your Obsidian:P site to GitHub Pages, and other hosting platforms
tags:
  - deployment
  - hosting
  - github-pages
  - gitlab-pages
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

Deploy your Obsidian:P-generated site to GitHub Pages or GitLab Pages.

## GitHub Pages

### Automatic Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Obsidian:P
        run: npm run build
      
      - name: Generate site
        run: |
          # For root domain: yourname.github.io
          node dist/cli.js generate ./vault ./site
          
          # For project pages: yourname.github.io/repo-name
          # node dist/cli.js generate ./vault ./site --base-path "/repo-name"
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./site

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Under "Source", select **GitHub Actions**
3. Push the workflow file to trigger deployment
4. Your site will be available at:
   - User/org site: `https://yourname.github.io`
   - Project site: `https://yourname.github.io/repo-name`

### Configuration for Base Path

For project pages (repos other than `username.github.io`), configure the base path:

```jsonc
{
  "title": "My Knowledge Base",
  "basePath": "/repo-name"  // Must match your repository name
}
```

Or use the CLI flag:
```bash
node dist/cli.js generate ./vault ./site --base-path "/repo-name"
```

## GitLab Pages

### Automatic Deployment with GitLab CI/CD

Create `.gitlab-ci.yml`:

```yaml
image: node:20

pages:
  stage: deploy
  cache:
    paths:
      - node_modules/
  script:
    # Install dependencies
    - npm ci
    
    # Build Obsidian:P
    - npm run build
    
    # Generate site
    # For root domain: yourname.gitlab.io
    - node dist/cli.js generate ./vault ./public
    
    # For project pages: yourname.gitlab.io/repo-name
    # - node dist/cli.js generate ./vault ./public --base-path "/repo-name"
  
  artifacts:
    paths:
      - public
  
  only:
    - main
```

### Enable GitLab Pages

1. Commit and push `.gitlab-ci.yml` to your repository
2. Go to **Settings** → **Pages**
3. The pipeline will automatically run
4. Your site will be available at:
   - User/group site: `https://yourname.gitlab.io`
   - Project site: `https://yourname.gitlab.io/repo-name`

### Configuration for Base Path

For project pages, configure the base path:

```jsonc
{
  "title": "My Knowledge Base",
  "basePath": "/repo-name"  // Must match your repository name
}
```

Or use the CLI flag:
```bash
node dist/cli.js generate ./vault ./public --base-path "/repo-name"
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

1. Create `CNAME` file in your vault root (will be copied to output):
   ```
   yourdomain.com
   ```

2. Add DNS records:
   - For apex domain: `A` records to GitHub Pages IPs
   - For www: `CNAME` record to `yourname.github.io`

3. Enable "Enforce HTTPS" in repository Settings → Pages

#### GitLab Pages

1. Go to **Settings** → **Pages**
2. Add your custom domain
3. Configure DNS records as instructed
4. HTTPS certificate is automatically provisioned via Let's Encrypt

## Performance Optimization

### Static Assets

The generated site includes optimized assets:
- Minified JavaScript libraries (D3.js, Mermaid.js, ABCJS)
- Optimized CSS with theme variables
- Web fonts (WOFF2 format for modern browsers)

### Caching

Configure caching headers on your server for better performance.
### Caching

Configure caching headers on your server for better performance.

## Generated Files

The site generator creates:
- **sitemap.xml** - Basic XML sitemap for search engines  
- **.nojekyll** - Marker file for GitHub Pages (bypasses Jekyll processing)
- **HTML files** - One per note and base file
- **data/notes.json** - Search data
- **assets/** - CSS, JavaScript, fonts, libraries

---

Read Next: [[../Architecture/Core Components|Core Components]]
