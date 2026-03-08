export const validators = {
  isEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  isPhone(phone: string): boolean {
    const regex = /^\+?[\d\s\-\(\)]{10,}$/;
    return regex.test(phone);
  },

  isURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isNumber(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  isPositiveNumber(value: number): boolean {
    return this.isNumber(value) && value > 0;
  },

  isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  },

  isLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90;
  },

  isLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180;
  },

  isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
};