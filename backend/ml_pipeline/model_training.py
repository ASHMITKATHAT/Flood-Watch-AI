"""
model_training.py - Professional model training pipeline
"""

import numpy as np
import pandas as pd
import joblib
import json
from datetime import datetime
from typing import Dict, List, Tuple
import logging
from pathlib import Path

from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
import lightgbm as lgb

logger = logging.getLogger(__name__)

class ModelTrainer:
    """Professional model training and optimization"""
    
    def __init__(self, model_dir: str = 'models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
    def train_full_pipeline(self, data_path: str) -> Dict:
        """
        Complete training pipeline
        
        Args:
            data_path: Path to training data CSV
            
        Returns:
            Dictionary with training results
        """
        logger.info("Starting full training pipeline")
        
        # 1. Load and preprocess data
        X_train, X_val, X_test, y_train, y_val, y_test = self._load_and_split_data(data_path)
        
        # 2. Train multiple models
        models = self._train_models(X_train, y_train, X_val, y_val)
        
        # 3. Hyperparameter tuning
        tuned_models = self._hyperparameter_tuning(models, X_train, y_train, X_val, y_val)
        
        # 4. Model evaluation
        evaluation = self._evaluate_models(tuned_models, X_test, y_test)
        
        # 5. Create ensemble
        ensemble = self._create_ensemble(tuned_models, X_train, y_train)
        
        # 6. Save models and results
        results = self._save_results(tuned_models, ensemble, evaluation)
        
        logger.info("Training pipeline completed successfully")
        return results
    
    def _load_and_split_data(self, data_path: str) -> Tuple:
        """Load and split data into train/val/test sets"""
        df = pd.read_csv(data_path)
        
        # Separate features and target
        X = df.drop(['water_depth_mm', 'flood_occurred'], axis=1)
        y = df['water_depth_mm']
        
        # Split: 60% train, 20% validation, 20% test
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.4, random_state=42, stratify=df['flood_occurred']
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42
        )
        
        logger.info(f"Data split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def _train_models(self, X_train, y_train, X_val, y_val) -> Dict:
        """Train multiple models"""
        models = {}
        
        # Random Forest
        logger.info("Training Random Forest...")
        rf = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        models['random_forest'] = rf
        
        # XGBoost
        logger.info("Training XGBoost...")
        xgb_model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        xgb_model.fit(X_train, y_train)
        models['xgboost'] = xgb_model
        
        # LightGBM
        logger.info("Training LightGBM...")
        lgb_model = lgb.LGBMRegressor(
            n_estimators=300,
            max_depth=7,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        lgb_model.fit(X_train, y_train)
        models['lightgbm'] = lgb_model
        
        # Gradient Boosting
        logger.info("Training Gradient Boosting...")
        gb = GradientBoostingRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42
        )
        gb.fit(X_train, y_train)
        models['gradient_boosting'] = gb
        
        return models
    
    def _hyperparameter_tuning(self, models, X_train, y_train, X_val, y_val) -> Dict:
        """Perform hyperparameter tuning for each model"""
        tuned_models = {}
        
        # Define parameter grids
        param_grids = {
            'random_forest': {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 15, 20],
                'min_samples_split': [2, 5, 10]
            },
            'xgboost': {
                'n_estimators': [200, 300, 400],
                'max_depth': [6, 8, 10],
                'learning_rate': [0.01, 0.05, 0.1]
            }
        }
        
        # Tune Random Forest
        logger.info("Tuning Random Forest hyperparameters...")
        rf_grid = GridSearchCV(
            models['random_forest'],
            param_grids['random_forest'],
            cv=3,
            scoring='neg_mean_squared_error',
            n_jobs=-1
        )
        rf_grid.fit(X_train, y_train)
        tuned_models['random_forest'] = rf_grid.best_estimator_
        
        # Tune XGBoost
        logger.info("Tuning XGBoost hyperparameters...")
        xgb_grid = GridSearchCV(
            models['xgboost'],
            param_grids['xgboost'],
            cv=3,
            scoring='neg_mean_squared_error',
            n_jobs=-1
        )
        xgb_grid.fit(X_train, y_train)
        tuned_models['xgboost'] = xgb_grid.best_estimator_
        
        # Keep other models as-is
        tuned_models['lightgbm'] = models['lightgbm']
        tuned_models['gradient_boosting'] = models['gradient_boosting']
        
        return tuned_models
    
    def _evaluate_models(self, models, X_test, y_test) -> Dict:
        """Evaluate all models on test set"""
        evaluation = {}
        
        for name, model in models.items():
            y_pred = model.predict(X_test)
            
            evaluation[name] = {
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
                'mae': mean_absolute_error(y_test, y_pred),
                'r2': r2_score(y_test, y_pred),
                'explained_variance': np.var(y_pred) / np.var(y_test) if np.var(y_test) > 0 else 0
            }
            
            logger.info(f"{name.upper()} - RMSE: {evaluation[name]['rmse']:.2f}, "
                       f"R²: {evaluation[name]['r2']:.3f}")
        
        return evaluation
    
    def _create_ensemble(self, models, X_train, y_train):
        """Create ensemble model"""
        from sklearn.ensemble import VotingRegressor
        
        estimators = [
            ('rf', models['random_forest']),
            ('xgb', models['xgboost']),
            ('lgb', models['lightgbm']),
            ('gb', models['gradient_boosting'])
        ]
        
        ensemble = VotingRegressor(
            estimators=estimators,
            weights=[0.25, 0.25, 0.25, 0.25]
        )
        
        # Train ensemble on full training data
        ensemble.fit(X_train, y_train)
        
        return ensemble
    
    def _save_results(self, models, ensemble, evaluation):
        """Save trained models and evaluation results"""
        results = {
            'training_date': datetime.now().isoformat(),
            'evaluation_metrics': evaluation,
            'model_versions': {}
        }
        
        # Save individual models
        for name, model in models.items():
            model_path = self.model_dir / f'{name}_model.pkl'
            joblib.dump(model, model_path)
            results['model_versions'][name] = str(model_path)
        
        # Save ensemble
        ensemble_path = self.model_dir / 'ensemble_model.pkl'
        joblib.dump(ensemble, ensemble_path)
        results['model_versions']['ensemble'] = str(ensemble_path)
        
        # Save evaluation results
        results_path = self.model_dir / 'training_results.json'
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info(f"Models saved to {self.model_dir}")
        return results