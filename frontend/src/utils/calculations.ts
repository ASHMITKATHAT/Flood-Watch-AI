export const calculations = {
  // Calculate risk level based on multiple factors
  calculateRisk(factors: {
    rainfall: number;
    soilMoisture: number;
    terrain: number;
    historical: number;
  }): number {
    const weights = {
      rainfall: 0.4,
      soilMoisture: 0.3,
      terrain: 0.2,
      historical: 0.1,
    };

    let risk = 0;
    risk += factors.rainfall * weights.rainfall;
    risk += factors.soilMoisture * weights.soilMoisture;
    risk += factors.terrain * weights.terrain;
    risk += factors.historical * weights.historical;

    return Math.min(100, Math.max(0, risk * 100));
  },

  // Calculate distance between two coordinates (in km)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  // Calculate average of array
  average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  // Calculate standard deviation
  standardDeviation(arr: number[]): number {
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  },

  // Normalize value to 0-100 range
  normalize(value: number, min: number, max: number): number {
    if (min === max) return 50;
    return ((value - min) / (max - min)) * 100;
  },
};