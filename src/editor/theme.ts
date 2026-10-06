export type Theme = {
  bg: string;
  accent: string;
  secondary: string;
  text: string;
  displayFont: string;
  bodyFont: string;
};

export const DEFAULT_THEME: Theme = {
  bg: "#070d14",
  accent: "#ff8a24",
  secondary: "#4bc7e8",
  text: "#eef4f8",
  displayFont: "Barlow Condensed",
  bodyFont: "Inter",
};

export const FONT_OPTIONS = [
  "Barlow Condensed",
  "Bebas Neue",
  "Inter",
  "Montserrat",
  "Oswald",
  "Poppins",
  "Roboto",
  "Roboto Condensed",
  "Space Grotesk",
];

// Cores próprias de um bloco (sobrepõem o tema só dentro dele).
export type BlockStyle = {
  bg?: string;
  accent?: string;
  text?: string;
};
