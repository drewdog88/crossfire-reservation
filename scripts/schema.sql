-- Crossfire Select Field Manager — schema (Neon Postgres)
-- Single source of truth. No fallback stores.

CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name    text,
  last_name     text,
  role          text NOT NULL DEFAULT 'coach' CHECK (role IN ('admin','coach')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id         serial PRIMARY KEY,
  gender     text NOT NULL CHECK (gender IN ('Boys','Girls')),
  birth_year int  NOT NULL,
  level      text NOT NULL,
  coach_name text
);

CREATE TABLE IF NOT EXISTS locations (
  id   serial PRIMARY KEY,
  name text NOT NULL,
  city text
);

CREATE TABLE IF NOT EXISTS fields (
  id          serial PRIMARY KEY,
  location_id int REFERENCES locations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  -- Surface is optional: NULL means unknown / not specified.
  type        text CHECK (type IN ('Turf','Grass'))
);

CREATE TABLE IF NOT EXISTS slots (
  id         serial PRIMARY KEY,
  field_id   int  REFERENCES fields(id) ON DELETE CASCADE,
  date       date NOT NULL,
  start_time text NOT NULL,
  end_time   text NOT NULL,
  max_teams  int  NOT NULL DEFAULT 8,
  UNIQUE (field_id, date, start_time)
);

CREATE TABLE IF NOT EXISTS reservations (
  id         serial PRIMARY KEY,
  slot_id    int REFERENCES slots(id) ON DELETE CASCADE,
  team_id    int REFERENCES teams(id) ON DELETE CASCADE,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id, team_id)
);

CREATE TABLE IF NOT EXISTS user_teams (
  user_id int REFERENCES users(id) ON DELETE CASCADE,
  team_id int REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);
