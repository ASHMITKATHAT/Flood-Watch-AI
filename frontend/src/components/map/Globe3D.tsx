import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Risk Zone Data ──────────────────────────────────────────
interface RiskZone {
    name: string;
    lat: number;
    lng: number;
    risk: 'critical' | 'high' | 'medium' | 'safe';
    depth: number;
    population: number;
}

const RISK_ZONES: RiskZone[] = [
    { name: 'Jaipur City Center', lat: 26.92, lng: 75.78, risk: 'critical', depth: 3.2, population: 45000 },
    { name: 'Sanganer Basin', lat: 26.83, lng: 75.79, risk: 'high', depth: 2.1, population: 22000 },
    { name: 'Tonk Road Area', lat: 26.87, lng: 75.80, risk: 'medium', depth: 1.2, population: 18000 },
    { name: 'Ajmer District', lat: 26.45, lng: 74.64, risk: 'high', depth: 1.8, population: 30000 },
    { name: 'Kota Riverside', lat: 25.21, lng: 75.86, risk: 'critical', depth: 4.5, population: 55000 },
    { name: 'Udaipur Lakes', lat: 24.59, lng: 73.71, risk: 'medium', depth: 0.9, population: 12000 },
    { name: 'Jodhpur Outskirts', lat: 26.24, lng: 73.02, risk: 'safe', depth: 0.2, population: 8000 },
    { name: 'Bikaner North', lat: 28.02, lng: 73.31, risk: 'safe', depth: 0.1, population: 5000 },
    { name: 'Ludhiana Canal', lat: 30.90, lng: 75.86, risk: 'critical', depth: 3.8, population: 62000 },
    { name: 'Patna Floodplain', lat: 25.61, lng: 85.14, risk: 'high', depth: 2.6, population: 40000 },
];

const RISK_COLORS: Record<string, string> = {
    critical: '#FF2A2A',
    high: '#FF8C00',
    medium: '#F5C542',
    safe: '#00F0FF',
};

