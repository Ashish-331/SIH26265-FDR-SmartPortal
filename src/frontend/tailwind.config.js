/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#172033',
          900: '#0f172a',
          950: '#090d16',
        },
        gov: {
          ashoka: '#1d4ed8',      // Sovereign Ashoka Blue
          ashokaDark: '#1e3a8a',  // Deep Ashoka
          ashokaLight: '#3b82f6',
          amber: '#d97706',       // AICTE Gold / Amber
          amberDark: '#b45309',
          amberLight: '#f59e0b',
          emerald: '#059669',     // Regulatory Clearance Emerald
          emeraldDark: '#047857',
          emeraldLight: '#10b981',
          crimson: '#dc2626',     // Injunction / Freeze Crimson
          crimsonDark: '#991b1b',
          crimsonLight: '#ef4444',
          navy: '#1e293b',        // Executive Navy
          border: '#334155',      // Border Slate
          panel: '#111827',       // Tactile Card Surface
          subpanel: '#1f2937'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'tactile': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
        'tactile-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
        'glow-blue': '0 0 15px -3px rgba(29, 78, 216, 0.45)',
        'glow-crimson': '0 0 20px -3px rgba(220, 38, 38, 0.5)',
        'glow-emerald': '0 0 15px -3px rgba(5, 150, 105, 0.45)',
      }
    },
  },
  plugins: [],
}
