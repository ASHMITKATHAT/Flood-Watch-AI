-- EQUINOX: Supabase Database Initialization Script
-- Paste this entirely into the Supabase SQL Editor and hit "Run"

-- 1. Create sensor_data table (Telemetry from physical/IoT sensors)
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    moisture DOUBLE PRECISION,
    water_level DOUBLE PRECISION,
    water_flow DOUBLE PRECISION,
    risk_level TEXT DEFAULT 'safe',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissions for sensor_data
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.sensor_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.sensor_data FOR INSERT WITH CHECK (true);


-- 2. Create civilian_reports table (Human Sensor Network)
CREATE TABLE IF NOT EXISTS public.civilian_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_mobile TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissions for civilian_reports
ALTER TABLE public.civilian_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.civilian_reports FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.civilian_reports FOR INSERT WITH CHECK (true);


-- 3. Create active_alerts table (Mission Control Zone Alerts)
CREATE TABLE IF NOT EXISTS public.active_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zone_name TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'critical', 'high', 'warning'
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissions for active_alerts
ALTER TABLE public.active_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.active_alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.active_alerts FOR INSERT WITH CHECK (true);


-- Create Realtime publication logic if not exists
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.sensor_data;
alter publication supabase_realtime add table public.civilian_reports;
alter publication supabase_realtime add table public.active_alerts;
