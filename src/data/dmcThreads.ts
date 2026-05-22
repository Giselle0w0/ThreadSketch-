/**
 * Curated list of official DMC Embroidery Floss colors
 * with hex approximations for ThreadSketch.
 */
export interface DMCThread {
  code: string;
  name: string;
  hex: string;
}

export const DMC_THREADS: DMCThread[] = [
  // 红色与粉色系 (REDS & PINKS)
  { code: "151", name: "极浅烟粉", hex: "#F3C5CE" },
  { code: "223", name: "中贝壳粉", hex: "#C68E94" },
  { code: "310", name: "纯黑", hex: "#000000" },
  { code: "321", name: "红色", hex: "#C21327" },
  { code: "498", name: "暗红", hex: "#9C0E1E" },
  { code: "602", name: "中克兰贝里粉", hex: "#D6336B" },
  { code: "603", name: "克兰贝里粉", hex: "#E86591" },
  { code: "605", name: "浅克兰贝里粉", hex: "#FFB3C6" },
  { code: "666", name: "圣诞红", hex: "#E51A24" },
  { code: "817", name: "深珊瑚红", hex: "#BD1B29" },
  { code: "963", name: "极浅柔粉", hex: "#FFCCD5" },
  { code: "3722", name: "中玫瑰木色", hex: "#A6555C" },
  { code: "3801", name: "浅圣诞红", hex: "#E83F4C" },
  { code: "B5200", name: "雪白", hex: "#FFFFFF" },

  // 橙色与黄色系 (ORANGES & YELLOWS)
  { code: "444", name: "柠檬黄", hex: "#FFD300" },
  { code: "740", name: "橘黄", hex: "#FF8C00" },
  { code: "741", name: "中橘黄", hex: "#FFAA00" },
  { code: "742", name: "浅橘黄", hex: "#FFBE32" },
  { code: "743", name: "中黄", hex: "#F6CE48" },
  { code: "744", name: "淡黄", hex: "#FFE885" },
  { code: "745", name: "浅淡黄", hex: "#FFEFA6" },
  { code: "945", name: "黄褐色", hex: "#F9CEB4" },
  { code: "948", name: "浅色浅桃色", hex: "#FFE2CD" },
  { code: "970", name: "南瓜橙", hex: "#F77F00" },
  { code: "3340", name: "中杏子橙", hex: "#FF845C" },
  { code: "3823", name: "极浅黄", hex: "#FFFCE1" },

  // 绿色系 (GREENS)
  { code: "502", name: "地中海绿", hex: "#639A88" },
  { code: "503", name: "中地中海绿", hex: "#8CB1A3" },
  { code: "699", name: "绿色", hex: "#006227" },
  { code: "700", name: "翠绿色", hex: "#007F2D" },
  { code: "701", name: "浅绿色", hex: "#31823B" },
  { code: "905", name: "深鹦鹉绿", hex: "#559C14" },
  { code: "906", name: "中鹦鹉绿", hex: "#73C125" },
  { code: "907", name: "浅鹦鹉绿", hex: "#91E330" },
  { code: "912", name: "浅翡翠绿", hex: "#7AF5AB" },
  { code: "987", name: "暗森绿", hex: "#4F703B" },
  { code: "3346", name: "猎手绿", hex: "#447846" },
  { code: "3812", name: "深海绿", hex: "#127B6B" },

  // 蓝色与青色系 (BLUES & TEALS)
  { code: "519", name: "浅海蓝", hex: "#82BCDB" },
  { code: "597", name: "浅绿松石色", hex: "#5C9CA6" },
  { code: "798", name: "深代尔夫特蓝", hex: "#4267AB" },
  { code: "799", name: "中代尔夫特蓝", hex: "#678BC6" },
  { code: "800", name: "淡代尔夫特蓝", hex: "#AFC5E3" },
  { code: "824", name: "极深蓝", hex: "#003666" },
  { code: "825", name: "深蓝色", hex: "#044E8C" },
  { code: "826", name: "中蓝色", hex: "#3B76AF" },
  { code: "827", name: "极浅蓝", hex: "#ACD1E6" },
  { code: "995", name: "深电光蓝", hex: "#007BBE" },
  { code: "996", name: "中电光蓝", hex: "#00B1EA" },
  { code: "3843", name: "电光蓝", hex: "#0087BF" },
  { code: "3846", name: "浅松石蓝", hex: "#00C6D7" },

  // 紫色系 (PURPLES & VIOLETS)
  { code: "155", name: "中暗蓝紫", hex: "#837BB0" },
  { code: "208", name: "深薰衣草紫", hex: "#88519B" },
  { code: "209", name: "薰衣草紫", hex: "#A675B8" },
  { code: "210", name: "中薰衣草紫", hex: "#C39ECB" },
  { code: "211", name: "浅薰衣草紫", hex: "#DECBE3" },
  { code: "327", name: "暗紫", hex: "#4C1F53" },
  { code: "340", name: "中蓝紫", hex: "#9E99C9" },
  { code: "341", name: "浅蓝紫", hex: "#BCB9DC" },
  { code: "550", name: "极暗紫", hex: "#5C1E66" },
  { code: "3607", name: "浅梅红色", hex: "#C84B8E" },
  { code: "3608", name: "极浅梅红", hex: "#E097C1" },

  // 棕色与大地色系 (BROWNS & EARTH TONES)
  { code: "433", name: "中棕色", hex: "#7F4E25" },
  { code: "434", name: "浅棕色", hex: "#94622B" },
  { code: "435", name: "极浅棕色", hex: "#B0793D" },
  { code: "436", name: "浅茶色", hex: "#C29255" },
  { code: "437", name: "亮茶色", hex: "#D6B07B" },
  { code: "738", name: "浅泥土黄", hex: "#E9CD9E" },
  { code: "739", name: "极浅米黄", hex: "#F3E0BC" },
  { code: "839", name: "暗灰褐", hex: "#533D2D" },
  { code: "840", name: "中灰褐", hex: "#7E6652" },
  { code: "841", name: "浅灰褐", hex: "#9E8875" },
  { code: "842", name: "极浅灰褐", hex: "#C1AEA0" },

  // 灰与中性色系 (NEUTRALS & GREYS)
  { code: "318", name: "浅钢灰", hex: "#ABABAB" },
  { code: "413", name: "深铅灰", hex: "#4D4D4D" },
  { code: "414", name: "暗钢灰", hex: "#8B8B8B" },
  { code: "415", name: "铬灰色", hex: "#CCCCCC" },
  { code: "762", name: "浅珍珠灰", hex: "#E2E2E2" },
  { code: "819", name: "婴儿浅粉", hex: "#FEEDF1" },
  { code: "3865", name: "象牙白", hex: "#FAFAF5" },
  { code: "ECRU", name: "胚布色", hex: "#F0EAD6" },
];

/**
 * Finds the nearest DMCThread from our library using Euclidean distance in RGB color space.
 */
export function findNearestDMC(hex: string): DMCThread {
  // Convert hex to RGB
  const rgb = hexToRgb(hex);
  if (!rgb) return DMC_THREADS[0]; // fallback

  let minDistance = Infinity;
  let nearest = DMC_THREADS[0];

  for (const thread of DMC_THREADS) {
    const threadRgb = hexToRgb(thread.hex);
    if (!threadRgb) continue;

    const rDiff = rgb.r - threadRgb.r;
    const gDiff = rgb.g - threadRgb.g;
    const bDiff = rgb.b - threadRgb.b;

    const distance = rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
    if (distance < minDistance) {
      minDistance = distance;
      nearest = thread;
    }
  }

  return nearest;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