// ─── Simplified Continent Outlines (lat, lng pairs) ──────────
// India outline (simplified)
const INDIA: [number, number][] = [
    [35.5, 77], [35, 75], [34, 74], [33, 74], [32.5, 75], [31.5, 75], [30.5, 74], [29, 73], [27.5, 70], [25.5, 68.5],
    [24, 68], [23.5, 68.5], [23, 68], [22, 69], [21, 70], [20.5, 72], [19.5, 73], [18, 73], [16, 73.5], [14.5, 74],
    [12, 75], [10, 76], [8, 77], [8, 77.5], [10, 79], [12, 80], [14, 80], [16, 81], [18, 83], [20, 87], [21, 88],
    [22, 89], [23, 89], [24, 89], [25, 88.5], [26, 89.5], [27, 89], [28, 88], [27, 87], [26.5, 86], [26, 85],
    [25.5, 84], [26, 83], [27, 84], [28, 84], [29, 82], [30, 81], [30.5, 80], [30, 79], [31, 78], [32, 77],
    [34, 76], [35.5, 77],
];
// South Asia region (Pakistan, Sri Lanka outlines)
const PAKISTAN: [number, number][] = [
    [36.5, 71], [35.5, 72], [35, 74], [33, 74], [31, 74], [30, 71], [29, 70], [28, 68], [27, 68], [25.5, 68.5],
    [25, 63], [25.5, 61.5], [26, 63], [27, 65], [28, 66], [29, 67], [30, 67], [31, 69], [33, 70], [35, 71], [36.5, 71],
];
const SRILANKA: [number, number][] = [
    [9.8, 80], [9, 80.5], [8, 80.5], [7, 80], [6.5, 80.5], [6, 81], [7, 82], [8.5, 81.5], [9.5, 80.5], [9.8, 80],
];
// Africa coast (very simplified)
const AFRICA: [number, number][] = [
    [37, 10], [36, 1], [33, 0], [30, 30], [25, 35], [20, 40], [15, 42], [10, 45], [5, 42], [0, 42], [-5, 40],
    [-10, 40], [-15, 35], [-20, 35], [-25, 33], [-30, 31], [-34, 26], [-34, 18], [-30, 17], [-25, 15], [-20, 12],
    [-15, 12], [-10, 14], [-5, 10], [0, 2], [5, -5], [5, 0], [10, -15], [15, -17], [20, -17], [25, -15], [30, -10],
    [35, -1], [37, 10],
];
// Europe (simplified)
const EUROPE: [number, number][] = [
    [36, -6], [37, 0], [38, 0], [40, 0], [42, 3], [43, 5], [44, 8], [46, 7], [47, 5], [48, 2], [49, 0], [51, -5],
    [53, -6], [55, -3], [58, -6], [60, 5], [63, 5], [65, 14], [68, 16], [70, 20], [70, 28], [65, 28], [60, 30],
    [55, 28], [50, 30], [48, 20], [47, 15], [45, 14], [43, 16], [42, 18], [40, 20], [39, 20], [38, 24], [36, 23],
    [35, 25], [38, 28], [40, 30], [42, 28], [45, 30], [48, 40], [50, 40], [52, 37], [55, 38], [58, 32],
];
// Asia mainland (simplified)
const ASIA: [number, number][] = [
    [42, 28], [45, 30], [50, 40], [55, 38], [58, 55], [60, 60], [55, 70], [50, 55], [48, 55], [45, 50], [42, 45],
    [40, 50], [38, 48], [37, 55], [40, 60], [50, 68], [55, 73], [60, 70], [63, 72], [65, 75], [68, 70], [70, 70],
    [72, 130], [68, 135], [62, 140], [55, 135], [50, 130], [45, 132], [42, 132], [40, 125], [38, 122], [35, 120],
    [30, 122], [25, 120], [22, 114], [20, 110], [15, 108], [10, 105], [5, 103], [1, 104],
];
// South America (simplified)
const SOUTH_AMERICA: [number, number][] = [
    [12, -72], [10, -75], [5, -77], [0, -80], [-5, -81], [-10, -78], [-15, -75], [-20, -70], [-25, -70],
    [-30, -70], [-35, -72], [-40, -72], [-45, -74], [-50, -75], [-55, -69], [-55, -65], [-52, -60], [-48, -55],
    [-42, -60], [-38, -58], [-35, -55], [-30, -50], [-25, -48], [-20, -40], [-15, -39], [-10, -37],
    [-5, -35], [0, -50], [5, -60], [8, -62], [10, -67], [12, -72],
];
// North America (simplified)
const NORTH_AMERICA: [number, number][] = [
    [70, -140], [65, -168], [60, -165], [55, -160], [55, -135], [50, -130], [48, -125], [45, -124],
    [40, -124], [35, -120], [30, -115], [25, -110], [20, -105], [15, -92], [15, -88], [18, -88], [20, -87],
    [22, -90], [25, -90], [28, -83], [30, -85], [30, -80], [35, -76], [40, -74], [42, -70], [44, -68],
    [47, -68], [48, -65], [50, -60], [52, -56], [55, -58], [60, -65], [65, -62], [70, -55], [72, -60],
    [72, -80], [70, -100], [72, -120], [70, -140],
];
// Australia
const AUSTRALIA: [number, number][] = [
    [-12, 136], [-14, 130], [-15, 129], [-20, 119], [-22, 114], [-25, 114], [-28, 114], [-32, 115],
    [-35, 117], [-35, 137], [-38, 145], [-38, 148], [-33, 152], [-28, 153], [-24, 152], [-20, 149],
    [-18, 146], [-15, 145], [-12, 142], [-12, 136],
];

const CONTINENTS: { path: [number, number][]; color: string; lineWidth: number }[] = [
    { path: INDIA, color: 'rgba(0, 240, 255, 0.45)', lineWidth: 2 },
    { path: PAKISTAN, color: 'rgba(0, 240, 255, 0.2)', lineWidth: 1 },
    { path: SRILANKA, color: 'rgba(0, 240, 255, 0.2)', lineWidth: 1 },
    { path: AFRICA, color: 'rgba(0, 240, 255, 0.12)', lineWidth: 0.8 },
    { path: EUROPE, color: 'rgba(0, 240, 255, 0.12)', lineWidth: 0.8 },
    { path: ASIA, color: 'rgba(0, 240, 255, 0.15)', lineWidth: 0.8 },
    { path: SOUTH_AMERICA, color: 'rgba(0, 240, 255, 0.12)', lineWidth: 0.8 },
    { path: NORTH_AMERICA, color: 'rgba(0, 240, 255, 0.12)', lineWidth: 0.8 },
    { path: AUSTRALIA, color: 'rgba(0, 240, 255, 0.12)', lineWidth: 0.8 },
];

// India fill for highlighting
const INDIA_FILL_COLOR = 'rgba(0, 240, 255, 0.06)';

// ── Convert lat/lng to canvas sphere coords ──
function latLngToCanvas(
    lat: number, lng: number,
    rotY: number, tilt: number,
    cx: number, cy: number, radius: number
): { x: number; y: number; z: number; visible: boolean } {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180) + rotY;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const y2 = y * cosT - z * sinT;
    const z2 = y * sinT + z * cosT;

    return { x: cx + x, y: cy - y2, z: z2, visible: z2 > 0 };
}

