-- 001_init: users, resume versions, applications.
-- Job postings, extracted skills and import jobs come in a later migration,
-- once the import pipeline is designed (late December). We don't design tables
-- for features we haven't built yet; that's what migrations are for.

-- citext = case-insensitive text, so "Ana@UBC.ca" and "ana@ubc.ca" are the same email.
CREATE EXTENSION IF NOT EXISTS citext;

-- Shared trigger function: keeps updated_at correct even if a query forgets to set it.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext NOT NULL UNIQUE,
  display_name text,
  -- Nullable for now; filled in when auth lands in Week 2 (e.g. Google's "sub" claim).
  google_sub   text UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_versions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      text NOT NULL CHECK (length(trim(label)) > 0),   -- e.g. "Data eng v3"
  -- Normalised, lower-case skill names, e.g. {python,sql,airflow}. An array is
  -- enough for matching against a posting; revisit if skills need their own metadata.
  skills     text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, label),
  -- Lets applications use a composite FK that guarantees the resume belongs to the same user.
  UNIQUE (user_id, id)
);

CREATE TABLE applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company           text NOT NULL CHECK (length(trim(company)) > 0),
  role_title        text NOT NULL CHECK (length(trim(role_title)) > 0),
  -- text + CHECK instead of a Postgres ENUM: adding/renaming a status later is a
  -- one-line migration, whereas ENUM values are awkward to remove or rename.
  status            text NOT NULL DEFAULT 'saved'
                    CHECK (status IN ('saved', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  -- A date, not a timestamp: postings say "apply by Jan 15", rarely a time of day.
  deadline          date,
  applied_on        date,
  resume_version_id uuid,
  posting_url       text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Composite FK: the resume must exist AND belong to this same user.
  -- MATCH SIMPLE (the default) means the check is skipped when resume_version_id is NULL.
  FOREIGN KEY (user_id, resume_version_id)
    REFERENCES resume_versions (user_id, id) ON DELETE SET NULL (resume_version_id)
);

-- The main list view is "my applications, soonest deadline first".
CREATE INDEX applications_user_deadline_idx ON applications (user_id, deadline);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER resume_versions_updated_at BEFORE UPDATE ON resume_versions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
