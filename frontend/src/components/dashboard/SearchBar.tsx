import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Loader2, Globe } from 'lucide-react';
import { nominatim, NominatimResult } from '../../services/nominatim';
import { useSimulation } from '../../contexts/SimulationContext';

interface SearchBarProps {
    onLocationSelect?: (loc: { name: string; region: string; lat: number; lng: number }) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect }) => {
    const { setLocationName, setCoordinates, fetchLiveData } = useSimulation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Click outside to close
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced Nominatim search
    const searchNominatim = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const data = await nominatim.search(q);
            setResults(data);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setIsOpen(true);
        setActiveIndex(-1);

        // Debounce the API call
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchNominatim(value), 400);
    };

    const handleSelect = (result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Parse short name from display_name
        const parts = result.display_name.split(',');
        const name = parts[0]?.trim() || result.display_name;
        const region = parts[1]?.trim() || '';

        setQuery(result.display_name);
        setIsOpen(false);
        setActiveIndex(-1);

        // Update simulation context
        setLocationName(result.display_name);

        // Calculate zoom from bounding box
        let zoom = 12;
        if (result.boundingbox) {
            const [south, north, west, east] = result.boundingbox.map(Number);
            const latDiff = Math.abs(north - south);
            const lngDiff = Math.abs(east - west);
            const maxDiff = Math.max(latDiff, lngDiff);
            if (maxDiff > 5) zoom = 6;
            else if (maxDiff > 2) zoom = 8;
            else if (maxDiff > 0.5) zoom = 10;
            else if (maxDiff > 0.1) zoom = 12;
            else zoom = 14;
        }

        setCoordinates({ lat, lng, zoom });

        // Fetch REAL weather data from OpenWeather for these coordinates
        fetchLiveData(lat, lng);

        // Also call the legacy prop callback if provided
        if (onLocationSelect) {
            onLocationSelect({ name, region, lat, lng });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(results[activeIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const formatDisplayName = (name: string) => {
        const parts = name.split(',');
        return {
            primary: parts[0]?.trim() || name,
            secondary: parts.slice(1, 3).join(',').trim(),
        };
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
            <div className={`
                relative flex items-center rounded-xl transition-all duration-500
                bg-[#1f2335] border
                ${isOpen
                    ? 'border-[#7aa2f7]/40 shadow-[0_0_0_3px_rgba(122,162,247,0.08),0_0_16px_rgba(122,162,247,0.06)]'
                    : 'border-[#292e42]'
                }
            `}>
                {isSearching ? (
                    <Loader2 className="w-5 h-5 ml-4 flex-shrink-0 text-[#7aa2f7] animate-spin" />
                ) : (
                    <Search className={`w-5 h-5 ml-4 flex-shrink-0 transition-colors duration-300 ${isOpen ? 'text-[#7aa2f7]' : 'text-[#565f89]'}`} />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search any location... (e.g., Wayanad, Kerala)"
                    className="flex-1 bg-transparent text-[#c0caf5] text-sm font-medium py-3.5 px-3 outline-none placeholder-[#565f89]"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
                        className="mr-3 p-1 rounded-md text-[#565f89] hover:text-[#c0caf5] hover:bg-[#292e42] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (results.length > 0 || isSearching) && (
                <div className="absolute top-full mt-2 w-full rounded-xl bg-[#1f2335] border border-[#292e42] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-fade-in backdrop-blur-xl">
                    <div className="p-2 border-b border-[#292e42] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-[#565f89]" />
                            <span className="text-[10px] font-mono text-[#565f89] uppercase tracking-widest">
                                {isSearching ? 'SEARCHING...' : `${results.length} RESULTS`}
                            </span>
                        </div>
                        <span className="text-[9px] font-mono text-[#565f89]/60">NOMINATIM API</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
                        {results.map((result, i) => {
                            const { primary, secondary } = formatDisplayName(result.display_name);
                            return (
                                <button
                                    key={`${result.lat}-${result.lon}-${i}`}
                                    onClick={() => handleSelect(result)}
                                    className={`
                                        flex items-center gap-3 w-full px-4 py-3 text-left transition-all duration-200
                                        ${i === activeIndex ? 'bg-[#7aa2f7]/10 text-[#7aa2f7]' : 'text-[#c0caf5] hover:bg-[#292e42]/60 hover:text-[#c0caf5]'}
                                    `}
                                >
                                    <MapPin className={`w-4 h-4 flex-shrink-0 ${i === activeIndex ? 'text-[#7aa2f7]' : 'text-[#565f89]'}`} />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{primary}</span>
                                        <span className="text-[11px] text-[#565f89] truncate">{secondary}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-[#565f89] flex-shrink-0">
                                        {parseFloat(result.lat).toFixed(2)}°, {parseFloat(result.lon).toFixed(2)}°
                                    </div>
                                </button>
                            );
                        })}
                        {isSearching && results.length === 0 && (
                            <div className="flex items-center justify-center py-6 text-[#565f89]">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-xs font-mono">Querying OpenStreetMap...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* No results */}
            {isOpen && !isSearching && query.length >= 2 && results.length === 0 && (
                <div className="absolute top-full mt-2 w-full rounded-xl bg-[#1f2335] border border-[#292e42] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                    <div className="flex items-center justify-center py-6 text-[#565f89]">
                        <span className="text-xs font-mono">No locations found for "{query}"</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
