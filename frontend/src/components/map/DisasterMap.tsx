import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchSensorData } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulation } from '../../contexts/SimulationContext';

const RISK_STYLES: Record<string, { fillColor: string, fillOpacity: number, color: string, weight: number, className?: string }> = {
    critical: {
        fillColor: '#f7768e',
        fillOpacity: 0.6,
        color: 'transparent',
        weight: 0,
    },
    warning: {
        fillColor: '#ff9e64',
        fillOpacity: 0.5,
        color: 'transparent',
        weight: 0,
    },
    safe: {
        fillColor: '#7dcfff',
        fillOpacity: 0.15,
        color: '#7dcfff',
        weight: 1,
    }
};

interface PredictionPoint {
    id: string;
    latitude: number;
    longitude: number;
    risk_level: string;
    predicted_depth: number;
}

interface DisasterMapProps {
    scenario?: 'live' | 'punjab';
    onCellClick?: (cell: PredictionPoint) => void;
    compact?: boolean;
}

/** Inner component that uses Leaflet's useMap() to fly to coordinates */
const MapController: React.FC = () => {
    const { coordinates } = useSimulation();
    const map = useMap();

    useEffect(() => {
        if (coordinates.lat && coordinates.lng) {
            map.flyTo([coordinates.lat, coordinates.lng], coordinates.zoom, {
                duration: 1.8,
                easeLinearity: 0.25,
            });
        }
    }, [coordinates, map]);

    return null;
};

const DisasterMap: React.FC<DisasterMapProps> = ({ scenario = 'live', onCellClick, compact = false }) => {
    const [points, setPoints] = useState<PredictionPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { coordinates } = useSimulation();
    const { activeDistrict } = useAuth();

    useEffect(() => {
        const loadPredictions = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSensorData();

                if (data && data.length > 0) {
                    const mapped: PredictionPoint[] = data.map((row: any) => {
                        let lat = row.latitude;
                        let lng = row.longitude;

                        if ((lat === undefined || lng === undefined) && row.location_id) {
                            const parts = row.location_id.split(',');
                            if (parts.length === 2) {
                                lat = parseFloat(parts[0]);
                                lng = parseFloat(parts[1]);
                            }
                        }

                        let risk = (row.risk_level || 'safe').toLowerCase();
                        if (risk === 'info' || risk === 'normal') risk = 'safe';
                        if (risk === 'high') risk = 'warning';

                        return {
                            id: row.id || Math.random().toString(),
                            latitude: lat || 26.9124,
                            longitude: lng || 75.7873,
                            risk_level: risk,
                            predicted_depth: row.water_depth || 0,
                        };
                    });

                    const uniquePoints = new Map<string, PredictionPoint>();
                    mapped.forEach(p => {
                        const key = `${p.latitude},${p.longitude}`;
                        if (!uniquePoints.has(key)) {
                            uniquePoints.set(key, p);
                        }
                    });

                    setPoints(Array.from(uniquePoints.values()));
                    window.dispatchEvent(new Event('supabase_online'));
                }
            } catch (err) {
                console.warn("[DisasterMap] Failed to load predictions — falling back to empty grid:", err);
                setPoints([]);
                window.dispatchEvent(new Event('supabase_offline'));
            } finally {
                setIsLoading(false);
            }
        };

        loadPredictions();

        // Poll every 30 seconds
        const interval = setInterval(loadPredictions, 30000);
        return () => clearInterval(interval);
    }, [scenario, activeDistrict]);

    const renderedGrid = useMemo(() => {
        const OFFSET = 0.0005;

        return points.map(point => {
            const bounds: [[number, number], [number, number]] = [
                [point.latitude - OFFSET, point.longitude - OFFSET],
                [point.latitude + OFFSET, point.longitude + OFFSET]
            ];

            const style = RISK_STYLES[point.risk_level] || RISK_STYLES.safe;
            const displayRisk = point.risk_level.toUpperCase();

            return (
                <Rectangle
                    key={point.id}
                    bounds={bounds}
                    pathOptions={style}
                    eventHandlers={{
                        click: () => {
                            if (onCellClick) onCellClick(point);
                        }
                    }}
                >
                    <Tooltip sticky className="glass-panel-tooltip">
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "#1f2335", padding: "8px", borderRadius: "8px", border: `1px solid ${style.fillColor}40`, color: "#c0caf5", minWidth: "150px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                            <div style={{ fontSize: "10px", color: "#565f89", marginBottom: "4px" }}>
                                COORDINATES: [{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}]
                            </div>
                            <div style={{ fontSize: "12px", fontWeight: "bold", color: style.fillColor, marginBottom: "4px" }}>
                                STATUS: {displayRisk}
                            </div>
                            <div style={{ fontSize: "14px", color: "#c0caf5" }}>
                                EST. DEPTH: <span style={{ color: style.fillColor }}>{point.predicted_depth.toFixed(2)}m</span>
                            </div>
                        </div>
                    </Tooltip>
                </Rectangle>
            );
        });
    }, [points, onCellClick]);

    return (
        <div className="w-full h-full relative" style={{ backgroundColor: '#1a1b26' }}>
            <MapContainer
                center={[coordinates.lat, coordinates.lng]}
                zoom={coordinates.zoom}
                zoomControl={!compact}
                attributionControl={!compact}
                style={{ height: '100%', width: '100%', background: 'transparent' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {/* Fly-to controller — reads coordinates from SimulationContext */}
                <MapController />

                {renderedGrid}
            </MapContainer>

            {/* Overlays */}
            {isLoading && (
                <div className="absolute inset-0 bg-[#1a1b26]/80 backdrop-blur-sm flex items-center justify-center z-[500] pointer-events-none">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-[#292e42] border-t-[#7dcfff] rounded-full animate-spin mx-auto mb-3" />
                        <div className="text-xs font-mono text-[#7dcfff] tracking-widest animate-pulse">SYNCING TACTICAL GRID...</div>
                    </div>
                </div>
            )}

            {!isLoading && points.length > 0 && (
                <div className="absolute top-2 right-2 z-[400] bg-[#1a1b26]/90 backdrop-blur rounded-lg px-2 py-1 border border-[#292e42] shadow-[0_2px_8px_rgba(0,0,0,0.4)] pointer-events-none">
                    <span className="text-[9px] font-mono text-[#565f89]">{points.length} ACTIVE GRIDS</span>
                </div>
            )}

            <div className="absolute bottom-2 left-2 z-[400] bg-[#1a1b26]/95 backdrop-blur rounded-lg p-2 border border-[#292e42] shadow-[0_2px_8px_rgba(0,0,0,0.4)] pointer-events-none">
                <div className="text-[9px] font-mono text-[#565f89] mb-1.5 font-bold tracking-wider">RISK MATRIX</div>
                <div className="flex items-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-sm mr-1.5 flex-shrink-0" style={{ background: '#f7768e', opacity: 0.8 }} />
                    <span className="text-[8px] font-mono text-[#565f89] uppercase">CRITICAL</span>
                </div>
                <div className="flex items-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-sm mr-1.5 flex-shrink-0" style={{ background: '#ff9e64', opacity: 0.8 }} />
                    <span className="text-[8px] font-mono text-[#565f89] uppercase">WARNING</span>
                </div>
                <div className="flex items-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-sm mr-1.5 flex-shrink-0" style={{ background: '#7dcfff', opacity: 0.3, border: '1px solid #7dcfff' }} />
                    <span className="text-[8px] font-mono text-[#565f89] uppercase">SAFE</span>
                </div>
            </div>
        </div>
    );
};

export default DisasterMap;
