-- Create crawler schema
CREATE SCHEMA IF NOT EXISTS crawler;

-- Create twitter_crawl_checkpoint table
CREATE TABLE crawler.twitter_crawl_checkpoint (
    user_id VARCHAR(255) PRIMARY KEY,
    last_tweet_id VARCHAR(255) NOT NULL,
    last_crawled_at TIMESTAMP NOT NULL,
    bookmarks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_twitter_checkpoint_user ON crawler.twitter_crawl_checkpoint(user_id);

-- Create crawl_session table
CREATE TABLE crawler.crawl_session (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    bookmarks_processed INTEGER DEFAULT 0,
    direct_import BOOLEAN NOT NULL,
    enable_summarization BOOLEAN NOT NULL,
    output_file_path TEXT,
    error_message TEXT,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE
);

-- Create indexes for session lookups
CREATE INDEX idx_crawl_session_user ON crawler.crawl_session(user_id);
CREATE INDEX idx_crawl_session_status ON crawler.crawl_session(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION crawler.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for twitter_crawl_checkpoint
CREATE TRIGGER update_twitter_checkpoint_updated_at
    BEFORE UPDATE ON crawler.twitter_crawl_checkpoint
    FOR EACH ROW
    EXECUTE FUNCTION crawler.update_updated_at_column();
