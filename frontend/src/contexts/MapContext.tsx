import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

interface MapContextType {
  location: MapLocation;
  setLocation: (location: MapLocation) => void;
  selectedArea: string | null;
  setSelectedArea: (area: string | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<MapLocation>({
    lat: 26.9124,
    lng: 75.7873,
    zoom: 10,
  });

  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  return (
    <MapContext.Provider value={{ 
      location, 
      setLocation, 
      selectedArea, 
      setSelectedArea 
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};