"""
Neon PostgreSQL Database Helper for EQUINOX Backend.
Replaces the Supabase SDK with direct PostgreSQL via psycopg2.
"""
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("CRITICAL: DATABASE_URL is missing from .env file!")


def get_connection():
    """Get a new database connection from Neon."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"[DB ERROR] Failed to connect to Neon: {e}")
        return None


def fetch_all(table_name: str, conditions: dict = None, limit: int = None):
    """Fetch all rows from a table, optionally with conditions."""
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = f"SELECT * FROM {table_name}"
            params = []
            if conditions:
                clauses = []
                for key, value in conditions.items():
                    clauses.append(f"{key} = %s")
                    params.append(value)
                query += " WHERE " + " AND ".join(clauses)
            if limit:
                query += f" LIMIT {limit}"
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"[DB ERROR] fetch_all({table_name}): {e}")
        return []
    finally:
        conn.close()


def fetch_gte(table_name: str, column: str, value):
    """Fetch rows where column >= value."""
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = f"SELECT * FROM {table_name} WHERE {column} >= %s"
            cur.execute(query, (value,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"[DB ERROR] fetch_gte({table_name}): {e}")
        return []
    finally:
        conn.close()


def insert_row(table_name: str, data: dict):
    """Insert a single row into a table."""
    conn = get_connection()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) RETURNING *"
            cur.execute(query, list(data.values()))
            conn.commit()
            return cur.fetchone()
    except Exception as e:
        print(f"[DB ERROR] insert_row({table_name}): {e}")
        conn.rollback()
        return None
    finally:
        conn.close()


def insert_rows(table_name: str, data_list: list):
    """Insert multiple rows into a table."""
    if not data_list:
        return []
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            columns = ", ".join(data_list[0].keys())
            placeholders = ", ".join(["%s"] * len(data_list[0]))
            query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) RETURNING *"
            results = []
            for data in data_list:
                cur.execute(query, list(data.values()))
                results.append(cur.fetchone())
            conn.commit()
            return results
    except Exception as e:
        print(f"[DB ERROR] insert_rows({table_name}): {e}")
        conn.rollback()
        return []
    finally:
        conn.close()


def upsert_rows(table_name: str, data_list: list, conflict_column: str = "id"):
    """Upsert rows (insert or update on conflict)."""
    if not data_list:
        return []
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            columns = list(data_list[0].keys())
            col_str = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))
            update_cols = [f"{c} = EXCLUDED.{c}" for c in columns if c != conflict_column]
            update_str = ", ".join(update_cols)
            query = f"""
                INSERT INTO {table_name} ({col_str}) VALUES ({placeholders})
                ON CONFLICT ({conflict_column}) DO UPDATE SET {update_str}
                RETURNING *
            """
            results = []
            for data in data_list:
                cur.execute(query, [data[c] for c in columns])
                results.append(cur.fetchone())
            conn.commit()
            return results
    except Exception as e:
        print(f"[DB ERROR] upsert_rows({table_name}): {e}")
        conn.rollback()
        return []
    finally:
        conn.close()


def delete_all(table_name: str):
    """Delete all rows from a table."""
    conn = get_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {table_name}")
            conn.commit()
            return True
    except Exception as e:
        print(f"[DB ERROR] delete_all({table_name}): {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def delete_by_id(table_name: str, row_id: str):
    """Delete a row by its id."""
    conn = get_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {table_name} WHERE id = %s", (row_id,))
            conn.commit()
            return True
    except Exception as e:
        print(f"[DB ERROR] delete_by_id({table_name}): {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def execute_query(query: str, params: tuple = None):
    """Execute arbitrary SQL query and return results."""
    conn = get_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            if cur.description:
                return [dict(row) for row in cur.fetchall()]
            conn.commit()
            return []
    except Exception as e:
        print(f"[DB ERROR] execute_query: {e}")
        conn.rollback()
        return []
    finally:
        conn.close()
