"""
Seed script for Neon PostgreSQL Database (formerly seed_supabase.py).
Populates the EQUINOX database with initial mock data.
"""
import neon_db as db


def seed_database():
    try:
        print("Checking connection to Neon PostgreSQL...")
        
        # 1. Seed Active Alerts
        alerts = [
            {
                "zone_name": "Jaipur City Sector 4",
                "severity": "critical",
                "description": "Flash flood warning based on radar data.",
                "latitude": 26.9124,
                "longitude": 75.7873,
                "is_active": True
            },
            {
                "zone_name": "Jodhpur Downtown",
                "severity": "warning",
                "description": "Water logging detected in low elevation zones.",
                "latitude": 26.2389,
                "longitude": 73.0243,
                "is_active": True
            }
        ]
        
        print("Seeding active_alerts...")
        db.insert_rows("active_alerts", alerts)
        
        # 2. Seed Sensor Data
        sensors = [
            {
                "location_id": "JPR-SEN-01",
                "latitude": 26.9124,
                "longitude": 75.7873,
                "moisture": 85.5,
                "water_level": 3.8,
                "water_flow": 45.2,
                "risk_level": "critical"
            },
            {
                "location_id": "JPR-SEN-02",
                "latitude": 26.9200,
                "longitude": 75.7900,
                "moisture": 60.1,
                "water_level": 1.2,
                "water_flow": 12.0,
                "risk_level": "safe"
            }
        ]
        
        print("Seeding sensor_data...")
        db.insert_rows("sensor_data", sensors)
        
        # 3. Seed Civilian Reports
        reports = [
            {
                "user_mobile": "Citizen #3491",
                "description": "Water Logging - Bani Park: Roads are completely flooded.",
                "latitude": 26.9250,
                "longitude": 75.7920,
                "status": "verified"
            }
        ]
        
        print("Seeding civilian_reports...")
        db.insert_rows("civilian_reports", reports)
        
        print("SUCCESS! Database has been populated with mock data.")
    except Exception as e:
        print(f"FAILED TO SEED DATA: {e}")

if __name__ == "__main__":
    seed_database()
