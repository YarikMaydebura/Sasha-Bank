/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Purple scale (primary)
        'pastel': {
          'purple-light': '#E9D5FF',
          'purple': '#C4B5FD',
          'purple-medium': '#A78BFA',
          'purple-dark': '#8B5CF6',
          'pink': '#FBCFE8',
          'blue': '#BFDBFE',
          'mint': '#A7F3D0',
          'peach': '#FED7AA',
        },
        // Backgrounds
        'bg': {
          'dark': '#1E1B2E',
          'card': '#2D2640',
          'card-hover': '#3D3555',
          'input': '#252136',
        },
        // Coin (keep gold)
        'coin': {
          'gold': '#FCD34D',
          'glow': '#FDE68A',
        },
        // Status
        'status': {
          'success': '#86EFAC',
          'error': '#FCA5A5',
          'warning': '#FCD34D',
          'info': '#93C5FD',
        }
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(167, 139, 250, 0.3)',
        'glow-coin': '0 0 20px rgba(252, 211, 77, 0.4)',
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
