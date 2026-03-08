import os
import sys

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
from ml_pipeline.data_ingestion import DataIngestionPipeline
from ml_pipeline.model_training import ModelTrainer

def main():
    print("Generating synthetic data...")
    ingestion = DataIngestionPipeline()
    df = ingestion.create_synthetic_dataset(num_samples=2000) # using 2000 to save time
    
    print("Formatting data for training...")
    # ModelTrainer expects 'water_depth_mm' and 'flood_occurred'
    df['water_depth_mm'] = df['flood_depth_cm'] * 10
    df['flood_occurred'] = (df['water_depth_mm'] > 50).astype(int)
    
    # Save the formatted dataset
    data_path = os.path.join('data', 'ml_datasets', 'train_formatted.csv')
    df.to_csv(data_path, index=False)
    print(f"Formatted dataset saved to {data_path}")
    
    print("Starting training pipeline...")
    trainer = ModelTrainer(model_dir='models')
    results = trainer.train_full_pipeline(data_path)
    print("Training complete!")
    print(results['evaluation_metrics'])

if __name__ == '__main__':
    main()
