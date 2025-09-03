// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: "#0f0f0f",
        surface: "#1a1a1a",
        panel: "#222222",
        accent: "#ffd43b", // your yellow
      },
    },
  },
  plugins: [],
};
