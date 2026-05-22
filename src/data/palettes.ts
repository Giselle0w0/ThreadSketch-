import { DMCThread, DMC_THREADS } from "./dmcThreads";

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  colors: string[]; // List of Hex colors belonging to this preset
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "dmc_classic",
    name: "DMC 经典色彩",
    description: "传统而鲜艳的十字绣主色调与点缀色系。",
    colors: [
      "#E51A24", // 666 Bright Christmas Red
      "#006227", // 699 Green
      "#044E8C", // 825 Dark Blue
      "#FFD300", // 444 Dark Lemon
      "#5C1E66", // 550 Very Dark Violet
      "#FF8C00", // 740 Tangerine
      "#7F4E25", // 433 Medium Brown
      "#000000", // 310 Black
      "#ABABAB", // 318 Light Steel Grey
      "#FFFFFF", // B5200 Snow White
    ],
  },
  {
    id: "pastel",
    name: "马卡龙粉彩",
    description: "可爱、梦幻且细腻的浅暖马卡龙粉色调。",
    colors: [
      "#FFB3C6", // 605 Very Light Cranberry
      "#FFCCD5", // 963 Ultra Light Dusty Rose
      "#FFE2CD", // 948 Very Light Peach
      "#FFEFA6", // 745 Light Pale Yellow
      "#FFFCE1", // 3823 Ultra Light Yellow
      "#7AF5AB", // 912 Light Emerald Green
      "#8CB1A3", // 503 Medium Blue Green
      "#ACD1E6", // 827 Very Light Blue
      "#DECBE3", // 211 Light Lavender
      "#FEEDF1", // 819 Baby Pink
    ],
  },
  {
    id: "vintage",
    name: "古风工作室",
    description: "沉稳大方、质朴古拙的自然暖调复古色系。",
    colors: [
      "#A6555C", // 3722 Medium Rosewood
      "#C68E94", // 223 Medium Shell Pink
      "#E9CD9E", // 738 Very Light Tan
      "#B0793D", // 435 Very Light Brown
      "#840",    // Medium Beige Brown (will expand to #7E6652)
      "#4F703B", // 987 Dark Forest Green
      "#639A88", // 502 Blue Green
      "#5C9CA6", // 597 Turquoise
      "#837BB0", // 155 Medium Dark Blue Violet
      "#F0EAD6", // ECRU Ecru
    ],
  },
  {
    id: "bright",
    name: "明亮鲜橙",
    description: "活力四射、充满现代波普针织艺术张力的荧光色彩。",
    colors: [
      "#E83F4C", // 3801 Light Christmas Red
      "#D6336B", // 602 Medium Cranberry
      "#F77F00", // 970 Light Pumpkin
      "#FFAA00", // 741 Medium Tangerine
      "#91E330", // 907 Light Parrot Green
      "#00B1EA", // 996 Medium Electric Blue
      "#00C6D7", // 3846 Light Turquoise
      "#C84B8E", // 3607 Light Plum
      "#88519B", // 208 Very Dark Lavender
      "#4D4D4D", // 413 Dark Pewter Grey
    ],
  },
];
