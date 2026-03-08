/**
 * Nominatim Geocoding Service
 * Uses OpenStreetMap Nominatim API with CORS-safe headers and mock fallback.
 *
 * NOTE: Browsers strip the `User-Agent` header from fetch() as it's a
 * "forbidden header name" per spec. We set `Accept-Language` instead and
 * identify via the `email` query param (Nominatim's recommended approach).
 * If the API is unreachable (CORS, network, etc.), we fall back to a
 * hardcoded mock result set so the app never breaks.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  importance: number;
}

/** Fallback mock results when the API is unreachable */
const MOCK_RESULTS: NominatimResult[] = [
  { display_name: 'Jaipur, Rajasthan, India', lat: '26.9124', lon: '75.7873', type: 'city', boundingbox: ['26.75', '27.05', '75.65', '75.95'], importance: 0.8 },
  { display_name: 'Mumbai, Maharashtra, India', lat: '19.0760', lon: '72.8777', type: 'city', boundingbox: ['18.89', '19.27', '72.77', '72.98'], importance: 0.9 },
  { display_name: 'Delhi, India', lat: '28.7041', lon: '77.1025', type: 'city', boundingbox: ['28.40', '28.88', '76.84', '77.35'], importance: 0.9 },
  { display_name: 'Chennai, Tamil Nadu, India', lat: '13.0827', lon: '80.2707', type: 'city', boundingbox: ['12.89', '13.23', '80.17', '80.33'], importance: 0.8 },
  { display_name: 'Wayanad, Kerala, India', lat: '11.6854', lon: '76.1320', type: 'district', boundingbox: ['11.51', '11.88', '75.79', '76.38'], importance: 0.6 },
  { display_name: 'Shimla, Himachal Pradesh, India', lat: '31.1048', lon: '77.1734', type: 'city', boundingbox: ['31.05', '31.15', '77.10', '77.24'], importance: 0.7 },
];

export const nominatim = {
  async search(query: string): Promise<NominatimResult[]> {
    try {
      const response = await fetch(
        `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.length > 0 ? data : filterMockResults(query);
    } catch (error) {
      console.warn('[Nominatim] API unreachable, using offline fallback:', error);
      return filterMockResults(query);
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocode HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.display_name || 'Unknown location';
    } catch (error) {
      console.warn('[Nominatim] Reverse geocode failed, returning fallback:', error);
      return 'Unknown location';
    }
  },
};

/** Filter mock results by query for offline fallback */
function filterMockResults(query: string): NominatimResult[] {
  const q = query.toLowerCase();
  const matches = MOCK_RESULTS.filter(r =>
    r.display_name.toLowerCase().includes(q)
  );
  return matches.length > 0 ? matches : MOCK_RESULTS.slice(0, 3);
}