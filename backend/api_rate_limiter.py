import time
import threading
from functools import wraps
from flask import request, jsonify

class RateLimiter:
    """
    Thread-safe Token Bucket Rate Limiter
    """
    def __init__(self, rate=10, per=60):
        """
        :param rate: Number of requests allowed
        :param per: Time window in seconds
        """
        self.rate = rate
        self.per = per
        self.tokens = {}
        self.lock = threading.Lock()
    
    def _get_tokens(self, key):
        """Get available tokens for a key, refilling if needed"""
        now = time.time()
        
        if key not in self.tokens:
            self.tokens[key] = {
                'tokens': self.rate,
                'last_updated': now
            }
            return self.rate
        
        # Refill tokens based on time elapsed
        elapsed = now - self.tokens[key]['last_updated']
        refill = elapsed * (self.rate / self.per)
        
        if refill > 0:
            self.tokens[key]['tokens'] = min(self.rate, self.tokens[key]['tokens'] + refill)
            self.tokens[key]['last_updated'] = now
            
        return self.tokens[key]['tokens']

    def check(self, key):
        """Check if request is allowed"""
        with self.lock:
            tokens = self._get_tokens(key)
            if tokens >= 1:
                self.tokens[key]['tokens'] -= 1
                return True
            return False

# Global instance
limiter = RateLimiter(rate=50, per=60) # 50 requests per minute per IP defaults

def limit_requests(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Use IP address as key
        key = request.remote_addr
        if not limiter.check(key):
            return jsonify({
                "success": False, 
                "error": "Rate limit exceeded. Please try again later."
            }), 429
        return f(*args, **kwargs)
    return decorated_function
