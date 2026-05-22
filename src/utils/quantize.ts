import { findNearestDMC, hexToRgb, DMC_THREADS } from "../data/dmcThreads";

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Quantizes an existing pattern grid color array to a specified maximum number of colors.
 * It weights colors by their occurrence, groups them using k-means,
 * and snaps the resulting centers to the nearest official DMC thread colors.
 */
export function quantizeGridColors(
  grid: (string | null)[],
  targetCount: number
): (string | null)[] {
  // 1. Gather all non-null colors and count their frequency
  const colorCounts: { [hex: string]: number } = {};
  for (const color of grid) {
    if (color) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }

  const uniqueColors = Object.keys(colorCounts);
  if (uniqueColors.length <= targetCount) {
    // Already within limit. Let's just snap all current colors to the nearest DMC colors as a nice polish!
    const snappedMap: { [orig: string]: string } = {};
    for (const c of uniqueColors) {
      snappedMap[c] = findNearestDMC(c).hex;
    }
    return grid.map((c) => (c ? snappedMap[c] : null));
  }

  // 2. Run Weighted K-Means
  const centroids = runWeightedKMeans(uniqueColors, colorCounts, targetCount);

  // 3. For each centroid, find the closest real DMC thread hex to lock it to real thread palettes!
  const dmcCentroids = centroids.map((c) => {
    const hexStr = rgbToHex(Math.round(c.r), Math.round(c.g), Math.round(c.b));
    return findNearestDMC(hexStr).hex;
  });

  // 4. Create a map of original color to nearest DMC centroid
  const colorMap: { [orig: string]: string } = {};
  for (const origHex of uniqueColors) {
    const rgb = hexToRgb(origHex);
    if (!rgb) continue;

    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < dmcCentroids.length; i++) {
      const centRgb = hexToRgb(dmcCentroids[i]);
      if (!centRgb) continue;

      const dist =
        Math.pow(rgb.r - centRgb.r, 2) +
        Math.pow(rgb.g - centRgb.g, 2) +
        Math.pow(rgb.b - centRgb.b, 2);

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    colorMap[origHex] = dmcCentroids[closestIndex];
  }

  // 5. Replace colors in our grid
  return grid.map((color) => (color ? colorMap[color] || null : null));
}

/**
 * Standard K-means clustering weighted by pixel frequencies
 */
function runWeightedKMeans(
  uniqueColors: string[],
  counts: { [hex: string]: number },
  k: number
): RGB[] {
  const parsedColors: { rgb: RGB; count: number }[] = [];
  for (const hex of uniqueColors) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      parsedColors.push({ rgb, count: counts[hex] });
    }
  }

  // Initialize centroids by taking k evenly spaced items from sorted colors (spreads color palette)
  const sortedColors = [...parsedColors].sort((a, b) => b.count - a.count);
  const centroids: RGB[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.min(
      sortedColors.length - 1,
      Math.floor((i * sortedColors.length) / k)
    );
    centroids.push({ ...sortedColors[idx].rgb });
  }

  // Iterations of K-means
  const maxIterations = 8;
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: { sumR: number; sumG: number; sumB: number; totalWeight: number }[] = Array.from(
      { length: k },
      () => ({ sumR: 0, sumG: 0, sumB: 0, totalWeight: 0 })
    );

    // Assignment Step
    for (const item of parsedColors) {
      let minDist = Infinity;
      let clusterIdx = 0;

      for (let i = 0; i < k; i++) {
        const dist =
          Math.pow(item.rgb.r - centroids[i].r, 2) +
          Math.pow(item.rgb.g - centroids[i].g, 2) +
          Math.pow(item.rgb.b - centroids[i].b, 2);

        if (dist < minDist) {
          minDist = dist;
          clusterIdx = i;
        }
      }

      clusters[clusterIdx].sumR += item.rgb.r * item.count;
      clusters[clusterIdx].sumG += item.rgb.g * item.count;
      clusters[clusterIdx].sumB += item.rgb.b * item.count;
      clusters[clusterIdx].totalWeight += item.count;
    }

    // Update Centroids Step
    for (let i = 0; i < k; i++) {
      if (clusters[i].totalWeight > 0) {
        centroids[i] = {
          r: clusters[i].sumR / clusters[i].totalWeight,
          g: clusters[i].sumG / clusters[i].totalWeight,
          b: clusters[i].sumB / clusters[i].totalWeight,
        };
      }
    }
  }

  return centroids;
}

/**
 * Helper to turn RGB floats into Hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, val));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

/**
 * Pixelates and quantizes an image drawn onto a canvas and maps it to a 1D grid array.
 * This skips nearly transparent pixels or turns them into null (no-stitch).
 */
export function processImportedImage(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  gridWidth: number,
  gridHeight: number,
  colorsCount: number
): (string | null)[] {
  const imgData = ctx.getImageData(0, 0, gridWidth, gridHeight);
  const data = imgData.data;

  const pixelColors: string[] = [];
  const pixelIndexes: { idx: number; hex: string }[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const pixelIdx = i / 4;

    // Treat alpha < 100 as transparent canvas / background (no stitches)
    if (a < 100) {
      continue;
    }

    // Solidify color
    const hex = rgbToHex(r, g, b);
    pixelColors.push(hex);
    pixelIndexes.push({ idx: pixelIdx, hex });
  }

  // If no colored pixels, return empty grid
  if (pixelColors.length === 0) {
    return Array(gridWidth * gridHeight).fill(null);
  }

  // Count unique colors
  const colorCounts: { [hex: string]: number } = {};
  for (const c of pixelColors) {
    colorCounts[c] = (colorCounts[c] || 0) + 1;
  }
  const uniqueColors = Object.keys(colorCounts);

  // Quantize unique colors using k-means
  const actualK = Math.min(colorsCount, uniqueColors.length);
  const centroids = runWeightedKMeans(uniqueColors, colorCounts, actualK);

  // Snap centroids to real DMC
  const dmcCentroids = centroids.map((c) => {
    const rawHex = rgbToHex(Math.round(c.r), Math.round(c.g), Math.round(c.b));
    return findNearestDMC(rawHex).hex;
  });

  // Map each individual pixel
  const resultGrid: (string | null)[] = Array(gridWidth * gridHeight).fill(null);

  for (const pixel of pixelIndexes) {
    const rgb = hexToRgb(pixel.hex);
    if (!rgb) continue;

    let minDist = Infinity;
    let closestDmcHex = dmcCentroids[0];

    for (const dmcHex of dmcCentroids) {
      const dmcRgb = hexToRgb(dmcHex);
      if (!dmcRgb) continue;

      const dist =
        Math.pow(rgb.r - dmcRgb.r, 2) +
        Math.pow(rgb.g - dmcRgb.g, 2) +
        Math.pow(rgb.b - dmcRgb.b, 2);

      if (dist < minDist) {
        minDist = dist;
        closestDmcHex = dmcHex;
      }
    }

    resultGrid[pixel.idx] = closestDmcHex;
  }

  return resultGrid;
}
