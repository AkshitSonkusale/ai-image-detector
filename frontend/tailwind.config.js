/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F17',
        surface: '#121826',
        border: '#1F2937',
        real: '#22C55E',
        ai: '#8B5CF6',
        uncertain: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionDuration: {
        200: '200ms',
      },
    },
  },
  plugins: [],
}
