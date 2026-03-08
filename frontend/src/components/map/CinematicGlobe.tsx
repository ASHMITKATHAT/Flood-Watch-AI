import React, { useRef, useState, useEffect } from 'react';
import Map, { Source, Layer, Marker, MapRef, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import { useSimulation } from '../../contexts/SimulationContext';
import { AlertTriangle } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

/* Dark basemap — Tokyo Dark aesthetic */
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/* ─── Risk zone polygons (generated after flyTo) ─── */
function generateRiskZone(lat: number, lng: number, radiusKm: number = 2): GeoJSON.Feature {
    const points = 40;
    const coords: [number, number][] = [];
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const r = radiusKm / 111; // degrees approx
        const jitter = 0.7 + Math.random() * 0.6; // organic shape
        coords.push([
            lng + r * Math.cos(angle) * jitter * (1 / Math.cos(lat * Math.PI / 180)),
            lat + r * Math.sin(angle) * jitter,
        ]);
    }
    return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coords] },
    };
}

/* ─── Component ─── */
const CinematicGlobe: React.FC = () => {
    const mapRef = useRef<MapRef>(null);
    const { coordinates, hasSearched, effectiveRiskLevel } = useSimulation();

    const [viewState, setViewState] = useState({
        longitude: 78.9629,
        latitude: 20.5937,
        zoom: 1.8,
        pitch: 0,
        bearing: 0,
    });

    const [riskZone, setRiskZone] = useState<GeoJSON.FeatureCollection | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [isFlying, setIsFlying] = useState(false);
    const [hasLanded, setHasLanded] = useState(false);

    // Single unified flyTo — reacts to coordinates from context
    // District changes, search bar selections, etc. all flow through setCoordinates()
    useEffect(() => {
        if (!hasSearched || !mapRef.current) return;

        const map = mapRef.current.getMap();
        if (!map) return;

        setShowOverlay(false);
        setRiskZone(null);
        setIsFlying(true);
        setHasLanded(false);

        map.flyTo({
            center: [coordinates.lng, coordinates.lat],
            zoom: 14,
            pitch: 60,
            bearing: 20,
            duration: 4000,
            essential: true,
        });

        const onMoveEnd = () => {
            setIsFlying(false);
            setHasLanded(true);
            const zone = generateRiskZone(coordinates.lat, coordinates.lng);
            setRiskZone({ type: 'FeatureCollection', features: [zone] });
            setTimeout(() => setShowOverlay(true), 200);
            map.off('moveend', onMoveEnd);
        };

        map.on('moveend', onMoveEnd);

        return () => {
            map.off('moveend', onMoveEnd);
        };
    }, [coordinates.lat, coordinates.lng, hasSearched]);

    // Risk color based on level
    const riskColor = effectiveRiskLevel === 'CRITICAL' ? '#f7768e'
        : effectiveRiskLevel === 'HIGH' ? '#ff9e64'
            : effectiveRiskLevel === 'MODERATE' ? '#e0af68'
                : '#9ece6a';

    const riskColorFaded = effectiveRiskLevel === 'CRITICAL' ? 'rgba(247, 118, 142, 0.15)'
        : effectiveRiskLevel === 'HIGH' ? 'rgba(255, 158, 100, 0.15)'
            : effectiveRiskLevel === 'MODERATE' ? 'rgba(224, 175, 104, 0.15)'
                : 'rgba(158, 206, 106, 0.12)';

    return (
        <div className="relative w-full h-full">
            <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt: ViewStateChangeEvent) => setViewState({
                    longitude: evt.viewState.longitude,
                    latitude: evt.viewState.latitude,
                    zoom: evt.viewState.zoom,
                    pitch: evt.viewState.pitch ?? 0,
                    bearing: evt.viewState.bearing ?? 0,
                })}
                mapStyle={DARK_STYLE}
                style={{ width: '100%', height: '100%' }}
                attributionControl={false}
                antialias
            >
                {/* Risk zone polygon — only shown after flyTo completes */}
                {showOverlay && riskZone && (
                    <Source id="risk-zone" type="geojson" data={riskZone}>
                        <Layer
                            id="risk-zone-fill"
                            type="fill"
                            paint={{
                                'fill-color': riskColorFaded,
                                'fill-opacity': 0.6,
                            }}
                        />
                        <Layer
                            id="risk-zone-border"
                            type="line"
                            paint={{
                                'line-color': riskColor,
                                'line-width': 2,
                                'line-opacity': 0.8,
                                'line-dasharray': [2, 2],
                            }}
                        />
                    </Source>
                )}

                {/* Target marker — shown after landing */}
                {showOverlay && hasLanded && (
                    <Marker
                        longitude={coordinates.lng}
                        latitude={coordinates.lat}
                        anchor="center"
                    >
                        <div className="relative flex items-center justify-center">
                            {/* Pulsing ring */}
                            <div
                                className="absolute w-12 h-12 rounded-full animate-ping"
                                style={{ backgroundColor: `${riskColor}20`, borderColor: riskColor, borderWidth: 1 }}
                            />
                            {/* Core dot */}
                            <div
                                className="w-4 h-4 rounded-full border-2 shadow-lg z-10"
                                style={{
                                    backgroundColor: riskColor,
                                    borderColor: '#1a1b26',
                                    boxShadow: `0 0 15px ${riskColor}80`,
                                }}
                            />
                        </div>
                    </Marker>
                )}
            </Map>

            {/* HUD Overlays */}
            {/* Crosshair when flying */}
            {isFlying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="relative">
                        <div className="w-16 h-16 border border-[#7dcfff]/30 rounded-full animate-pulse" />
                        <div className="absolute top-1/2 left-0 w-full h-px bg-[#7dcfff]/20" />
                        <div className="absolute left-1/2 top-0 h-full w-px bg-[#7dcfff]/20" />
                    </div>
                </div>
            )}

            {/* Status badge */}
            <div className="absolute bottom-3 left-3 z-20">
                {isFlying ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1b26]/90 backdrop-blur-md rounded-lg border border-[#7aa2f7]/30 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                        <div className="w-2 h-2 bg-[#7aa2f7] rounded-full animate-pulse shadow-[0_0_6px_rgba(122,162,247,0.5)]" />
                        <span className="text-[10px] font-mono text-[#7aa2f7] tracking-wider">ACQUIRING TARGET...</span>
                    </div>
                ) : hasLanded ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1b26]/90 backdrop-blur-md rounded-lg border border-[#9ece6a]/30 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                        <div className="w-2 h-2 bg-[#9ece6a] rounded-full shadow-[0_0_6px_rgba(158,206,106,0.5)]" />
                        <span className="text-[10px] font-mono text-[#9ece6a] tracking-wider">TARGET LOCKED</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1b26]/90 backdrop-blur-md rounded-lg border border-[#292e42] shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                        <div className="w-2 h-2 bg-[#565f89] rounded-full" />
                        <span className="text-[10px] font-mono text-[#565f89] tracking-wider">STANDBY</span>
                    </div>
                )}
            </div>

            {/* Risk warning badge — after landing */}
            {showOverlay && effectiveRiskLevel && effectiveRiskLevel !== 'SAFE' && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#1a1b26]/90 backdrop-blur-md rounded-lg border shadow-[0_4px_12px_rgba(0,0,0,0.4)] animate-pulse"
                    style={{ borderColor: `${riskColor}50` }}>
                    <AlertTriangle className="w-3 h-3" style={{ color: riskColor }} />
                    <span className="text-[10px] font-bold font-mono tracking-wider" style={{ color: riskColor }}>
                        RISK: {effectiveRiskLevel}
                    </span>
                </div>
            )}

            {/* Grid coordinates HUD */}
            {hasSearched && (
                <div className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-[#1a1b26]/90 backdrop-blur-md rounded-lg border border-[#292e42] shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                    <span className="text-[10px] font-mono text-[#7dcfff]/80">
                        {coordinates.lat.toFixed(4)}°N, {coordinates.lng.toFixed(4)}°E
                    </span>
                </div>
            )}
        </div>
    );
};

export default CinematicGlobe;
