/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0f1117',
          1: '#1a1d27',
          2: '#22263a',
          3: '#2d3148',
        },
        accent: {
          blue: '#4f8ef7',
          green: '#3ecf8e',
          amber: '#f59e0b',
          red: '#f87171',
          purple: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
