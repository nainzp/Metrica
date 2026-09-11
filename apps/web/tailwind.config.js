/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        institucional: {
          marino: '#0B2A5B',
          azul: '#1E5FD9',
          azulClaro: '#5B8DEF',
          hielo: '#E8F0FB',
        },
        semaforo: {
          verde: '#2BB673',
          ambar: '#F5A623',
          rojo: '#E5484D',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
