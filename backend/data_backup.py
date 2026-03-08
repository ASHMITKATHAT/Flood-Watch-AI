import os
import json
import sched
import time
from datetime import datetime
import neon_db as db

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")

scheduler = sched.scheduler(time.time, time.sleep)

def backup_table(table_name: str):
    try:
        data = db.fetch_all(table_name)

        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(BACKUP_DIR, f"{table_name}_backup_{timestamp}.json")

        with open(filename, 'w') as f:
            json.dump(data, f, indent=4, default=str)
        print(f"[BACKUP] Successfully backed up {table_name} to {filename}")

    except Exception as e:
        print(f"[BACKUP ERROR] Failed to backup {table_name}: {e}")

def scheduled_backup(sc, interval_seconds, tables):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Running scheduled backups...")
    for table in tables:
        backup_table(table)
    # Reschedule
    sc.enter(interval_seconds, 1, scheduled_backup, (sc, interval_seconds, tables))

if __name__ == "__main__":
    tables_to_backup = ["sensor_data", "civilian_reports", "active_alerts"]
    interval = 3600 # Every 1 hour

    print(f"Starting Backup Service. Dumps every {interval} seconds.")
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    # Run first immediately
    for t in tables_to_backup:
        backup_table(t)

    # Start loop
    scheduler.enter(interval, 1, scheduled_backup, (scheduler, interval, tables_to_backup))
    scheduler.run()
