/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': '#1a1b26',
        'td-bg': '#1a1b26',
        'td-bg-dark': '#16161e',
        'td-surface': '#1f2335',
        'td-surface-hover': '#292e42',
        'td-border': '#292e42',
        'td-text': '#c0caf5',
        'td-text-dim': '#565f89',
        'td-cyan': '#7dcfff',
        'td-blue': '#7aa2f7',
        'td-green': '#9ece6a',
        'td-orange': '#ff9e64',
        'td-red': '#f7768e',
        'td-purple': '#bb9af7',
        'td-yellow': '#e0af68',
        'neon-red': '#f7768e',
        'neon-cyan': '#7dcfff',
        'neon-orange': '#ff9e64',
        'neon-green': '#9ece6a',
        primary: '#7aa2f7',
        success: '#9ece6a',
        warning: '#e0af68',
        danger: '#f7768e',
        info: '#565f89',
      },
      fontFamily: {
        digital: ['"Orbitron"', '"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, rgba(41,46,66,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(41,46,66,0.3) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(125, 207, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(125, 207, 255, 0.4), 0 0 40px rgba(125, 207, 255, 0.1)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'neon-breathe': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(125, 207, 255, 0.1)' },
          '50%': { boxShadow: '0 0 12px rgba(125, 207, 255, 0.2), 0 0 24px rgba(125, 207, 255, 0.08)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        'glitch': 'glitch 0.3s ease-in-out',
        'count-up': 'count-up 0.6s ease-out',
        'neon-breathe': 'neon-breathe 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}