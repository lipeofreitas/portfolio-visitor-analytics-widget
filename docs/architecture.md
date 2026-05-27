# Architecture Notes

## Goal

Build a lightweight, reusable visitor counter for static portfolio pages while keeping the implementation privacy-friendly.

## First Target

The first target site is the GitHub Pages portfolio:

```text
https://felipefreitas-perspective.github.io
```

## Future Target

The same backend should be reusable for a future company website by separating traffic with a `site_id`, for example:

```text
portfolio
doublef
```

## Current Cloudflare Resources

```text
Worker: portfolio-visitor-analytics-api
D1:     portfolio_visitor_analytics
Binding: DB
```

## Privacy Direction

- Do not store raw IP addresses.
- Use a backend-generated salted hash for unique visit approximation.
- Store only aggregate-friendly fields such as site id, country code, page path, and timestamps.
- Keep the public widget minimal and business-facing.

## Visitor Identity Decision

The project will count one anonymous visitor per browser/device, not one exact human being.

On the first visit, the frontend widget should create a random local visitor id and store it in the browser. On each request, the backend should convert that id into a salted hash and store only the hash.

Recommended fields:

```text
site_id
visitor_hash
first_country
last_country
first_seen_at
last_seen_at
visit_count
```

Country reporting should use `first_country`. For example, if a visitor first opens the site in Brazil and later opens it from Japan using the same browser/device, the visitor remains one unique visitor. `last_country` may update to Japan, but the public top-country flags should still count Brazil.

This avoids inflating country counts when the same visitor travels while keeping the implementation anonymous and simple enough for a portfolio case study.

## API Shape

```text
GET /health
```

Returns a basic availability check.

```text
POST /track
```

Expected body:

```json
{
  "siteId": "portfolio",
  "visitorId": "anonymous-browser-generated-id",
  "path": "/"
}
```

The backend stores only a salted hash of `visitorId`.

```text
GET /summary?siteId=portfolio
```

Expected response:

```json
{
  "ok": true,
  "siteId": "portfolio",
  "uniqueVisits": 305,
  "countries": [
    { "country": "BR", "visits": 155 },
    { "country": "ES", "visits": 80 }
  ]
}
```
