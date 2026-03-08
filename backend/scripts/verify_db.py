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
        # Check profiles table
        cur.execute("SELECT * FROM profiles WHERE full_name = 'ashmit' OR role = 'super_admin'")
        profiles = cur.fetchall()
        print("Profiles found:")
        for p in profiles:
            print(p)
            
        print("\nChecking PostgreSQL Roles:")
        cur.execute("SELECT rolname FROM pg_roles WHERE rolname = 'ashmit'")
        roles = cur.fetchall()
        for r in roles:
            print(f"- Role found: {r[0]}")
except Exception as e:
    print(f"Error: {e}")
