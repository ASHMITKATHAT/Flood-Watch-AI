import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """)
        tables = cur.fetchall()
        print("Tables in public schema:")
        for t in tables:
            print(f"- {t[0]}")
            
        print("\nChecking PostgreSQL Roles:")
        cur.execute("SELECT rolname, rolsuper FROM pg_roles")
        roles = cur.fetchall()
        for r in roles:
            print(f"- {r[0]} (Superuser: {r[1]})")
except Exception as e:
    print(f"Error: {e}")
