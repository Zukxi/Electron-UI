/** @type {import('tailwindcss').Config} */
module.exports = {
  // Point to the renderer folder where your frontend code lives
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}