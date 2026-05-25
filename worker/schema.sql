CREATE TABLE IF NOT EXISTS visitors (
    site_id TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    first_country TEXT NOT NULL DEFAULT 'XX',
    last_country TEXT NOT NULL DEFAULT 'XX',
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (site_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_visitors_site_first_country
ON visitors (site_id, first_country);

CREATE INDEX IF NOT EXISTS idx_visitors_site_last_seen
ON visitors (site_id, last_seen_at);
