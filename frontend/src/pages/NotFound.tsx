import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, Radio } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-neon-red/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-50 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-[0.03]" />

      <div className="relative z-10 text-center animate-fade-in">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-red/10 border border-neon-red/30 mb-6">
          <AlertTriangle className="w-10 h-10 text-neon-red animate-pulse" />
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-digital font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-600 mb-2 tracking-widest glitch-text">
          404
        </h1>

        {/* Subtitle */}
        <div className="flex items-center justify-center space-x-2 text-sm font-mono text-neon-red/80 mb-4 tracking-widest">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>SIGNAL LOST</span>
        </div>

        <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
          The page you are looking for has been swept away or doesn't exist in this sector.
          Return to the command center to re-establish your uplink.
        </p>

        {/* CTA */}
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-lg hover:bg-neon-cyan/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-300 font-mono text-sm tracking-wider"
        >
          <Home className="w-4 h-4 mr-2" />
          RETURN TO BASE
        </Link>
      </div>
    </div>
  );
};

export default NotFound;