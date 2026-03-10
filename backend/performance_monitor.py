import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Setup local logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("equinox.performance")

class PerformanceMonitorMiddleware(BaseHTTPMiddleware):
    """
    FastAPI Middleware to track and log the execution time of every HTTP request.
    Essential for monitoring ML inference latency during high-load flood scenarios.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate execution time
        process_time = time.time() - start_time
        process_time_ms = round(float(process_time * 1000.0), 2)
        
        # Add latency header for client-side telemetry tracking
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)
        
        # Log to server console
        log_message = f"{request.method} {request.url.path} - Status: {response.status_code} - Latency: {process_time_ms}ms"
        
        if process_time_ms > 1000:
            logger.warning(f"[SLOW REFLEX] {log_message}")
        else:
            logger.info(f"[PERF] {log_message}")
            
        return response

# To use in main.py:
# from performance_monitor import PerformanceMonitorMiddleware
# app.add_middleware(PerformanceMonitorMiddleware)
