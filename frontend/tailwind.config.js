/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#141416',
        'bg-raised': '#1e1e22',
        'bg-card': '#222226',
        'bg-card-hover': '#2a2a2f',
        sand: '#e8dcc8',
        'sand-dim': '#a89b88',
        'sand-bright': '#f5efe4',
        accent: '#d4621a',
        'accent-glow': '#e8782f',
        green: '#4caf6a',
        red: '#cf4444',
        gold: '#d4a843',
        blue: '#4a8ec9',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"Libre Franklin"', 'Helvetica', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '6px',
      },
      boxShadow: {
        DEFAULT: '0 4px 24px rgba(0,0,0,.45)',
        lg: '0 12px 48px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
}
