/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf9ed',
          100: '#faf0cc',
          200: '#f4de95',
          300: '#edc855',
          400: '#e6b428',
          500: '#C9A84C',
          600: '#b8922e',
          700: '#9a7224',
          800: '#7e5b22',
          900: '#6a4b1f',
        },
        dark: {
          50:  '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#1a1a1a',
          950: '#0f0f0f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
