const API_BASE_URL = '';

export const fetchActiveAlerts = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/active_alerts`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : (data.active_alerts || data.alerts || data.data || []);
    } catch (error) {
        console.error("Failed to fetch active alerts from Flask backend:", error);
        return [];
    }
};

export const fetchSensorData = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensors`);
        if (!response.ok) throw new Error('HTTP error in fetchSensorData');
        const data = await response.json();
        if (data && data.sensors) {
            return [{
                moisture: data.sensors.soil_moisture?.value,
                water_level: data.sensors.dam_water_level?.value,
                latitude: 26.9124,
                longitude: 75.7873,
                risk_level: data.sensors.district_risk?.status || 'safe',
                water_depth: data.sensors.predicted_water_depth?.value || 0
            }];
        }
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        console.error("Failed to fetch sensor data:", error);
        return [];
    }
};

export const fetchCivilianReports = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports`);
        if (!response.ok) throw new Error('HTTP error in fetchCivilianReports');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.reports || data.data || []);
    } catch (error) {
        console.error("Failed to fetch civilian reports:", error);
        return [];
    }
};

export const submitCivilianReport = async (report: any) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        if (!response.ok) throw new Error('HTTP error in submitCivilianReport');
        return await response.json();
    } catch (error) {
        console.error("Failed to submit civilian report:", error);
        throw error;
    }
};
