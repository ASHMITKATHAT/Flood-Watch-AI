import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Phone, MapPin, UploadCloud, Ambulance, Shield, Clock, CheckCircle, Loader2, Lock, Activity } from 'lucide-react';
import LiveTicker from '../components/dashboard/LiveTicker';
import DisasterMap from '../components/map/DisasterMap';
import { submitReport, ReportResponse } from '../services/api';

const CitizenDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [utcTime, setUtcTime] = useState('');

    // Report form state
    const [reportDesc, setReportDesc] = useState('');
    const [reportOtp, setReportOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<ReportResponse | null>(null);
    const [submitError, setSubmitError] = useState('');

    React.useEffect(() => {
        const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSendOtp = () => {
        setOtpSent(true);
        setSubmitError('');
    };

    const handleSubmitReport = async () => {
        if (!reportOtp) {
            setSubmitError('Please enter OTP');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        setSubmitResult(null);

        try {
            const res = await submitReport({
                mobile: user?.mobile || '',
                otp: reportOtp,
                description: reportDesc,
                latitude: 26.9124,
                longitude: 75.7873,
                image_name: 'flood_photo.jpg',
            });

            if (res.success) {
                setSubmitResult(res);
                setReportDesc('');
                setReportOtp('');
                setOtpSent(false);
            } else {
                setSubmitError(res.error || 'Submission failed');
            }
        } catch (err: any) {
            setSubmitError(err.message || 'Network error — is the backend running?');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 pb-16">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 glass-panel border-b border-gray-200 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold font-digital text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-400">CITIZEN UPLINK</h1>
                    <div className="flex items-center space-x-3 mt-1">
                        <p className="text-sm text-gray-500 font-mono">ID: {user?.mobile}</p>
                        <span className="text-slate-700">|</span>
                        <div className="flex items-center text-xs text-slate-500 font-mono">
                            <Clock className="w-3 h-3 mr-1 text-blue-600" />
                            {utcTime} UTC
                        </div>
                    </div>
                </div>
                <button onClick={logout} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-mono border border-red-500/30">
                    DISCONNECT
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">

                {/* Left: Emergency + Map */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Emergency Panel */}
                    <div className="glass-panel border-l-4 border-neon-red relative overflow-hidden border-glow-red">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
                            <AlertTriangle className="w-28 h-28 text-neon-red" />
                        </div>
                        <h2 className="text-lg font-bold mb-5 flex items-center text-neon-red font-digital tracking-wider">
                            <Activity className="w-5 h-5 mr-2 animate-pulse" />
                            EMERGENCY SOS HUB
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <a href="tel:100" className="flex flex-col items-center justify-center p-5 bg-red-600/10 border border-red-500/30 rounded-xl hover:bg-red-600/20 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,42,42,0.2)] transition-all group">
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full group-hover:bg-red-500/30 transition-all" />
                                    <Phone className="w-8 h-8 text-red-400 relative z-10" />
                                </div>
                                <span className="font-bold text-red-100 text-sm tracking-wider">CALL NDRF</span>
                                <span className="text-[10px] text-red-400/60 font-mono mt-1">1078 / 112</span>
                            </a>
                            <a href="tel:108" className="flex flex-col items-center justify-center p-5 bg-orange-600/10 border border-orange-500/30 rounded-xl hover:bg-orange-600/20 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(249,115,22,0.2)] transition-all group">
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full group-hover:bg-orange-500/30 transition-all" />
                                    <Ambulance className="w-8 h-8 text-orange-400 relative z-10" />
                                </div>
                                <span className="font-bold text-orange-100 text-sm tracking-wider">AMBULANCE</span>
                                <span className="text-[10px] text-orange-400/60 font-mono mt-1">108</span>
                            </a>
                            <a href="#shelters" className="flex flex-col items-center justify-center p-5 bg-emerald-600/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/20 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all group">
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full group-hover:bg-emerald-500/30 transition-all" />
                                    <Shield className="w-8 h-8 text-emerald-400 relative z-10" />
                                </div>
                                <span className="font-bold text-emerald-100 text-sm tracking-wider">SAFE SHELTER</span>
                                <span className="text-[10px] text-emerald-400/60 font-mono mt-1">Nearest: 0.8 km</span>
                            </a>
                        </div>
                    </div>

                    {/* Local Risk Map */}
                    <div className="glass-panel p-0 overflow-hidden border border-gray-200 h-[350px] relative">
                        <div className="absolute top-0 left-0 p-2 z-[500] bg-white/90 backdrop-blur rounded-br-lg border-b border-r border-gray-200">
                            <div className="text-xs font-mono text-blue-600 flex items-center">
                                <MapPin className="w-3 h-3 mr-2" />
                                YOUR LOCAL RISK MAP
                            </div>
                        </div>
                        <DisasterMap scenario="live" compact />
                    </div>

                    {/* Nearest Hospitals */}
                    <div className="glass-panel">
                        <h3 className="font-bold mb-4 flex items-center text-blue-600 text-sm font-digital tracking-wider">
                            <MapPin className="w-4 h-4 mr-2" />
                            NEAREST MEDICAL FACILITIES
                        </h3>
                        <div className="space-y-2">
                            {[
                                { name: 'District General Hospital', sector: 'Sector 5', dist: '1.2 km', status: 'OPEN', beds: 42 },
                                { name: 'SMS Medical College', sector: 'MI Road', dist: '2.8 km', status: 'OPEN', beds: 126 },
                                { name: 'Emergency Field Clinic', sector: 'Sector 11', dist: '4.1 km', status: 'FULL', beds: 0 },
                            ].map((h) => (
                                <div key={h.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all">
                                    <div>
                                        <div className="font-semibold text-sm">{h.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                            <MapPin className="w-3 h-3 mr-1" />{h.sector} • {h.dist}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-0.5 text-[10px] rounded border font-bold ${h.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {h.status}
                                        </span>
                                        <div className="text-[10px] text-slate-600 mt-1 font-mono">{h.beds} beds</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Report Incident */}
                <div className="glass-panel h-fit">
                    <h3 className="font-bold mb-4 flex items-center text-yellow-400 font-digital tracking-wider text-sm">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        REPORT INCIDENT
                    </h3>

                    {/* Success state */}
                    {submitResult?.success ? (
                        <div className="text-center py-8 animate-fade-in">
                            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                            <h4 className="font-bold text-emerald-300 mb-2">REPORT SUBMITTED</h4>
                            <p className="text-xs text-gray-500 mb-2">{submitResult.message}</p>
                            <p className="text-[10px] font-mono text-slate-600">ID: {submitResult.report?.id}</p>
                            <button
                                onClick={() => setSubmitResult(null)}
                                className="mt-4 px-4 py-2 bg-white/5 border border-gray-200 rounded text-sm font-mono text-gray-500 hover:bg-white/10 transition-colors"
                            >
                                SUBMIT ANOTHER
                            </button>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); otpSent ? handleSubmitReport() : handleSendOtp(); }}>
                            {/* Photo upload */}
                            <div className="p-5 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-blue-300 transition-all cursor-pointer bg-gray-50 group">
                                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-blue-600 transition-colors" />
                                <div className="text-gray-500 text-sm group-hover:text-gray-900 transition-colors">Upload Geo-Tagged Photo</div>
                                <div className="text-[10px] text-slate-600 mt-1">JPG, PNG up to 10MB</div>
                            </div>

                            {/* Location */}
                            <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Auto-Detected Location</div>
                                <div className="text-sm font-mono text-blue-600 mt-1">26.9124° N, 75.7873° E</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Jaipur, Rajasthan</div>
                            </div>

                            {/* Description */}
                            <textarea
                                placeholder="Describe the flood situation..."
                                value={reportDesc}
                                onChange={(e) => setReportDesc(e.target.value)}
                                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors text-sm resize-none h-24"
                                required
                            />

                            {/* OTP flow */}
                            {otpSent ? (
                                <div className="space-y-3 animate-fade-in">
                                    <div>
                                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                                            <Lock className="w-3 h-3 inline mr-1" />Verify OTP
                                        </label>
                                        <input
                                            type="text"
                                            value={reportOtp}
                                            onChange={(e) => setReportOtp(e.target.value)}
                                            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 font-mono text-center tracking-[0.5em]"
                                            placeholder="••••"
                                            maxLength={4}
                                            required
                                        />
                                        <p className="text-[10px] text-center text-slate-600 mt-1">Simulation OTP: 1234</p>
                                    </div>
                                </div>
                            ) : null}

                            {/* Error */}
                            {submitError && (
                                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-xs text-red-300 flex items-start animate-fade-in">
                                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                                    {submitError}
                                </div>
                            )}

                            {/* Warning */}
                            <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-xs text-yellow-200/80 flex items-start">
                                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
                                <span>OTP verification required. False reporting is punishable under Section 505 IPC.</span>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-lg hover:bg-neon-cyan/20 transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)] font-mono text-sm tracking-wider disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />SUBMITTING...</>
                                ) : otpSent ? (
                                    'VERIFY & SUBMIT REPORT'
                                ) : (
                                    'SEND VERIFICATION OTP'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <LiveTicker />
        </div>
    );
};

export default CitizenDashboard;
