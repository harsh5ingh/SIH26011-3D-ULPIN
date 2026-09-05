/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: "#1e3a8a", // Navy
          secondary: "#0284c7", // Sky
          accent: "#d97706", // Amber
          dark: "#0f172a", // Slate dark
          light: "#f8fafc" // Off-white
        }
      }
    },
  },
  plugins: [],
}
