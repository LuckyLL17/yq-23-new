/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdecd6',
          200: '#fad5ac',
          300: '#f6b878',
          400: '#f19142',
          500: '#ed731e',
          600: '#de5914',
          700: '#b84213',
          800: '#933618',
          900: '#772f16',
        },
        book: {
          cream: '#faf8f5',
          paper: '#f5f1ea',
          ink: '#2c2416',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      }
    },
  },
  plugins: [],
}
