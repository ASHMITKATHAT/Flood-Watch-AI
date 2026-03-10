import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface LogEntry {
    id: number;
    timestamp: string;
    level: string;
    message: string;
}

const TelemetryTerminal: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/telemetry?count=3');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.logs) {
                        setLogs(prev => {
                            const newLogs = [...prev, ...data.logs.map((l: LogEntry) => ({...l, id: Math.random()}))];
                            // Keep max 40 to avoid performance hit
                            return newLogs.slice(-40);
                        });
                    }
                }
            } catch (error) {
                console.error("Telemetry fetch error:", error);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'WARN': return 'text-[#e0af68]';
            case 'PROC': return 'text-[#bb9af7]'; // Info color in tokyo night
            case 'INFO': return 'text-[#7dcfff]';
            default: return 'text-[#c0caf5]';
        }
    };

    return (
        <div className="w-full h-full min-h-[300px] bg-slate-900/80 backdrop-blur-md rounded-xl border border-[#414868] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col pointer-events-auto">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#292e42] bg-[#1a1b26]/50">
                <Terminal className="w-4 h-4 text-[#7aa2f7]" />
                <span className="text-xs font-mono font-bold text-[#7aa2f7] tracking-wider">SYSTEM_TELEMETRY</span>
                <div className="ml-auto flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f7768e] hover:bg-[#ff9e64] transition-colors cursor-pointer shadow-[0_0_5px_rgba(247,118,142,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#e0af68] hover:bg-[#ff9e64] transition-colors cursor-pointer shadow-[0_0_5px_rgba(224,175,104,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#9ece6a] hover:bg-[#7dcfff] transition-colors cursor-pointer shadow-[0_0_5px_rgba(158,206,106,0.3)]" />
                </div>
            </div>
            
            {/* Terminal Body */}
            <div className="p-3 h-48 sm:h-56 overflow-y-auto font-mono text-[10px] sm:text-xs custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="text-[#565f89] flex items-center h-full justify-center">
                        <span className="animate-pulse">⏳ Awaiting downlink...</span>
                    </div>
                ) : (
                    <div className="space-y-1.5 flex flex-col">
                        {logs.map((log) => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:gap-2">
                                <span className="text-[#565f89] shrink-0">
                                    [{new Date(log.timestamp).toTimeString().split(' ')[0]}]
                                </span>
                                <span className={`font-bold shrink-0 ${getLevelColor(log.level)}`}>
                                    {log.level.padEnd(4)}
                                </span>
                                <span className="text-[#c0caf5] break-words">
                                    {log.message}
                                </span>
                            </div>
                        ))}
                        <div ref={bottomRef} className="h-1" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TelemetryTerminal;
