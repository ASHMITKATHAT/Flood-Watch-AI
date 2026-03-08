import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    os.chdir('c:\\FLOODWATCH_EQUINOX\\backend')
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        # Check if auth scheme exists or drop reference
        try:
            print("Altering profiles table to accept Firebase long string UIDs...")
            cur.execute("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;")
            # To change from UUID to TEXT, we might need a cast or just drop and recreate if empty or if we only have 1 row
            cur.execute("ALTER TABLE profiles ALTER COLUMN id TYPE VARCHAR(128);")
            conn.commit()
            print("Success altering id column type.")
        except Exception as e:
            conn.rollback()
            print(f"Error altering table: {e}")
            
        try:
            cur.execute("DELETE FROM profiles WHERE full_name = 'ashmit' OR email = 'ashmitkathat0@gmail.com';")
            
            # Since email column might not exist, ensure it exists or don't use it.
            cur.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);")
            
            cur.execute("""
                INSERT INTO profiles (id, full_name, email, role, district_id) 
                VALUES (%s, %s, %s, %s, %s)
            """, ('VOHxLsu37GR2MON2SHEizTEgoVr1', 'ashmit', 'ashmit@equinox.app', 'super_admin', 'all'))
            conn.commit()
            print("Successfully inserted the new profile with Firebase UID!")
        except Exception as e:
            conn.rollback()
            print(f"Error inserting: {e}")

except Exception as e:
    print(f"Connection Error: {e}")
