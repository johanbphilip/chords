-- Up Migration
-- One-time links that let an approved person choose a display name and password. Only a hash of the token is
-- stored, so a copy of the database cannot be used to join.
CREATE TABLE invites (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invites_email_idx ON invites (email);

-- Down Migration
DROP TABLE invites;
