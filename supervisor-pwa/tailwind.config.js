/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#F97316',
          600: '#ea6c0a',
          700: '#c2570a',
          800: '#9a4510',
          900: '#7c3a10',
        },
        surface: {
          50:  '#2a2a2a',
          100: '#222222',
          200: '#1c1c1c',
          300: '#181818',
          400: '#141414',
          500: '#121212',
          600: '#0f0f0f',
          700: '#0d0d0d',
          800: '#0a0a0a',
          900: '#080808',
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      screens: { xs: '375px' }
    },
  },
  plugins: [],
}
