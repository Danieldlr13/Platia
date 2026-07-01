import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en Bancolombia
        banco: {
          amarillo: "#FDDA24",
          verde: "#00C389",
          oscuro: "#2C2A29",
        },
      },
    },
  },
  plugins: [],
};

export default config;
