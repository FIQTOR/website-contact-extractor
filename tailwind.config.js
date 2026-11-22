/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--wce-bg)',
        surface: 'var(--wce-surface)',
        'surface-2': 'var(--wce-surface-2)',
        border: 'var(--wce-border)',
        'border-strong': 'var(--wce-border-strong)',
        accent: 'var(--wce-accent)',
        'accent-hover': 'var(--wce-accent-hover)',
        text: 'var(--wce-text)',
        muted: 'var(--wce-muted)',
        danger: 'var(--wce-danger)',
        success: 'var(--wce-success)'
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px'
      },
      boxShadow: {
        soft: '0 10px 30px -18px rgba(0, 0, 0, 0.8)',
        pop: '0 18px 45px -20px rgba(0, 0, 0, 0.85)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(320%)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'scale-in': 'scale-in 140ms ease-out',
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  plugins: []
};
