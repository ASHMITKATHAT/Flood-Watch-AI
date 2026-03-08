export const formatters = {
  formatNumber(num: number, decimals = 1): string {
    return num.toFixed(decimals);
  },

  formatPercentage(num: number, decimals = 1): string {
    return `${num.toFixed(decimals)}%`;
  },

  formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
    const d = new Date(date);
    
    if (format === 'short') {
      return d.toLocaleDateString();
    }
    
    return d.toLocaleString();
  },

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  },

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  },
};