import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Alert {
  id: number;
  type: 'warning' | 'danger' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: number) => void;
  clearAll: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      type: 'warning',
      message: 'Heavy rainfall expected in District A',
      timestamp: '10:30 AM',
      read: false,
    },
  ]);

  const unreadCount = alerts.filter(alert => !alert.read).length;

  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      read: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const markAsRead = (id: number) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, read: true } : alert
      )
    );
  };

  const clearAll = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{ 
      alerts, 
      unreadCount, 
      addAlert, 
      markAsRead, 
      clearAll 
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};