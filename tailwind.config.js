/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Professional gold palette
        primary: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // Dark backgrounds
        dark: {
          500: '#000000',
          400: '#0A0A0C',
        },
        // Surface colors for cards
        surface: {
          DEFAULT: '#1A1A1E',
          light: '#26262C',
          lighter: '#34343D',
        },
        base: {
          blue: '#0052FF',
          'blue-dark': '#0039CC',
        },
        farcaster: {
          purple: '#8B5CF6',
          'purple-dark': '#7C3AED',
        },
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-dark': 'linear-gradient(180deg, #000000 0%, #1A1A1E 100%)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.25)',
        'glow-gold-lg': '0 0 40px rgba(245, 158, 11, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
