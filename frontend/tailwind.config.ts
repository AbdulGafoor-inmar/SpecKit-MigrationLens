import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Inmar Brand: Primary Colors ── */
        plum: {
          DEFAULT: '#303584',
          light: '#4A4F9E',
          dark: '#1D1655',  /* Midnight Blurple */
          50: '#EDEDF6',
          100: '#D4D5EA',
          200: '#9899C1',
          500: '#303584',
          700: '#252A6B',
          900: '#1D1655',
        },
        teal: {
          DEFAULT: '#03878C',
          light: '#05A5AB',
          dark: '#026568',
          50: '#E6F7F7',
          100: '#B3ECEE',
          200: '#66D8DD',
          500: '#03878C',
          700: '#026568',
        },
        sunset: {
          DEFAULT: '#F15A22',
          light: '#F47B4D',
          dark: '#C44A1B',
          50: '#FEF0EB',
          100: '#FCDACC',
          200: '#F9B399',
          500: '#F15A22',
        },
        /* ── Inmar Brand: Secondary Colors ── */
        goldenrod: {
          DEFAULT: '#FFC20E',
          light: '#FFD24E',
          dark: '#D4A00B',
          50: '#FFF8E1',
          100: '#FFECB3',
        },
        frost: {
          DEFAULT: '#DEDCE4',
          dark: '#A0A0B5',  /* Transitional Gray */
        },
        /* ── Semantic aliases ── */
        accent: {
          blue: '#303584',
          teal: '#03878C',
          orange: '#F15A22',
          amber: '#FFC20E',
          emerald: '#03878C',
          rose: '#F15A22',
          purple: '#303584',
          cyan: '#03878C',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F6FA',
          tertiary: '#EDEDF6',
          dark: '#F7F6FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'score-fill': 'scoreFill 1.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scoreFill: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--score-offset)' },
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(48, 53, 132, 0.06), 0 4px 16px rgba(48, 53, 132, 0.04)',
        'card-hover': '0 4px 24px rgba(48, 53, 132, 0.10), 0 1px 4px rgba(48, 53, 132, 0.06)',
        'card-lg': '0 8px 32px rgba(48, 53, 132, 0.08)',
        sidebar: '2px 0 24px rgba(29, 22, 85, 0.06)',
        header: '0 1px 8px rgba(48, 53, 132, 0.04)',
        glow: '0 0 20px rgba(48, 53, 132, 0.15)',
        'glow-teal': '0 0 20px rgba(3, 135, 140, 0.20)',
        'glow-emerald': '0 0 20px rgba(3, 135, 140, 0.20)',
        'glow-rose': '0 0 20px rgba(241, 90, 34, 0.20)',
        'glow-sunset': '0 0 20px rgba(241, 90, 34, 0.20)',
        inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
