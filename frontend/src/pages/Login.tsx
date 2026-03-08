import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserType } from '../contexts/AuthContext';
import { Shield, Smartphone, ArrowRight, Activity, AlertCircle, Radio, Lock, Fingerprint, Radar } from 'lucide-react';
import { GhostCursor } from '../components/ui/GhostCursor';

const Login: React.FC = () => {
  const [role, setRole] = useState<UserType>('authority');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const { login, loginCitizen, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'citizen' && mobile.length === 10) {
      setShowOtp(true);
      setErrorMsg('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (role === 'authority') {
      const result = await login(email, password);
      if (result.success) navigate('/mission-control');
      else setErrorMsg(result.error || 'Access denied — invalid credentials');
    } else {
      if (otp === '1234') { await loginCitizen(mobile); navigate('/dashboard'); }
      else setErrorMsg('Invalid OTP — please try again');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#07080F]">

      {/* ─── LEFT: Form Panel ─── */}
      <div className={`relative z-20 w-full lg:w-[480px] xl:w-[520px] min-h-screen flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-12 bg-[#0A0B14]/95 border-r border-white/[0.06] transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>

        {/* Brand */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Radar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-wide text-white leading-none">EQUINOX</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-[0.25em] uppercase mt-0.5">Disaster Response</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1.5">Welcome back</h2>
            <p className="text-sm text-gray-400 leading-relaxed">Sign in to the tactical command terminal.</p>
          </div>
        </div>

        {/* Role Toggle */}
        <div className="flex p-1 bg-white/[0.04] rounded-xl mb-7 border border-white/[0.06]">
          <button
            onClick={() => { setRole('authority'); setShowOtp(false); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-250 ${role === 'authority'
              ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
              : 'text-gray-500 hover:text-gray-300'
              }`}
            type="button"
          >
            <Shield className="w-4 h-4" />
            Authority
          </button>
          <button
            onClick={() => { setRole('citizen'); setShowOtp(false); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-250 ${role === 'citizen'
              ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
              : 'text-gray-500 hover:text-gray-300'
              }`}
            type="button"
          >
            <Smartphone className="w-4 h-4" />
            Citizen
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 mb-5 bg-red-500/[0.08] border border-red-500/20 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-[13px] text-red-300">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={role === 'citizen' && !showOtp ? handleSendOtp : handleLogin} className="space-y-5">

          {role === 'authority' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-2">Email address</label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="commander@equinox.local"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="••••••••••"
                    required
                  />
                  <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          )}

          {role === 'citizen' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-2">Mobile number</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-[14px] font-medium">+91</span>
                  <input
                    id="login-mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-14 pr-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all tracking-wider"
                    placeholder="9876543210"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {showOtp && role === 'citizen' && (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-[13px] font-medium text-gray-300 mb-2">Verification code</label>
              <input
                id="login-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-center text-xl tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="••••"
                maxLength={4}
                required
              />
              <p className="text-[11px] text-center text-gray-500">Demo OTP: <span className="text-gray-400 font-medium">1234</span></p>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full group relative py-3.5 rounded-xl font-semibold text-[14px] overflow-hidden transition-all duration-300 text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {role === 'citizen' && !showOtp ? 'Send OTP' : 'Sign in'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </span>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-white/[0.05]">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Fingerprint className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-wide">Secured by Equinox AI • All activity monitored</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Animation Panel ─── */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">

        {/* High-quality GhostCursor filling the right panel */}
        <GhostCursor
          color="#5A7AE6"
          brightness={0.5}
          edgeIntensity={0.15}
          trailLength={18}
          inertia={0.55}
          grainIntensity={0.1}
          bloomStrength={0.15}
          bloomRadius={1.2}
          bloomThreshold={0.08}
          maxDevicePixelRatio={2}
          targetPixels={3000000}
          fadeDelayMs={400}
          fadeDurationMs={2500}
          mixBlendMode="screen"
          zIndex={2}
        />

        {/* Subtle gradient layers */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-950/30 via-transparent to-indigo-950/20 pointer-events-none" />
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.08) 0%, transparent 65%)' }} />

        {/* Center decorative content */}
        <div className={`relative z-10 text-center pointer-events-none select-none max-w-md px-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 backdrop-blur-sm">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="text-[11px] text-gray-400 font-medium tracking-wider uppercase">System Online</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight leading-[1.15]">
            Command<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Center</span>
          </h2>
          <p className="text-[15px] text-gray-400 leading-relaxed max-w-sm mx-auto">
            Real-time flood monitoring, predictive analytics, and coordinated disaster response.
          </p>

          {/* Floating stats */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { label: 'Sensors', value: '2.4K' },
              { label: 'Uptime', value: '99.9%' },
              { label: 'Latency', value: '12ms' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated grid dots */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
      </div>
    </div>
  );
};

export default Login;