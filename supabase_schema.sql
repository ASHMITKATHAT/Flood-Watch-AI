-- Supabase SQL Schema for FLOODWATCH EQUINOX

-- 1. Sensor Logs Table
CREATE TABLE sensor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_level NUMERIC NOT NULL,
    moisture NUMERIC NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Active Alerts Table
CREATE TABLE active_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    location TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Civilian Reports Table
CREATE TABLE civilian_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_mobile TEXT NOT NULL,
    image_url TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - adjust policies as needed for your application
ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE civilian_reports ENABLE ROW LEVEL SECURITY;

-- Create basic policies for read access (assuming public read access is desired for the dashboard)
CREATE POLICY "Allow public read access to sensor logs" ON sensor_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access to active alerts" ON active_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public read access to civilian reports" ON civilian_reports FOR SELECT USING (true);

-- Allow public inserts for civilian reports (since it's crowdsourced)
CREATE POLICY "Allow public inserts for civilian reports" ON civilian_reports FOR INSERT WITH CHECK (true);
