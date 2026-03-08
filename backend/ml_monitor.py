"""
ml_monitor.py - ML model monitoring and performance tracking
"""

import json
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class MLMonitor:
    """Monitor ML model performance and predictions"""
    
    def __init__(self, log_dir: str = 'logs'):
        self.log_dir = log_dir
        self.predictions_file = f'{log_dir}/ml_predictions.json'
        self.performance_file = f'{log_dir}/ml_performance.json'
        
        # Initialize logs
        self._init_logs()
    
    def _init_logs(self):
        """Initialize log files"""
        import os
        os.makedirs(self.log_dir, exist_ok=True)
        
        if not os.path.exists(self.predictions_file):
            with open(self.predictions_file, 'w') as f:
                json.dump([], f)
        
        if not os.path.exists(self.performance_file):
            with open(self.performance_file, 'w') as f:
                json.dump({}, f)
    
    def log_prediction(self, prediction: Dict):
        """Log a prediction"""
        try:
            with open(self.predictions_file, 'r') as f:
                predictions = json.load(f)
            
            # Add timestamp and metadata
            prediction_log = {
                'timestamp': datetime.now().isoformat(),
                'prediction': prediction
            }
            
            predictions.append(prediction_log)
            
            # Keep only last 1000 predictions
            if len(predictions) > 1000:
                predictions = predictions[-1000:]
            
            with open(self.predictions_file, 'w') as f:
                json.dump(predictions, f, indent=2)
            
        except Exception as e:
            logger.error(f"Error logging prediction: {e}")
    
    def log_error(self, error_message: str):
        """Log an error"""
        error_log = {
            'timestamp': datetime.now().isoformat(),
            'error': error_message,
            'type': 'prediction_error'
        }
        
        # Log to error file
        error_file = f'{self.log_dir}/ml_errors.json'
        try:
            with open(error_file, 'r') as f:
                errors = json.load(f)
        except:
            errors = []
        
        errors.append(error_log)
        
        with open(error_file, 'w') as f:
            json.dump(errors, f, indent=2)
    
    def get_prediction_history(self, limit: int = 100) -> List[Dict]:
        """Get recent prediction history"""
        try:
            with open(self.predictions_file, 'r') as f:
                predictions = json.load(f)
            
            return predictions[-limit:]
        except Exception as e:
            logger.error(f"Error getting prediction history: {e}")
            return []
    
    def calculate_performance_metrics(self) -> Dict:
        """Calculate performance metrics from recent predictions"""
        try:
            predictions = self.get_prediction_history(limit=500)
            
            if not predictions:
                return {}
            
            # Extract risk scores and categories
            risk_scores = []
            categories = []
            
            for pred in predictions:
                if 'prediction' in pred and 'ml_prediction' in pred['prediction']:
                    ml_pred = pred['prediction']['ml_prediction']
                    risk_scores.append(ml_pred.get('risk_score', 0))
                    categories.append(ml_pred.get('risk_category', 'UNKNOWN'))
            
            if not risk_scores:
                return {}
            
            # Calculate metrics
            avg_risk = sum(risk_scores) / len(risk_scores)
            
            # Category distribution
            from collections import Counter
            category_dist = Counter(categories)
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'total_predictions': len(predictions),
                'average_risk_score': avg_risk,
                'category_distribution': dict(category_dist),
                'high_risk_percentage': len([r for r in risk_scores if r > 0.6]) / len(risk_scores) * 100
            }
            
            # Save metrics
            self._save_performance_metrics(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {e}")
            return {}
    
    def _save_performance_metrics(self, metrics: Dict):
        """Save performance metrics"""
        try:
            with open(self.performance_file, 'r') as f:
                all_metrics = json.load(f)
            
            date_str = datetime.now().strftime('%Y-%m-%d')
            all_metrics[date_str] = metrics
            
            with open(self.performance_file, 'w') as f:
                json.dump(all_metrics, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving performance metrics: {e}")