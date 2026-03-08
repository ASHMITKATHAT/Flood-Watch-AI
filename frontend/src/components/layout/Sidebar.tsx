import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    Bell,
    Radio,
    History,
    Settings,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Waves,
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/mission-control' },
    { id: 'human-sensor', label: 'Human Sensor', icon: Users, path: '/human-sensor' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
    { id: 'live-feed', label: 'Live Feed', icon: Radio, path: '/live-feed' },
    { id: 'simulations', label: 'Simulations', icon: History, path: '/simulations' },
];

const BOTTOM_ITEMS: NavItem[] = [
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    { id: 'help', label: 'Help', icon: HelpCircle, path: '/help' },
];

const Sidebar: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const renderNavItem = (item: NavItem) => {
        const active = isActive(item.path);
        const Icon = item.icon;
        return (
            <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`
          group relative flex items-center w-full rounded-lg transition-all duration-300
          ${collapsed ? 'justify-center px-3 py-3' : 'px-4 py-3 gap-3'}
          ${active
                        ? 'bg-[#292e42] text-[#7aa2f7] border border-[#7aa2f7]/20 shadow-[0_0_12px_rgba(122,162,247,0.08)]'
                        : 'text-[#565f89] hover:text-[#c0caf5] hover:bg-[#292e42]/50 border border-transparent'
                    }
        `}
                title={collapsed ? item.label : undefined}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${active ? 'text-[#7aa2f7] drop-shadow-[0_0_6px_rgba(122,162,247,0.4)]' : 'group-hover:text-[#c0caf5]'}`} />
                {!collapsed && (
                    <span className={`whitespace-nowrap overflow-hidden text-sm font-medium tracking-wide truncate ${active ? 'font-semibold' : ''}`}>
                        {item.label}
                    </span>
                )}
                {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#7aa2f7] rounded-r-full shadow-[0_0_8px_rgba(122,162,247,0.5)]" />
                )}
            </button>
        );
    };

    return (
        <aside
            className={`
        flex flex-col h-screen bg-[#16161e]
        border-r border-[#292e42] transition-all duration-300 z-50
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
        >
            {/* Brand Header */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-[#292e42] ${collapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 rounded-lg bg-[#292e42] border border-[#7dcfff]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(125,207,255,0.08)] animate-neon-breathe">
                    <Waves className="w-5 h-5 flex-shrink-0 text-[#7dcfff]" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="whitespace-nowrap overflow-hidden text-xs font-bold font-digital tracking-[0.2em] text-[#7dcfff] truncate drop-shadow-[0_0_8px_rgba(125,207,255,0.4)]">
                            FLOODWATCH
                        </span>
                        <span className="whitespace-nowrap overflow-hidden text-[10px] font-mono text-[#565f89] tracking-widest">
                            EQUINOX
                        </span>
                    </div>
                )}
            </div>

            {/* Main Nav */}
            <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto custom-scrollbar">
                {NAV_ITEMS.map(renderNavItem)}
            </nav>

            {/* Bottom Section */}
            <div className="flex flex-col gap-1 px-3 py-3 border-t border-[#292e42]">
                {BOTTOM_ITEMS.map(renderNavItem)}

                {/* Logout */}
                <button
                    onClick={logout}
                    className={`
            flex items-center w-full rounded-lg text-[#565f89] hover:text-[#f7768e] hover:bg-[#f7768e]/10
            transition-all duration-300 border border-transparent hover:border-[#f7768e]/20
            ${collapsed ? 'justify-center px-3 py-3' : 'px-4 py-3 gap-3'}
          `}
                    title={collapsed ? 'Logout' : undefined}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap overflow-hidden text-sm font-medium tracking-wide">Logout</span>}
                </button>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center w-full py-2 text-[#565f89] hover:text-[#c0caf5] transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
