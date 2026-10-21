-- Up Migration
-- A Song is identified by its title and artist, compared ignoring capitals and extra spaces. A blank artist
-- is its own value. The normalised columns are generated so the database enforces the rule, even for two
-- Members saving at the same moment.
CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  title_normalised text GENERATED ALWAYS AS (lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))) STORED,
  artist_normalised text GENERATED ALWAYS AS (lower(regexp_replace(btrim(artist), '\s+', ' ', 'g'))) STORED,
  musical_key text,
  tempo integer,
  time_signature text,
  -- { sections, order }: the chord sheet module's stored form (chords attached to lyric positions).
  content jsonb NOT NULL DEFAULT '{"sections": [], "order": []}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (title_normalised, artist_normalised)
);

-- Down Migration
DROP TABLE songs;
