import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern gold palette
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Modern dark palette
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Surface colors
        surface: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
        'card-gradient': 'linear-gradient(145deg, #1E293B 0%, #334155 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gold-shine': 'linear-gradient(45deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(245, 158, 11, 0.3)',
        'gold-glow-lg': '0 0 40px rgba(245, 158, 11, 0.4)',
        'card-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'shimmer-fast': 'shimmer 2s linear infinite',
        'shimmer-slow': 'shimmer 4s linear infinite',
        'border-flow': 'borderFlow 8s linear infinite',
        'float-rotate-1': 'floatRotate1 6s ease-in-out infinite',
        'float-rotate-2': 'floatRotate2 7s ease-in-out infinite',
        'trophy-bounce-1': 'trophyBounce1 3s ease-in-out infinite',
        'trophy-bounce-2': 'trophyBounce2 3s ease-in-out infinite 0.5s',
        // New professional animations
        'float-1': 'float1 4s ease-in-out infinite',
        'float-2': 'float2 5s ease-in-out infinite 0.5s',
        'float-3': 'float3 6s ease-in-out infinite 1s',
        'float-4': 'float4 4.5s ease-in-out infinite 1.5s',
        'float-line-1': 'floatLine1 3s ease-in-out infinite',
        'float-line-2': 'floatLine2 3.5s ease-in-out infinite 0.8s',
        'bounce-slow': 'bounceSlow 4s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease-in-out infinite',
        'text-shimmer': 'textShimmer 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 1s ease-out 0.5s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        floatRotate1: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) rotate(90deg)' },
          '50%': { transform: 'translateY(0px) rotate(180deg)' },
          '75%': { transform: 'translateY(-8px) rotate(270deg)' },
        },
        floatRotate2: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-6px) rotate(-90deg)' },
          '50%': { transform: 'translateY(0px) rotate(-180deg)' },
          '75%': { transform: 'translateY(-6px) rotate(-270deg)' },
        },
        trophyBounce1: {
          '0%, 100%': {
            transform: 'translateY(0) scale(1)',
            opacity: '0.9'
          },
          '50%': {
            transform: 'translateY(-10px) scale(1.1)',
            opacity: '1'
          },
        },
        trophyBounce2: {
          '0%, 100%': {
            transform: 'translateY(0) scale(1) rotate(0deg)',
            opacity: '0.9'
          },
          '50%': {
            transform: 'translateY(-10px) scale(1.1) rotate(-5deg)',
            opacity: '1'
          },
        },
        // New professional keyframes
        float1: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-8px) translateX(4px)' },
          '50%': { transform: 'translateY(-4px) translateX(-2px)' },
          '75%': { transform: 'translateY(-12px) translateX(2px)' },
        },
        float2: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-6px) translateX(-3px)' },
          '66%': { transform: 'translateY(-10px) translateX(3px)' },
        },
        float3: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '20%': { transform: 'translateY(-5px) translateX(2px)' },
          '40%': { transform: 'translateY(-8px) translateX(-1px)' },
          '60%': { transform: 'translateY(-3px) translateX(3px)' },
          '80%': { transform: 'translateY(-7px) translateX(-2px)' },
        },
        float4: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '30%': { transform: 'translateY(-9px) translateX(-4px)' },
          '60%': { transform: 'translateY(-2px) translateX(2px)' },
        },
        floatLine1: {
          '0%, 100%': { transform: 'translateX(0px) scale(1)' },
          '50%': { transform: 'translateX(20px) scale(1.2)' },
        },
        floatLine2: {
          '0%, 100%': { transform: 'translateX(0px) scale(1)' },
          '50%': { transform: 'translateX(-15px) scale(1.1)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-8px) scale(1.05)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        textShimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;