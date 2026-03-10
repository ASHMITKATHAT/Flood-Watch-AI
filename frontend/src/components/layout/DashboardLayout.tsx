import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        window.addEventListener('supabase_offline', handleOffline);
        window.addEventListener('supabase_online', handleOnline);
        return () => {
            window.removeEventListener('supabase_offline', handleOffline);
            window.removeEventListener('supabase_online', handleOnline);
        };
    }, []);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#1a1b26] relative">
            {isOffline && (
                <div className="absolute top-0 left-0 w-full z-[9999] bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 text-amber-200 text-center py-1.5 font-mono text-xs font-bold shadow-[0_4px_20px_rgba(217,119,6,0.2)] flex justify-center items-center gap-2 backdrop-blur-sm border-b border-amber-700/50">
                    <span className="animate-pulse">SYSTEM OFFLINE - RUNNING ON CACHED DATA</span>
                </div>
            )}
            <Sidebar />
            <main className="flex-1 flex flex-col relative h-full min-w-0">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
