-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column for full-text search (auto-generated from summary)
ALTER TABLE bookmark_enrichment 
  ADD COLUMN summary_vector tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(summary, ''))) STORED;

-- Create GIN index for full-text search on tsvector
CREATE INDEX bookmark_enrichment_summary_vector_idx 
  ON bookmark_enrichment USING gin (summary_vector);

-- Create GIN index for fuzzy trigram matching on summary
CREATE INDEX bookmark_enrichment_summary_trgm_idx 
  ON bookmark_enrichment USING gin (summary gin_trgm_ops);
