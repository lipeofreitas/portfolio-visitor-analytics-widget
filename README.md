# Portfolio Visitor Analytics Widget

Privacy-friendly visitor analytics widget for static sites.

This project is planned as a small reusable analytics component for GitHub Pages and future company websites. The goal is to count anonymous visits and show a minimal public counter without storing raw IP addresses or personal data.

## Planned Scope

- Static frontend widget for portfolio pages.
- Serverless backend for anonymous visit tracking.
- Unique visit counter by site.
- Optional country-level aggregation for top visitor locations.
- No raw IP storage.
- One anonymous visitor record per browser/device when local storage is available.

## Proposed Architecture

```text
Static site
  -> Visitor widget
  -> Serverless API
  -> Lightweight database
```

## Repository Structure

```text
worker/   Serverless backend code.
widget/   Frontend widget script and styles.
docs/     Architecture notes and implementation decisions.
```

## Cloudflare Setup

This project uses Cloudflare Worker + D1.

Expected Cloudflare resources:

```text
Worker: portfolio-visitor-analytics-api
D1:     portfolio_visitor_analytics
Binding: DB
```

### 1. Configure Wrangler

Install dependencies inside the Worker folder:

```powershell
cd "D:\Felipe\PErsonal\Data\0. Projects\portfolio-visitor-analytics-widget\worker"
npm install
```

Login to Cloudflare:

```powershell
npx wrangler login
```

Find the D1 database id in Cloudflare:

```text
Cloudflare Dashboard > Storage & Databases > D1 SQL Database > portfolio_visitor_analytics
```

Then replace this value in `worker/wrangler.toml`:

```text
database_id = "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"
```

### 2. Create the D1 Tables

Run the schema against the remote D1 database:

```powershell
npm run db:migrate:remote
```

### 3. Set the Hash Salt Secret

The Worker needs a private salt to hash anonymous browser/device ids.

```powershell
npx wrangler secret put VISITOR_HASH_SALT
```

Use a long random value and do not commit it.

### 4. Deploy

```powershell
npm run deploy
```

After deploy, the Worker should expose:

```text
GET  /health
GET  /summary?siteId=portfolio
POST /track
```

## Privacy Notes

The intended implementation should avoid storing raw IP addresses. Unique visits can be estimated with a salted hash generated on the backend and stored only as an anonymized identifier.

## Unique Visitor Logic

The widget should create a random browser/device identifier on the first visit and store it locally in the browser. The backend should never store this raw identifier. Instead, it should save only a salted hash.

Country attribution should use the first detected country for public reporting. If the same browser/device visits again from another country, the unique visitor count should not increase. The backend may update `last_seen_at` and `last_country`, but the public country flags should continue using `first_country`.

This keeps the metric simple and privacy-friendly:

```text
Unique visits = distinct anonymous browser/device hashes
Top countries = first country detected for each unique visitor
```

## Frontend Usage

Add this placeholder where the counter should appear:

```html
<div data-visitor-widget></div>
```

Load the widget assets:

```html
<link rel="stylesheet" href="path/to/visitor-widget.css">
<script src="path/to/visitor-widget.js"></script>
```

Initialize the widget:

```html
<script>
  FFVisitorWidget.init({
    apiUrl: "https://portfolio-visitor-analytics-api.YOUR_SUBDOMAIN.workers.dev",
    siteId: "portfolio"
  });
</script>
```
