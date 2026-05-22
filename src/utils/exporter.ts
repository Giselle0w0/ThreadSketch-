import { jsPDF } from "jspdf";
import { DMCThread, findNearestDMC } from "../data/dmcThreads";

interface ExportData {
  title: string;
  grid: (string | null)[];
  width: number;
  height: number;
  uniqueColors: string[];
  colorToSymbol: { [color: string]: string };
  difficulty: string;
  totalStitches: number;
  fabricSizeText: string;
}

/**
 * Draws the high-res printable pattern sheet on an offscreen canvas
 */
export function generateHighResSheet(data: ExportData): HTMLCanvasElement {
  const {
    title,
    grid,
    width,
    height,
    uniqueColors,
    colorToSymbol,
    difficulty,
    totalStitches,
    fabricSizeText,
  } = data;

  // Let's configure dimensions for a high-res page (A4 proportion is approx 1:1.41)
  // We'll use 1200px horizontal, 1700px vertical for perfect printable rendering
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 1200;
  canvas.height = 1650;

  // 1. Draw Background (Cozy Linen/Warm Cardstock texture)
  ctx.fillStyle = "#FAF8F5"; // Soft warm off-white
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw a lovely border
  ctx.strokeStyle = "#E2DCD5";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = "#C5B29E";
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // 2. Draw Elegant Header
  ctx.fillStyle = "#4A3E3D"; // Deep charcoal-rose
  ctx.font = "bold 44px 'Playfair Display', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("ThreadSketch Studio", canvas.width / 2, 90);

  ctx.fillStyle = "#8C7A70"; // Cozy warm taupe
  ctx.font = "italic 22px 'Inter', sans-serif";
  ctx.fillText("— 执针绘梦，织刻光阴 —", canvas.width / 2, 130);

  // Draw separator line
  ctx.strokeStyle = "#E2DCD5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 160);
  ctx.lineTo(canvas.width - 100, 160);
  ctx.stroke();

  // 3. Draw Project Specs Title
  ctx.fillStyle = "#332211";
  ctx.font = "bold 34px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title || "未命名刺绣手作", 100, 220);

  // Draw Specs Info Box
  ctx.fillStyle = "#EFEAE4";
  ctx.fillRect(100, 240, canvas.width - 200, 80);
  ctx.strokeStyle = "#DBCFC2";
  ctx.strokeRect(100, 240, canvas.width - 200, 80);

  ctx.fillStyle = "#5E4E42";
  ctx.font = "16px sans-serif";
  const specsText = `网格大小: ${width} × ${height} 针   |   估算总针数: ${totalStitches} 针   |   绣艺难度: ${difficulty}   |   ${fabricSizeText}`;
  ctx.textAlign = "center";
  ctx.fillText(specsText, canvas.width / 2, 287);

  // 4. Draw Stitch Chart Grid
  // Compute chart boundaries
  // We want the chart to fit in a box of maximum 700x700px, centered
  const maxChartDim = 700;
  const cellSize = Math.floor(maxChartDim / Math.max(width, height));
  const chartWidth = cellSize * width;
  const chartHeight = cellSize * height;
  const startX = Math.floor((canvas.width - chartWidth) / 2);
  const startY = 360;

  // Background for the pattern area (clean white to make symbols pop)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(startX, startY, chartWidth, chartHeight);

  // Draw cells
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const color = grid[r * width + c];
      const cellX = startX + c * cellSize;
      const cellY = startY + r * cellSize;

      if (color) {
        // Draw color block
        ctx.fillStyle = color;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // Draw symbol inside color block (high-contrast symbol: light on dark, dark on light)
        const symbol = colorToSymbol[color] || "";
        const rgb = hexToRgb(color);
        const brightness = rgb ? (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 : 255;
        ctx.fillStyle = brightness < 128 ? "#FFFFFF" : "#000000";

        ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.7))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbol, cellX + cellSize / 2, cellY + cellSize / 2 + 1);
      }
    }
  }

  // Draw grid lines (highlighting 10x10)
  for (let c = 0; c <= width; c++) {
    const lx = startX + c * cellSize;
    const isMajor = c % 10 === 0;
    ctx.strokeStyle = isMajor ? "#E51A24" : "#E2DCD5"; // red line every 10th row for easy counting!
    ctx.lineWidth = isMajor ? 2.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(lx, startY);
    ctx.lineTo(lx, startY + chartHeight);
    ctx.stroke();
  }

  for (let r = 0; r <= height; r++) {
    const ly = startY + r * cellSize;
    const isMajor = r % 10 === 0;
    ctx.strokeStyle = isMajor ? "#E51A24" : "#E2DCD5";
    ctx.lineWidth = isMajor ? 2.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(startX, ly);
    ctx.lineTo(startX + chartWidth, ly);
    ctx.stroke();
  }

  // Draw border around chart
  ctx.strokeStyle = "#4A3E3D";
  ctx.lineWidth = 3;
  ctx.strokeRect(startX, startY, chartWidth, chartHeight);

  // 5. Draw Legend Title
  const legendStartY = startY + chartHeight + 40;
  ctx.fillStyle = "#4A3E3D";
  ctx.font = "bold 24px 'Playfair Display', Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("精品绣线材料清单 & 配线对照表", 100, legendStartY);

  // Draw Legend table
  // Column definitions: Symbol, Color, DMC Floss code & Name, Stitch count
  const colX = [100, 180, 280, 720]; // x-positions for columns
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#8C7A70";
  ctx.fillText("标记符号", colX[0], legendStartY + 30);
  ctx.fillText("材料样本", colX[1], legendStartY + 30);
  ctx.fillText("标准 DMC 绣线代码及对应色系名称", colX[2], legendStartY + 30);
  ctx.fillText("预估总针数", colX[3], legendStartY + 30);

  // Double thin underline
  ctx.strokeStyle = "#DBCFC2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, legendStartY + 42);
  ctx.lineTo(canvas.width - 100, legendStartY + 42);
  ctx.moveTo(100, legendStartY + 45);
  ctx.lineTo(canvas.width - 100, legendStartY + 45);
  ctx.stroke();

  // Sort and draw colors
  ctx.font = "15px sans-serif";
  let count = 0;
  uniqueColors.forEach((colorHex) => {
    // Limits output table height dynamically to avoid overflowing our printable page!
    if (count > 22) return; 

    const dmc = findNearestDMC(colorHex);
    const symbol = colorToSymbol[colorHex] || "";
    const stitches = grid.filter((c) => c === colorHex).length;

    const rowY = legendStartY + 68 + count * 26;

    // Draw symbol (bold dark in boxes)
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(symbol, colX[0] + 25, rowY);

    // Draw colored swatch with thin outline
    ctx.fillStyle = colorHex;
    ctx.fillRect(colX[1] + 5, rowY - 14, 40, 18);
    ctx.strokeStyle = "#8C7A70";
    ctx.lineWidth = 1;
    ctx.strokeRect(colX[1] + 5, rowY - 14, 40, 18);

    // Draw DMC Floss Name
    ctx.fillStyle = "#333333";
    ctx.font = "15px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`DMC ${dmc.code} — ${dmc.name}`, colX[2], rowY);

    // Draw stitch counts
    ctx.font = "bold 15px 'Inter', sans-serif";
    ctx.fillStyle = "#5E4E42";
    ctx.fillText(`${stitches} 针`, colX[3], rowY);

    count++;
  });

  if (uniqueColors.length > 22) {
    ctx.fillStyle = "#8C7A70";
    ctx.font = "italic 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`* 绣线上色表已截断。仅展示前 22 种。当前共需 ${uniqueColors.length} 种绣线。`, 100, legendStartY + 80 + count * 26);
  }

  // Footer Credit
  ctx.fillStyle = "#C5B29E";
  ctx.font = "italic 13px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("由 ThreadSketch 刺绣制图工作室优雅设计生成  •  ai.studio/build", canvas.width / 2, canvas.height - 50);

  return canvas;
}

/**
 * Triggers client-side browser download of the pattern chart sheet as a PNG image
 */
export function exportToPNG(data: ExportData) {
  const canvas = generateHighResSheet(data);
  const dataUrl = canvas.toDataURL("image/png");

  const cleanedTitle = (data.title || "ThreadSketch_Pattern").replace(/\s+/g, "_");
  const link = document.createElement("a");
  link.download = `${cleanedTitle}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Generates and downloads the pattern sheet as a high-fidelity vector-embedded PDF document
 */
export function exportToPDF(data: ExportData) {
  const canvas = generateHighResSheet(data);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // A4 dimensions are 210mm x 297mm
  const pdfWidth = 210;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight);

  const cleanedTitle = (data.title || "ThreadSketch_Pattern").replace(/\s+/g, "_");
  pdf.save(`${cleanedTitle}.pdf`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
