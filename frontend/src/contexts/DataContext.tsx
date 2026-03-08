import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FloodData {
  rainfall: number;
  waterLevel: number;
  soilMoisture: number;
  riskLevel: number;
  lastUpdated: string;
}

interface DataContextType {
  data: FloodData;
  isLoading: boolean;
  refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FloodData>({
    rainfall: 12.5,
    waterLevel: 3.2,
    soilMoisture: 65,
    riskLevel: 45,
    lastUpdated: new Date().toLocaleTimeString(),
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData({
        rainfall: Math.random() * 50,
        waterLevel: Math.random() * 10,
        soilMoisture: Math.random() * 100,
        riskLevel: Math.random() * 100,
        lastUpdated: new Date().toLocaleTimeString(),
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <DataContext.Provider value={{ data, isLoading, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};