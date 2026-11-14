/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          royal: 'rgb(var(--color-brand-royal) / <alpha-value>)',
          deep: 'rgb(var(--color-brand-deep) / <alpha-value>)',
          light: 'rgb(var(--color-brand-light) / <alpha-value>)',
          pale: 'rgb(var(--color-brand-pale) / <alpha-value>)',
          ice: 'rgb(var(--color-brand-ice) / <alpha-value>)',
        },
        surface: {
          white: 'rgb(var(--color-surface-white) / <alpha-value>)',
          soft: 'rgb(var(--color-surface-soft) / <alpha-value>)',
          light: 'rgb(var(--color-surface-light) / <alpha-value>)',
          tint: 'rgb(var(--color-surface-tint) / <alpha-value>)',
          border: 'rgb(var(--color-surface-border) / <alpha-value>)',
        },
        typography: {
          navy: 'rgb(var(--color-typography-navy) / <alpha-value>)',
          charcoal: 'rgb(var(--color-typography-charcoal) / <alpha-value>)',
          slate: 'rgb(var(--color-typography-slate) / <alpha-value>)',
          muted: 'rgb(var(--color-typography-muted) / <alpha-value>)',
          white: 'rgb(var(--color-typography-white) / <alpha-value>)',
        },
        functional: {
          success: 'rgb(var(--color-functional-success) / <alpha-value>)',
          'success-light': 'rgb(var(--color-functional-success-light) / <alpha-value>)',
          warning: 'rgb(var(--color-functional-warning) / <alpha-value>)',
          'warning-light': 'rgb(var(--color-functional-warning-light) / <alpha-value>)',
          error: 'rgb(var(--color-functional-error) / <alpha-value>)',
          'error-light': 'rgb(var(--color-functional-error-light) / <alpha-value>)',
          info: 'rgb(var(--color-functional-info) / <alpha-value>)',
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
