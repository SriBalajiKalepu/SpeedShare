/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'apple-gray': '#f5f5f7',
        'apple-blue': '#0071e3',
        'apple-light-blue': '#d6e4ff',
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
