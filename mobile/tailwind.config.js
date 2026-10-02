/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // WhatsApp-ish bubble colours, referenced by the chat panel via
        // `bg-wa-bubbleOut` / `bg-wa-bubbleIn`.
        wa: {
          light: "#e9f5ee",
          mid: "#dcf8c6",
          bubbleIn: "#ffffff",
          bubbleOut: "#d9fdd3",
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    // daisyUI is a build-time CSS plugin. NativeWind compiles the class names
    // into RN styles, so the themes we actually use are declared below.
    themes: [
      {
        tasklink: {
          primary: "#4f46e5",
          "primary-content": "#ffffff",
          secondary: "#7c3aed",
          "secondary-content": "#ffffff",
          accent: "#0ea5e9",
          "accent-content": "#ffffff",
          neutral: "#1e1b4b",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f4f4f8",
          "base-300": "#e6e6ef",
          "base-content": "#1e1b4b",
          info: "#0ea5e9",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "0.5rem",
        },
      },
      {
        tasklinkdark: {
          primary: "#818cf8",
          "primary-content": "#0b1120",
          secondary: "#a78bfa",
          "secondary-content": "#0b1120",
          accent: "#38bdf8",
          "accent-content": "#0b1120",
          neutral: "#0f172a",
          "neutral-content": "#e2e8f0",
          "base-100": "#151d2e",
          "base-200": "#0f172a",
          "base-300": "#1e293b",
          "base-content": "#e2e8f0",
          info: "#38bdf8",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "0.5rem",
        },
      },
    ],
    // Only ship the component classes this app actually uses. Keeps the
    // generated CSS (and therefore the RN style sheet) small.
    logs: false,
  },
};