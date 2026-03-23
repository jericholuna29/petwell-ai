/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petwell: {
          100: '#FFDBFD',
          200: '#C9BEFF',
          500: '#8494FF',
          700: '#6367FF',
          ink: '#24274A',
        },
      },
      boxShadow: {
        soft: '0 12px 28px rgba(99, 103, 255, 0.16)',
        glow: '0 10px 24px rgba(99, 103, 255, 0.28)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
};

export default config;
