export interface MLPrediction {
  model: string;
  version: string;
  prediction: {
    risk: number;
    confidence: number;
    factors: Array<{
      name: string;
      contribution: number;
      value: number;
    }>;
  };
  timestamp: string;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mae: number;
  mse: number;
  lastTraining: string;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  metadata: {
    samples: number;
    features: string[];
    dateRange: {
      start: string;
      end: string;
    };
  };
}