// ── Draw Grid Lines ──
function drawGridLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotY: number, tilt: number) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 3) {
            const p = latLngToCanvas(lat, lng, rotY, tilt, cx, cy, r);
            if (p.visible) {
                if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
            } else started = false;
        }
        ctx.stroke();
    }
    for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
            const p = latLngToCanvas(lat, lng, rotY, tilt, cx, cy, r);
            if (p.visible) {
                if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
            } else started = false;
        }
        ctx.stroke();
    }
}

// ── Draw Continent Outlines ──
function drawContinents(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotY: number, tilt: number) {
    for (const continent of CONTINENTS) {
        ctx.strokeStyle = continent.color;
        ctx.lineWidth = continent.lineWidth;
        ctx.beginPath();
        let started = false;
        let allVisible = true;
        const points: { x: number; y: number }[] = [];

        for (const [lat, lng] of continent.path) {
            const p = latLngToCanvas(lat, lng, rotY, tilt, cx, cy, r);
            if (p.visible) {
                if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
                points.push({ x: p.x, y: p.y });
            } else {
                allVisible = false;
                started = false;
            }
        }
        ctx.stroke();

        // Fill India with a subtle glow
        if (continent.path === INDIA && allVisible && points.length > 3) {
            ctx.fillStyle = INDIA_FILL_COLOR;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// ── Draw Globe ──
function drawGlobe(
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    rotY: number, tilt: number,
    time: number,
    hoveredZone: RiskZone | null,
) {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.38;

    ctx.clearRect(0, 0, width, height);

    // Atmosphere glow
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.3);
    glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
    glowGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.03)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Globe body
    const globeGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    globeGrad.addColorStop(0, '#0d1a2f');
    globeGrad.addColorStop(0.7, '#060d1f');
    globeGrad.addColorStop(1, '#020510');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = globeGrad;
    ctx.fill();

    // Globe edge
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Clip to globe
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Grid
    drawGridLines(ctx, cx, cy, r, rotY, tilt);

    // Continent outlines
    drawContinents(ctx, cx, cy, r, rotY, tilt);

    // Risk zones
    const zonePositions: { zone: RiskZone; x: number; y: number; visible: boolean }[] = [];

    RISK_ZONES.forEach(zone => {
        const p = latLngToCanvas(zone.lat, zone.lng, rotY, tilt, cx, cy, r);
        zonePositions.push({ zone, x: p.x, y: p.y, visible: p.visible });
        if (!p.visible) return;

        const color = RISK_COLORS[zone.risk];
        const pulse = 1 + 0.3 * Math.sin(time * (zone.risk === 'critical' ? 4 : 2.5));
        const baseSize = zone.risk === 'critical' ? 8 : zone.risk === 'high' ? 6 : 5;
        const size = baseSize * pulse;
        const isHovered = hoveredZone?.name === zone.name;

        // Ripple
        if (zone.risk !== 'safe') {
            const ripple = (time * 1.5) % 3;
            const rippleR = size * (1 + ripple);
            const rippleAlpha = Math.max(0, 0.2 - ripple * 0.07);
            ctx.beginPath();
            ctx.arc(p.x, p.y, rippleR, 0, Math.PI * 2);
            ctx.strokeStyle = `${color}${Math.round(rippleAlpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Glow
        const glowR = size * 2.5;
        const zoneGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        zoneGlow.addColorStop(0, `${color}40`);
        zoneGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = zoneGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? size * 1.5 : size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    ctx.restore(); // Unclip

    return zonePositions;
}

// ─── Layer Toggle ────────────
const LAYERS = ['Precipitation', 'Flood Risk Zones', 'Sensor Reports'] as const;

// ─── Main Component ──────────
interface Globe3DProps {
    centerLat?: number;
    centerLng?: number;
    onZoneSelect?: (zone: RiskZone | null) => void;
    className?: string;
}

const Globe3D: React.FC<Globe3DProps> = ({ centerLat, centerLng, onZoneSelect, className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
    const [hoveredZone, setHoveredZone] = useState<RiskZone | null>(null);
    const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['Flood Risk Zones']));
    const rotRef = useRef(0);
    const zonePositionsRef = useRef<{ zone: RiskZone; x: number; y: number; visible: boolean }[]>([]);
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const tiltRef = useRef(0.3);

    useEffect(() => {
        if (centerLat !== undefined && centerLng !== undefined) {
            rotRef.current = -(centerLng + 180) * (Math.PI / 180) + Math.PI;
        }
    }, [centerLat, centerLng]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animFrame: number;
        let time = 0;

        const render = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth * window.devicePixelRatio;
                canvas.height = parent.clientHeight * window.devicePixelRatio;
                canvas.style.width = parent.clientWidth + 'px';
                canvas.style.height = parent.clientHeight + 'px';
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
            const w = parent?.clientWidth || canvas.width;
            const h = parent?.clientHeight || canvas.height;

            time += 0.016;
            if (!isDraggingRef.current) rotRef.current += 0.002;

            const positions = drawGlobe(ctx, w, h, rotRef.current, tiltRef.current, time, hoveredZone);
            if (positions) zonePositionsRef.current = positions;

            animFrame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animFrame);
    }, [hoveredZone]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDraggingRef.current) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            rotRef.current += dx * 0.005;
            tiltRef.current = Math.max(-0.8, Math.min(0.8, tiltRef.current + dy * 0.005));
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            let found: RiskZone | null = null;
            for (const pos of zonePositionsRef.current) {
                if (!pos.visible) continue;
                if (Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2) < 15) { found = pos.zone; break; }
            }
            setHoveredZone(found);
        }
    }, []);

    const handleMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const pos of zonePositionsRef.current) {
            if (!pos.visible) continue;
            if (Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2) < 15) {
                setSelectedZone(prev => prev?.name === pos.zone.name ? null : pos.zone);
                onZoneSelect?.(pos.zone);
                return;
            }
        }
        setSelectedZone(null);
        onZoneSelect?.(null);
    }, [onZoneSelect]);

    const toggleLayer = (layer: string) => {
        setActiveLayers(prev => {
            const next = new Set(prev);
            if (next.has(layer)) next.delete(layer); else next.add(layer);
            return next;
        });
    };

    return (
        <div className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden ${className}`}>
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
            />

            {/* Popup */}
            {selectedZone && (() => {
                const pos = zonePositionsRef.current.find(p => p.zone.name === selectedZone.name);
                if (!pos || !pos.visible) return null;
                const color = RISK_COLORS[selectedZone.risk];
                return (
                    <div className="absolute z-20 w-60 p-4 rounded-xl border animate-fade-in"
                        style={{
                            left: Math.min(pos.x, (canvasRef.current?.parentElement?.clientWidth || 400) - 260),
                            top: Math.max(0, pos.y - 180),
                            background: 'rgba(6,13,31,0.95)', backdropFilter: 'blur(16px)',
                            borderColor: `${color}40`, boxShadow: `0 0 20px ${color}20`,
                        }}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-xs font-mono text-[#565f89] uppercase tracking-wider">{selectedZone.name}</div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider inline-block mt-1"
                                    style={{ color, borderColor: `${color}40`, background: `${color}15` }}>{selectedZone.risk}</span>
                            </div>
                            <button onClick={() => { setSelectedZone(null); onZoneSelect?.(null); }} className="text-[#565f89] hover:text-[#c0caf5] text-lg leading-none transition-colors duration-200">×</button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-[#1f2335]/60 border border-[#414868]">
                                <span className="text-[11px] text-[#565f89]">Water Depth</span>
                                <span className="text-sm font-bold font-digital" style={{ color }}>{selectedZone.depth}m</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-[#1f2335]/60 border border-[#414868]">
                                <span className="text-[11px] text-[#565f89]">Affected Pop.</span>
                                <span className="text-sm font-bold text-[#c0caf5] font-mono">{selectedZone.population.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-[#1f2335]/60 border border-[#414868]">
                                <span className="text-[11px] text-[#565f89]">Coordinates</span>
                                <span className="text-[11px] text-[#a9b1d6] font-mono">{selectedZone.lat.toFixed(2)}°N, {selectedZone.lng.toFixed(2)}°E</span>
                            </div>
                        </div>
                        <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((selectedZone.depth / 5) * 100, 100)}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
                        </div>
                    </div>
                );
            })()}

            {/* Layer toggles */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                {LAYERS.map(layer => (
                    <button key={layer} onClick={() => toggleLayer(layer)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all duration-200 ease-in-out backdrop-blur-md border
                            ${activeLayers.has(layer)
                                ? 'bg-[#7aa2f7]/10 text-[#7aa2f7] border-[#7aa2f7]/30 shadow-[0_0_8px_rgba(122,162,247,0.15)]'
                                : 'bg-[#1f2335]/80 text-[#565f89] border-[#414868] hover:text-[#c0caf5] hover:border-[#565f89]'}`}>
                        {layer.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 bg-[#1a1b26]/80 backdrop-blur-md rounded-lg p-3 border border-[#414868]">
                <div className="text-[9px] font-mono text-[#565f89] mb-2 font-bold tracking-wider">RISK ZONES</div>
                {Object.entries(RISK_COLORS).map(([level, color]) => (
                    <div key={level} className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}40` }} />
                        <span className="text-[9px] font-mono text-[#565f89] uppercase">{level}</span>
                    </div>
                ))}
            </div>

            {/* Scan line */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/15 to-transparent animate-scan-line" />
            </div>
        </div>
    );
};

export default Globe3D;
