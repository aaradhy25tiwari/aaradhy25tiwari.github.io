-- ============================================================
-- InfraQuip — PostGIS + tsvector + RLS Setup
-- Run this ONCE in Supabase SQL Editor after Alembic migration.
-- ============================================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Full-text search vector on machines table
--    Combines: title (high weight A), make+model (B), description (C)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE machines SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(make, '') || ' ' || coalesce(model, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_machines_search_vector
  ON machines USING gin(search_vector);

-- Auto-update trigger for tsvector
CREATE OR REPLACE FUNCTION update_machine_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.make, '') || ' ' || coalesce(NEW.model, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update ON machines;
CREATE TRIGGER tsvector_update
  BEFORE INSERT OR UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION update_machine_search_vector();

-- 3. PostGIS geography column for location-based search
SELECT AddGeometryColumn('machines', 'location', 4326, 'POINT', 2) WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='machines' AND column_name='location'
);

-- Index for geo queries
CREATE INDEX IF NOT EXISTS idx_machines_location ON machines USING gist(location);

-- Update existing rows with lat/lng
UPDATE machines
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Trigger to auto-update location from lat/lng
CREATE OR REPLACE FUNCTION update_machine_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS location_update ON machines;
CREATE TRIGGER location_update
  BEFORE INSERT OR UPDATE OF latitude, longitude ON machines
  FOR EACH ROW EXECUTE FUNCTION update_machine_location();


-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_images ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's UUID from our users table
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS uuid AS $$
  SELECT id FROM users WHERE auth_uid = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_role() RETURNS text AS $$
  SELECT role::text FROM users WHERE auth_uid = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── users ─────────────────────────────────────────────────────
CREATE POLICY "Users can view their own row" ON users
  FOR SELECT USING (auth_uid = auth.uid());

CREATE POLICY "Users can update their own row" ON users
  FOR UPDATE USING (auth_uid = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (auth_user_role() = 'admin');

CREATE POLICY "Service role bypass" ON users
  USING (auth.role() = 'service_role');

-- ── vendor_profiles ───────────────────────────────────────────
CREATE POLICY "Anyone can view vendor profiles" ON vendor_profiles
  FOR SELECT USING (true);

CREATE POLICY "Vendor can update own profile" ON vendor_profiles
  FOR UPDATE USING (user_id = auth_user_id());

-- ── machines ──────────────────────────────────────────────────
CREATE POLICY "Public can view approved machines" ON machines
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Vendors can view their own machines" ON machines
  FOR SELECT USING (vendor_id = auth_user_id());

CREATE POLICY "Vendors can insert machines" ON machines
  FOR INSERT WITH CHECK (vendor_id = auth_user_id() AND auth_user_role() = 'vendor');

CREATE POLICY "Vendors can update their own machines" ON machines
  FOR UPDATE USING (vendor_id = auth_user_id());

CREATE POLICY "Admins can view all machines" ON machines
  FOR SELECT USING (auth_user_role() = 'admin');

CREATE POLICY "Admins can update all machines" ON machines
  FOR UPDATE USING (auth_user_role() = 'admin');

-- ── machine_images ────────────────────────────────────────────
CREATE POLICY "Public can view images of approved machines" ON machine_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM machines WHERE machines.id = machine_images.machine_id AND machines.status = 'approved')
  );

CREATE POLICY "Vendors can manage their machine images" ON machine_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM machines WHERE machines.id = machine_images.machine_id AND machines.vendor_id = auth_user_id())
  );

-- ── enquiries ─────────────────────────────────────────────────
CREATE POLICY "Customer sees their enquiries" ON enquiries
  FOR SELECT USING (customer_id = auth_user_id());

CREATE POLICY "Vendor sees enquiries for their listings" ON enquiries
  FOR SELECT USING (vendor_id = auth_user_id());

CREATE POLICY "Customer can create enquiries" ON enquiries
  FOR INSERT WITH CHECK (customer_id = auth_user_id() AND auth_user_role() = 'customer');

CREATE POLICY "Admins can view all enquiries" ON enquiries
  FOR SELECT USING (auth_user_role() = 'admin');

-- ── enquiry_messages ──────────────────────────────────────────
CREATE POLICY "Parties can view messages for their enquiry" ON enquiry_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enquiries
      WHERE enquiries.id = enquiry_messages.enquiry_id
      AND (enquiries.customer_id = auth_user_id() OR enquiries.vendor_id = auth_user_id())
    )
  );

CREATE POLICY "Parties can send messages" ON enquiry_messages
  FOR INSERT WITH CHECK (sender_id = auth_user_id());

-- ── subscriptions ─────────────────────────────────────────────
CREATE POLICY "User sees own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (auth_user_role() = 'admin');

-- ── wishlists ─────────────────────────────────────────────────
CREATE POLICY "Customer sees own wishlist" ON wishlists
  FOR SELECT USING (customer_id = auth_user_id());

CREATE POLICY "Customer can add to wishlist" ON wishlists
  FOR INSERT WITH CHECK (customer_id = auth_user_id());

CREATE POLICY "Customer can remove from wishlist" ON wishlists
  FOR DELETE USING (customer_id = auth_user_id());

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "User sees own notifications" ON notifications
  FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "User can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth_user_id());

-- ── reviews ───────────────────────────────────────────────────
CREATE POLICY "Anyone can view approved reviews" ON reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Customer can write reviews" ON reviews
  FOR INSERT WITH CHECK (customer_id = auth_user_id() AND auth_user_role() = 'customer');


-- ============================================================
-- Supabase Storage Bucket Policies
-- Run in Supabase Storage section
-- ============================================================

-- Create bucket (also do this in Supabase UI):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('machine-images', 'machine-images', true);

CREATE POLICY "Public can view machine images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'machine-images');

CREATE POLICY "Authenticated vendors can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'machine-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Vendors can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'machine-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
