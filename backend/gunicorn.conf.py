import multiprocessing
import os

"""
Gunicorn configuration for EQUINOX Production Server.

Run: gunicorn -c gunicorn.conf.py main:app -k uvicorn.workers.UvicornWorker
"""

# Server Socket
bind = "0.0.0.0:" + os.environ.get("PORT", "8000")
backlog = 2048

# Worker Processes
# Calculate workers based on CPU cores (2 * cores + 1)
workers = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
errorlog = "-"
loglevel = "info"
accesslog = "-"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process Naming
proc_name = "equinox_backend"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
