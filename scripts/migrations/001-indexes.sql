-- Migration 001: performance indexes for the fixed query patterns in api/*.js
--
-- Idempotent (IF NOT EXISTS) and safe to run repeatedly. These back the exact
-- lookups the app already performs; they are a no-op at today's small row counts
-- but prevent a sequential-scan cliff as slots/reservations accumulate over
-- seasons. If a new query shape is added to api/, add its index here in the
-- same change.
--
-- Not indexed on purpose:
--   * reservations(slot_id, team_id)  -> already covered by the UNIQUE constraint
--   * slots(field_id, date, start_time) -> already covered by the UNIQUE constraint
--   * users(email)                    -> already covered by the UNIQUE constraint
--   * *_pkey lookups                  -> covered by primary keys

-- Fairness week-check: SELECT ... FROM reservations WHERE team_id = $1  (reservations.js)
CREATE INDEX IF NOT EXISTS idx_reservations_team_id ON reservations (team_id);

-- Week view / date-scoped reads: WHERE s.date BETWEEN monday AND sunday  (reservations.js, future bootstrap)
CREATE INDEX IF NOT EXISTS idx_slots_date ON slots (date);

-- Field -> slots join and cascade paths (bootstrap ORDER BY, admin field edits)
CREATE INDEX IF NOT EXISTS idx_slots_field_id ON slots (field_id);

-- Location -> fields join / cascade
CREATE INDEX IF NOT EXISTS idx_fields_location_id ON fields (location_id);

-- getUserTeamIds(userId): SELECT team_id FROM user_teams WHERE user_id = $1  (auth.js)
-- The PK is (user_id, team_id) so user_id is already the leading column and this
-- is technically redundant; created explicitly for clarity and to survive any
-- future PK reordering.
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams (user_id);
