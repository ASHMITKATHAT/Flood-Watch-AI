import React, { useState, useEffect } from 'react';
import { Users, MapPin, Camera, AlertTriangle, CheckCircle, Clock, Send, Upload, ChevronDown } from 'lucide-react';
import { fetchCivilianReports, submitCivilianReport } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface DBReport {
    id: string;
    description: string;
    latitude: number;
    longitude: number;
    status: 'verified' | 'pending' | 'rejected';
    created_at: string;
    user_mobile: string;
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
    critical: { color: '#FF2A2A', bg: 'rgba(255,42,42,0.08)' },
    high: { color: '#FF8C00', bg: 'rgba(255,140,0,0.08)' },
    medium: { color: '#F5C542', bg: 'rgba(245,197,66,0.08)' },
    low: { color: '#00F0FF', bg: 'rgba(0,240,255,0.08)' },
};

const STATUS_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    verified: { icon: CheckCircle, color: '#10B981' },
    pending: { icon: Clock, color: '#F59E0B' },
    rejected: { icon: AlertTriangle, color: '#FF2A2A' },
};

const REPORT_TYPES = ['Water Logging', 'Flooding', 'Rising Water', 'Road Blocked', 'Structural Risk', 'Landslide', 'Other'];

const HumanSensorPage: React.FC = () => {
    const { activeDistrict } = useAuth();
    const [reports, setReports] = useState<DBReport[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ location: '', type: REPORT_TYPES[0], severity: 'medium', description: '' });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadReports = async () => {
        try {
            const data = await fetchCivilianReports();
            if (data) {
                setReports(data as DBReport[]);
                window.dispatchEvent(new Event('supabase_online'));
            }
        } catch (err) {
            console.error("Failed to fetch reports:", err);
            window.dispatchEvent(new Event('supabase_offline'));
        }
    };

    useEffect(() => {
        loadReports();
        // Poll every 30 seconds
        const interval = setInterval(loadReports, 30000);
        return () => clearInterval(interval);
    }, [activeDistrict]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const newReport = {
                user_mobile: 'Citizen #' + Math.floor(1000 + Math.random() * 9000),
                description: `${formData.type} - ${formData.location}: ${formData.description}`,
                latitude: 26.9124,
                longitude: 75.7873,
                status: 'pending',
            };

            await submitCivilianReport(newReport);

            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setShowForm(false);
                setFormData({ location: '', type: REPORT_TYPES[0], severity: 'medium', description: '' });
                loadReports(); // Refresh the list
            }, 2000);
        } catch (err) {
            console.error('Failed to submit report:', err);
            window.dispatchEvent(new Event('supabase_offline'));
            alert('Failed to submit report. System offline or connection error.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] p-4 md:p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold font-digital tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">HUMAN SENSOR NETWORK</h1>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">Crowdsourced flood intelligence from field operatives</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-xs font-mono hover:bg-neon-cyan/20 transition-all shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                    <Send className="w-4 h-4" /> SUBMIT REPORT
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Active Reports', value: reports.length.toString(), color: '#00F0FF' },
                    { label: 'Verified Today', value: reports.filter(r => r.status === 'verified').length.toString(), color: '#10B981' },
                    { label: 'Pending review', value: reports.filter(r => r.status === 'pending').length.toString(), color: '#F59E0B' },
                    { label: 'Field Operators', value: '142', color: '#8B5CF6' },
                ].map(stat => (
                    <div key={stat.label} className="bg-slate-900/80 backdrop-blur-md p-4 border border-[#414868] rounded-xl hover:border-[#7aa2f7]/50 transition-colors">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        <div className="text-2xl font-bold font-digital mt-1" style={{ color: stat.color }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Submit Form (collapsible) */}
            {showForm && (
                <div className="bg-slate-900/80 backdrop-blur-md p-6 border border-[#7aa2f7]/40 mb-6 animate-fade-in rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    {submitted ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <CheckCircle className="w-12 h-12 text-[#10B981] mb-3" />
                            <span className="text-lg font-bold font-digital text-[#10B981]">REPORT SUBMITTED</span>
                            <span className="text-xs text-slate-400 font-mono mt-1">Intelligence received. Processing...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="text-xs font-mono text-[#7aa2f7] uppercase tracking-widest mb-2 flex items-center gap-2"><Upload className="w-4 h-4" /> New Field Report</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required placeholder="e.g., Jaipur – Bani Park"
                                            className="w-full bg-[#1f2335] border border-[#414868] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#c0caf5] placeholder-slate-500 focus:border-[#7aa2f7] outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Report Type</label>
                                    <div className="relative">
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-[#1f2335] border border-[#414868] rounded-lg px-4 py-2.5 text-sm text-[#c0caf5] appearance-none focus:border-[#7aa2f7] outline-none">
                                            {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Severity</label>
                                    <div className="flex gap-2">
                                        {['low', 'medium', 'high', 'critical'].map(sev => (
                                            <button key={sev} type="button" onClick={() => setFormData({ ...formData, severity: sev })}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all
                                                    ${formData.severity === sev ? '' : 'border-[#414868] text-slate-400 bg-[#1f2335]'}`}
                                                style={formData.severity === sev ? { color: SEVERITY_STYLES[sev].color, background: SEVERITY_STYLES[sev].bg, borderColor: SEVERITY_STYLES[sev].color + '40' } : {}}>
                                                {sev}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Image Upload</label>
                                    <div className="flex items-center gap-3 p-2.5 bg-[#1f2335] border border-[#414868] rounded-lg">
                                        <Camera className="w-5 h-5 text-slate-400" />
                                        <span className="text-xs text-slate-400 font-mono">Drag & drop or click to upload</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required rows={3} placeholder="Describe the situation in detail..."
                                    className="w-full bg-[#1f2335] border border-[#414868] rounded-lg px-4 py-2.5 text-sm text-[#c0caf5] placeholder-slate-500 focus:border-[#7aa2f7] outline-none resize-none" />
                            </div>
                            <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-[#1f2335] hover:bg-[#7aa2f7]/20 border border-[#7aa2f7]/40 rounded-lg text-[#7aa2f7] font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(122,162,247,0.1)] focus:outline-none focus:ring-2 focus:ring-[#7aa2f7]/50">
                                {isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT REPORT →'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Reports Feed */}
            <div className="space-y-3">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4" /> Live Field Reports ({reports.length})
                </div>
                {reports.map(report => {
                    const sev = SEVERITY_STYLES[report.description.toLowerCase().includes('critical') ? 'critical' : 'medium'];
                    const stat = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
                    const StatusIcon = stat.icon;
                    return (
                        <div key={report.id} className="bg-slate-900/80 backdrop-blur-md p-4 border border-[#414868] hover:border-[#7aa2f7]/50 transition-all duration-300 group rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider" style={{ color: sev.color, background: sev.bg, borderColor: sev.color + '30' }}>FIELD REPORT</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-mono uppercase" style={{ color: stat.color }}>{report.status}</span>
                                </div>
                            </div>
                            <p className="text-sm text-[#c0caf5] mb-2 leading-relaxed">{report.description}</p>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" />Lat: {report.latitude.toFixed(3)}, Lng: {report.longitude.toFixed(3)}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{report.user_mobile}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono border border-[#414868] px-2 py-0.5 rounded">{new Date(report.created_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HumanSensorPage;
