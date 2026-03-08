import sys
import os

# Add backend directory to path to simulate running from backend/ or having it in PYTHONPATH
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Testing imports...")
try:
    from backend.app import app
    print("✅ backend.app imported successfully")
except ImportError as e:
    print(f"❌ Failed to import backend.app: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error importing backend.app: {e}")
    sys.exit(1)

try:
    from backend.physics_engine import AdvancedFloodML
    print("✅ backend.physics_engine imported successfully")
except ImportError as e:
    print(f"❌ Failed to import backend.physics_engine: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error importing backend.physics_engine: {e}")
    sys.exit(1)

print("Backend verification successful!")
