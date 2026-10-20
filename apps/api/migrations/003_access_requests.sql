-- Up Migration
-- People who asked for access and are waiting for an Admin to approve or decline.
CREATE TABLE access_requests (
  email text PRIMARY KEY,
  name text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE access_requests;
