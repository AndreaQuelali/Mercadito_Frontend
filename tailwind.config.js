/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          light: 'var(--color-secondary-light)',
        },
        'accent-green': {
          DEFAULT: 'var(--color-accent-green)',
          hover: 'var(--color-accent-green-hover)',
          light: 'var(--color-accent-green-light)',
        },
        'accent-pink': {
          DEFAULT: 'var(--color-accent-pink)',
          light: 'var(--color-accent-pink-light)',
        },
        'accent-teal': {
          DEFAULT: 'var(--color-accent-teal)',
          light: 'var(--color-accent-teal-light)',
        },
        base: 'var(--color-bg-base)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-surface-elevated)',
          subtle: 'var(--color-bg-subtle)',
        },
        text: {
          main: 'var(--color-text-main)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          medium: 'var(--color-border-medium)',
        },
        brand: {
          50:  '#FAF4E5',
          100: '#F9ECE8',
          500: '#C65A3A',
          600: '#B04B2D',
          700: '#5F7745',
        },
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.07)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '18px',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'skeleton': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.22s ease-out',
        'fade-in':  'fade-in 0.3s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
