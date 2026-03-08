import React from 'react';
import { BarChart3, Radio, Users, Settings, HelpCircle, Construction } from 'lucide-react';

interface PlaceholderPageProps {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, icon: Icon }) => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-gray-200 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,240,255,0.05)]">
                    <span className="text-blue-600/50"><Icon className="w-10 h-10" /></span>
                </div>
                <h1 className="text-2xl font-bold font-digital tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400 mb-3">
                    {title}
                </h1>
                <p className="text-sm text-slate-500 font-mono mb-6">{description}</p>
                <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Construction className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-widest">Under Development</span>
                </div>
            </div>
        </div>
    );
};

// Individual page exports
export const AnalyticsPage: React.FC = () => (
    <PlaceholderPage title="ANALYTICS" description="Historical data, trends, and risk analysis — coming soon." icon={BarChart3} />
);

export const LiveFeedPage: React.FC = () => (
    <PlaceholderPage title="LIVE FEED" description="Real-time feed of system events and field reports." icon={Radio} />
);

export const HumanSensorPage: React.FC = () => (
    <PlaceholderPage title="HUMAN SENSOR" description="Crowdsourced data collection and image uploads." icon={Users} />
);

export const SettingsPage: React.FC = () => (
    <PlaceholderPage title="SETTINGS" description="System configuration and user preferences." icon={Settings} />
);

export const HelpPage: React.FC = () => (
    <PlaceholderPage title="HELP & SUPPORT" description="Documentation, tutorials, and support resources." icon={HelpCircle} />
);

export const MapViewPage: React.FC = () => {
    // Lazy import Globe3D to avoid circular deps
    const Globe3D = React.lazy(() => import('../components/map/Globe3D'));
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <React.Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-blue-200 border-t-neon-cyan rounded-full animate-spin" />
                </div>
            }>
                <Globe3D className="w-full h-screen" />
            </React.Suspense>
        </div>
    );
};
