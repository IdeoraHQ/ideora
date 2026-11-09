/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          royal: '#2563EB',
          deep: '#1D4ED8',
          light: '#60A5FA',
          pale: '#DBEAFE',
          ice: '#EFF6FF',
        },
        surface: {
          white: '#FFFFFF',
          soft: '#F8FAFC',
          light: '#F1F5F9',
          tint: '#F0F7FF',
          border: '#E2E8F0',
        },
        typography: {
          navy: '#14213D',
          charcoal: '#1E293B',
          slate: '#64748B',
          muted: '#94A3B8',
          white: '#FFFFFF',
        },
        functional: {
          success: '#16A34A',
          'success-light': '#DCFCE7',
          warning: '#F59E0B',
          'warning-light': '#FEF3C7',
          error: '#DC2626',
          'error-light': '#FEE2E2',
          info: '#0284C7',
        },
      },
      fontFamily: {
        sans: [
          '"Outfit"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        heading: [
          '"Outfit"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
      },
    },
  },
  plugins: [],
};
