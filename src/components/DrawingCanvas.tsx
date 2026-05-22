import React, { useRef, useEffect, useState } from "react";
import { Move, Grid3X3, RotateCcw } from "lucide-react";

interface DrawingCanvasProps {
  grid: (string | null)[];
  setGrid: (newGrid: (string | null)[]) => void;
  gridWidth: number;
  gridHeight: number;
  currentColor: string;
  currentTool: "pencil" | "eraser";
  brushSize: number;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  saveHistoryState: (currentGrid: (string | null)[]) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  grid,
  setGrid,
  gridWidth,
  gridHeight,
  currentColor,
  currentTool,
  brushSize,
  setHoveredCell,
  saveHistoryState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPaintedCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const [localHover, setLocalHover] = useState<{ x: number; y: number } | null>(null);

  // Keep live reference to latest grid state to avoid stale closure under rapid updates
  const gridRef = useRef<(string | null)[]>(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Bresenham's Line Algorithm to interpolate smooth strokes between rapid pointer events
  const getLinePoints = (x0: number, y0: number, x1: number, y1: number) => {
    const points: { x: number; y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return points;
  };

  // Set visual scale/dimensions for drawing block
  const displaySize = 540; // Pixels
  const cellSize = displaySize / gridWidth;

  // Render trigger whenever grid or metadata changes
  useEffect(() => {
    drawCanvasContent();
  }, [grid, gridWidth, gridHeight, localHover]);

  const drawCanvasContent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with transparent/background tone
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw solid cells
    for (let r = 0; r < gridHeight; r++) {
      for (let c = 0; c < gridWidth; c++) {
        const cellColor = grid[r * gridWidth + c];
        const cellX = c * cellSize;
        const cellY = r * cellSize;

        if (cellColor) {
          ctx.fillStyle = cellColor;
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        } else {
          // Empty cell gets very subtle linen stitch cross template
          ctx.fillStyle = "#F7F3EF"; 
          ctx.fillRect(cellX, cellY, cellSize, cellSize);

          // Draw tiny light gray dot in the center of empty cell to assist drawing
          ctx.fillStyle = "#D9D2C5";
          ctx.beginPath();
          ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, 1.2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // 2. Hover overlay preview showing brush size boundaries
    if (localHover) {
      const { x: cx, y: cy } = localHover;
      const rOffset = -Math.floor((brushSize - 1) / 2);
      const rEnd = rOffset + brushSize;

      ctx.fillStyle = currentTool === "eraser" ? "rgba(229, 26, 36, 0.15)" : `${currentColor}1A`; // 10% opacity
      ctx.strokeStyle = currentTool === "eraser" ? "#E51A24" : currentColor;
      ctx.lineWidth = 1;

      for (let dy = rOffset; dy < rEnd; dy++) {
        for (let dx = rOffset; dx < rEnd; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;

          if (tx >= 0 && tx < gridWidth && ty >= 0 && ty < gridHeight) {
            ctx.fillRect(tx * cellSize, ty * cellSize, cellSize, cellSize);
            ctx.strokeRect(tx * cellSize + 0.5, ty * cellSize + 0.5, cellSize - 1, cellSize - 1);
          }
        }
      }
    }

    // 3. Draw grid dividing lines
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= gridWidth; c++) {
      const x = c * cellSize;
      const isMajor = c % 10 === 0 && c > 0 && c < gridWidth;
      ctx.strokeStyle = isMajor ? "#8C7355" : "#D9D2C5";
      ctx.lineWidth = isMajor ? 1.5 : 0.5;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displaySize);
      ctx.stroke();
    }

    for (let r = 0; r <= gridHeight; r++) {
      const y = r * cellSize;
      const isMajor = r % 10 === 0 && r > 0 && r < gridHeight;
      ctx.strokeStyle = isMajor ? "#8C7355" : "#D9D2C5";
      ctx.lineWidth = isMajor ? 1.5 : 0.5;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displaySize, y);
      ctx.stroke();
    }

    // 4. Extra high-contrast axis markers every 10 indices
    for (let c = 10; c < gridWidth; c += 10) {
      ctx.fillStyle = "#5A5A40";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(String(c), c * cellSize + 2, 10);
      ctx.fillText(String(c), 2, c * cellSize + 10);
    }
  };

  // Convert mouse coordinate on canvas bounding client rect to Grid index
  const getGridCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * gridWidth);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * gridHeight);

    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      return { x, y };
    }
    return null;
  };

  // Brush action on coordinates
  const paintCellAt = (cx: number, cy: number, gridReplacer: (string | null)[]) => {
    const offsetStart = -Math.floor((brushSize - 1) / 2);
    const offsetEnd = offsetStart + brushSize;

    let modified = false;

    for (let dy = offsetStart; dy < offsetEnd; dy++) {
      for (let dx = offsetStart; dx < offsetEnd; dx++) {
        const targetX = cx + dx;
        const targetY = cy + dy;

        if (targetX >= 0 && targetX < gridWidth && targetY >= 0 && targetY < gridHeight) {
          const idx = targetY * gridWidth + targetX;
          const targetVal = currentTool === "eraser" ? null : currentColor;

          if (gridReplacer[idx] !== targetVal) {
            gridReplacer[idx] = targetVal;
            modified = true;
          }
        }
      }
    }

    return modified;
  };

  // Drag listeners
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only work with left click

    const coords = getGridCoords(e);
    if (!coords) return;

    isDrawingRef.current = true;
    lastPaintedCoordsRef.current = coords;

    setGrid(prev => {
      const next = [...prev];
      const hasModified = paintCellAt(coords.x, coords.y, next);
      return hasModified ? next : prev;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    if (!coords) {
      setLocalHover(null);
      setHoveredCell(null);
      return;
    }

    setLocalHover(coords);
    setHoveredCell(coords);

    if (isDrawingRef.current) {
      const lastCoords = lastPaintedCoordsRef.current || coords;
      const points = getLinePoints(lastCoords.x, lastCoords.y, coords.x, coords.y);

      setGrid(prev => {
        const next = [...prev];
        let hasModified = false;
        for (const pt of points) {
          if (paintCellAt(pt.x, pt.y, next)) {
            hasModified = true;
          }
        }
        return hasModified ? next : prev;
      });
      
      lastPaintedCoordsRef.current = coords;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPaintedCoordsRef.current = null;
      // Save full grid state in undo stack on mouse release using real-time direct ref values
      saveHistoryState(gridRef.current);
    }
    if (!isDrawingRef.current) {
      setLocalHover(null);
      setHoveredCell(null);
    }
  };

  return (
    <div className="flex flex-col items-center select-none bg-white p-6 rounded-2xl border border-[#D9D2C5] relative shadow-sm">
      {/* 刺绣动态标尺徽记 */}
      <div className="absolute top-4 right-4 text-xs font-bold text-[#8C7355] flex items-center gap-1 bg-[#F7F3EF] px-2.5 py-1 rounded-full border border-[#D9D2C5]">
        <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse mr-0.5" />
        作图刺绣层
      </div>

      {/* 实际画布模块 */}
      <div className="stitch-border rounded-xl p-1 bg-[#F7F3EF] shadow-inner mb-4 border border-[#D9D2C5]">
        <canvas
          ref={canvasRef}
          width={displaySize}
          height={displaySize}
          className="cursor-crosshair rounded-lg block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ width: `${displaySize}px`, height: `${displaySize}px` }}
        />
      </div>

      {/* 网格指南页脚 */}
      <div className="flex items-center justify-between w-full px-2 text-xs text-[#8C7355]">
        <div className="flex items-center gap-1">
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>鼠标左键点击并在网格上拖动即可开始绣线绘图</span>
        </div>
        <div className="text-[11px] font-mono font-bold">
          画布规格: {gridWidth}x{gridHeight}
        </div>
      </div>
    </div>
  );
};
