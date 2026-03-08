import os
import time
import random
from datetime import datetime
from dotenv import load_dotenv
import neon_db as db

load_dotenv()

# Constants for Hacker Aesthetic
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Formatting helpers
def print_sys(msg):
    print(f"{Colors.OKBLUE}[SYSTEM]{Colors.ENDC} {msg}")

def print_warn(msg):
    print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {msg}")

def print_crit(msg):
    print(f"{Colors.FAIL}[CRITICAL]{Colors.ENDC} {msg}")

def print_db(msg):
    print(f"{Colors.OKGREEN}[DB_SYNC]{Colors.ENDC} {msg}")

def print_hdr(msg):
    print(f"\n{Colors.BOLD}{Colors.HEADER}=== {msg} ==={Colors.ENDC}\n")


TARGET_TABLE = "sensor_data"

# Bounding box config (Jaipur)
CENTER_LAT = 26.9124
CENTER_LNG = 75.7873
SPREAD = 0.05
NUM_POINTS = 20

def get_risk_level(depth: float) -> str:
    if depth >= 2.0:
        return 'critical'
    elif depth >= 1.0:
        return 'warning'
    return 'safe'

def main():
    print_hdr("EQUINOX DOOMSDAY SIMULATOR INITIALIZING")
    
    print_sys("Establishing uplinks to Neon PostgreSQL Datastore...")
    
    # 1. Clear existing map points
    print_sys("Purging legacy telemetry data...")
    try:
        db.delete_all(TARGET_TABLE)
        print_db("Cleared stale records.")
    except Exception as e:
        print_warn(f"Failed to clear old data: {e}")

    # 2. Seed Baseline Data
    print_sys("Deploying 20 remote sensor nodes at baseline parameters...")
    nodes = []
    
    for i in range(NUM_POINTS):
        lat = CENTER_LAT + random.uniform(-SPREAD, SPREAD)
        lng = CENTER_LNG + random.uniform(-SPREAD, SPREAD)
        node_id = f"SIM_NODE_{i:02d}" 
        
        nodes.append({
            "latitude": lat,
            "longitude": lng,
            "water_depth": 0.1,
            "risk_level": "safe",
            "location_id": node_id
        })
    
    try:
        db.insert_rows(TARGET_TABLE, nodes)
        print_db("Deployed 20 Safe baseline clusters.")
    except Exception as e:
        print_crit(f"Seeding failed: {e}")
        exit(1)

    print_hdr("BEGIN ESCALATION PROTOCOL")

    # 3. Escalation Loop
    try:
        for iteration in range(1, 21):
            print_sys(f"Iteration {iteration:02d}: Injecting live telemetry anomalies...")
            
            updates = []
            for i, node in enumerate(nodes):
                # Calculate new depth
                escalation = random.uniform(0.3, 0.8)
                new_depth = round(node["water_depth"] + escalation, 2)
                
                new_risk = get_risk_level(new_depth)
                
                # Hacker logging
                if new_risk == 'critical' and node["risk_level"] != 'critical':
                    print_crit(f"Point {node['location_id']} crossed CRITICAL threshold. Depth: {new_depth}m")
                elif new_risk == 'warning' and node["risk_level"] != 'warning':
                    print_warn(f"Point {node['location_id']} entering WARNING state. Depth: {new_depth}m")

                node["water_depth"] = new_depth
                node["risk_level"] = new_risk

                updates.append({
                    "latitude": node["latitude"],
                    "longitude": node["longitude"],
                    "water_depth": node["water_depth"],
                    "risk_level": node["risk_level"],
                    "location_id": node["location_id"]
                })
            
            # Insert new rows for each escalation iteration
            try:
                db.insert_rows(TARGET_TABLE, updates)
                print_db(f"Pushed 20 row updates to Neon DB at {datetime.now().strftime('%H:%M:%S')}")
            except Exception as e:
                print_crit(f"Sync failed during escalation: {e}")
                
            time.sleep(3)

    except KeyboardInterrupt:
        print("\n")
        print_warn("MANUAL OVERRIDE. SIMULATOR ABORTED.")
        exit(0)

    print_hdr("SIMULATION COMPLETE")
    print_sys("All sectors reported maximum casualty limits.")

if __name__ == "__main__":
    main()
