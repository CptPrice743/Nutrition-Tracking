import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-high': 'var(--surface-container-high)',
        'surface-hero': 'var(--surface-hero)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-dim': 'var(--primary-dim)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-inverse': 'var(--text-inverse)',
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        'success-text': 'var(--success-text)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        'danger-text': 'var(--danger-text)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        'warning-text': 'var(--warning-text)',
        'info-bg': 'var(--info-bg)',
        'info-text': 'var(--info-text)',
        // Legacy accent colors kept for any existing components
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        float: 'var(--shadow-float)'
      },
      transitionDuration: {
        DEFAULT: '150ms'
      }
    }
  },
  plugins: []
} satisfies Config;
