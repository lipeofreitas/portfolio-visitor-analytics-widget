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
