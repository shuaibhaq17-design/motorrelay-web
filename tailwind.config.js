/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "rgb(236 253 245 / <alpha-value>)",
          100: "rgb(209 250 229 / <alpha-value>)",
          200: "rgb(167 243 208 / <alpha-value>)",
          300: "rgb(110 231 183 / <alpha-value>)",
          400: "rgb(52 211 153 / <alpha-value>)",
          500: "rgb(16 185 129 / <alpha-value>)",   // #10B981
          600: "rgb(5 150 105 / <alpha-value>)",
          700: "rgb(4 120 87 / <alpha-value>)",
          800: "rgb(6 95 70 / <alpha-value>)",
          900: "rgb(6 78 59 / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "22px",
      },
      boxShadow: {
        tile: "0 10px 30px rgba(0,0,0,.08)",
      },
    },
  },
  plugins: [],
};
