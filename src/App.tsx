import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  FileCheck,
  Grid,
  Sparkles,
  Layers,
  FileText,
  MousePointer,
  Dribbble,
  Upload,
  Image as ImageIcon,
  Heart,
  Grid3X3,
  HelpCircle,
  Scissors
} from "lucide-react";

import { DMCThread, findNearestDMC, DMC_THREADS } from "./data/dmcThreads";
import { PALETTE_PRESETS, PalettePreset } from "./data/palettes";
import { ThreadPalette } from "./components/ThreadPalette";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { quantizeGridColors, processImportedImage } from "./utils/quantize";
import { exportToPNG, exportToPDF } from "./utils/exporter";

export default function App() {
  // 1. Grid configurations
  const [gridSize, setGridSize] = useState<number>(40); // Standard grid size
  const [pendingSize, setPendingSize] = useState<number>(40); // For adjustable slider/input
  
  // Custom Elegant Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const width = gridSize;
  const height = gridSize;

  // Initialize grid with a beautifully pre-drawn geometric heart folk-art template on mount (or blank by default)
  const createFreshGrid = (w: number, h: number, shouldLoadTemplate: boolean = false) => {
    const defaultGrid = Array(w * h).fill(null);
    if (!shouldLoadTemplate) return defaultGrid;

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    // Draw a delightful retro heart and leaves in the center
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const rx = x - cx;
        const ry = y - (cy - 1);

        // Normalize vectors
        const dx = rx / (w * 0.28);
        const dy = (ry + 2) / (h * 0.28);

        // Standard stylized heart mathematical shape formula
        const equation = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * Math.pow(dy, 3);
        
        if (equation < 0.05) {
          // Inner gradient shading: deep red inside, bright red outside
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          defaultGrid[y * w + x] = distFromCenter < 0.45 ? "#9C0E1E" : "#E51A24"; // DMC 498 and DMC 666
        }
      }
    }

    // Add lovely leaf stitches in dark green (DMC 701 & 699)
    try {
      // Top left sprout
      defaultGrid[(cy - 6) * w + (cx - 4)] = "#31823B";
      defaultGrid[(cy - 5) * w + (cx - 5)] = "#006227";
      defaultGrid[(cy - 5) * w + (cx - 4)] = "#31823B";
      defaultGrid[(cy - 4) * w + (cx - 3)] = "#31823B";

      // Top right sprout
      defaultGrid[(cy - 6) * w + (cx + 4)] = "#31823B";
      defaultGrid[(cy - 5) * w + (cx + 5)] = "#006227";
      defaultGrid[(cy - 5) * w + (cx + 4)] = "#31823B";
      defaultGrid[(cy - 4) * w + (cx + 3)] = "#31823B";

      // Small sweet star-yellow flowers in center
      defaultGrid[(cy - 1) * w + cx] = "#FFD300"; // DMC 444 Yellow
      defaultGrid[(cy - 2) * w + (cx - 3)] = "#FFAA00"; // DMC 741 Orange
      defaultGrid[(cy - 2) * w + (cx + 3)] = "#FFAA00";
    } catch {
      // Guard against weird edge grid sizes
    }

    return defaultGrid;
  };

  const [grid, setGrid] = useState<(string | null)[]>(() => createFreshGrid(40, 40, false));

  // 2. Painting Tools state
  const [currentColor, setCurrentColor] = useState<string>("#E51A24"); // Bright Red DMC 666
  const [currentTool, setCurrentTool] = useState<"pencil" | "eraser">("pencil");
  const [brushSize, setBrushSize] = useState<number>(1); // 1, 2, or 3
  const [activePresetId, setActivePresetId] = useState<string>("dmc_classic");

  // 3. Zoom level of Drawing Interface
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100%, 200%, 400%
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // 5. Quantizer controls
  const [colorsLimit, setColorsLimit] = useState<number>(16); // 8, 16, or 32 colors limits

  // 6. Image pipeline variables
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importedImageName, setImportedImageName] = useState<string>("");
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [importLimitColors, setImportLimitColors] = useState<number>(16);

  // 7. Title of custom document pattern
  const [patternTitle, setPatternTitle] = useState<string>("我的手作刺绣画稿");

  // 8. History timeline engine
  const [history, setHistory] = useState<(string | null)[][]>(() => [[...createFreshGrid(40, 40, false)]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Synchronously update grid size and swap new default templates
  const handleGridSizeChange = (newSize: number) => {
    if (newSize === gridSize) return;
    triggerConfirm(
      "更换纸面网格大小",
      `确定要将画布网格规格更改为 ${newSize}×${newSize} 吗？为了适配新的编织网格，该操作将会重新分配一个新的空白画布，当前已绘制的作品将被清空并重置。`,
      () => {
        setGridSize(newSize);
        setPendingSize(newSize);
        const newGrid = createFreshGrid(newSize, newSize, false);
        setGrid(newGrid);
        setHistory([newGrid]);
        setHistoryIndex(0);
      }
    );
  };

  // Push new stroke onto timeline history stack
  const saveHistoryState = (gridToSave: (string | null)[]) => {
    const slice = history.slice(0, historyIndex + 1);
    const updatedHistory = [...slice, [...gridToSave]];
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setGrid([...history[prevIdx]]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setGrid([...history[nextIdx]]);
    }
  };

  const handleClearCanvas = () => {
    triggerConfirm(
      "一键清空/重置画布",
      "确定要全部清空并擦除画布上的全部图案吗？这将会清空全部落针和辅图。本操作无法撤回！",
      () => {
        const emptyGrid = Array(width * height).fill(null);
        setGrid(emptyGrid);
        saveHistoryState(emptyGrid);
        setImportedImageName("");
      }
    );
  };

  const handleLoadSampleTemplate = () => {
    triggerConfirm(
      "加载手作示例图案",
      "加载示例图案将会清空或替换您当前的画布。确定要加载古风民间艺术对称红心图案吗？",
      () => {
        const templateGrid = createFreshGrid(width, height, true);
        setGrid(templateGrid);
        saveHistoryState(templateGrid);
        setPatternTitle("古风民间艺术对称红心");
      }
    );
  };

  // 9. Symbol Mapping System
  // Complete array of unique visually separable symbols in black & white outputs
  const symbolsSet = useMemo(
    () => [
      "●", "×", "▲", "■", "★", "◆", "✿", "♥", "✥", "✪", "◈", "▼", "○", "□", "△", 
      "◇", "♡", "☆", "⬢", "⬡", "✚", "✜", "✳", "❋", "◨", "◪", "◑", "☉", "☾", "⚹", "⚼", "❃"
    ],
    []
  );

  // Extract all unique colors in the grid
  const uniqueColors = useMemo(() => {
    const seen: string[] = [];
    for (const color of grid) {
      if (color && !seen.includes(color)) {
        seen.push(color);
      }
    }
    return seen.sort(); // Maintain stable sort
  }, [grid]);

  // Map each unique color Hex to a character Symbol dynamically
  const colorToSymbol = useMemo(() => {
    const map: { [color: string]: string } = {};
    uniqueColors.forEach((color, idx) => {
      map[color] = symbolsSet[idx % symbolsSet.length];
    });
    return map;
  }, [uniqueColors, symbolsSet]);

  // 10. Color quantization command trigger
  const triggerColorQuantization = (limit: number) => {
    const quantized = quantizeGridColors(grid, limit);
    setGrid(quantized);
    saveHistoryState(quantized);
  };

  // 11. Image drag drop and file select handlers
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请导入有效的 JPEG、PNG 或 WebP 格式的刺绣图来源图片！");
      return;
    }

    setImportedImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Run offscreen canvas operations
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const offscreenCtx = offscreenCanvas.getContext("2d");

        if (offscreenCtx) {
          offscreenCtx.drawImage(img, 0, 0, width, height);
          const mappedGrid = processImportedImage(
            offscreenCtx,
            img.width,
            img.height,
            width,
            height,
            importLimitColors
          );
          setGrid(mappedGrid);
          saveHistoryState(mappedGrid);
          
          // Show quick alert
          alert(`成功导入图片“${file.name}”！已将其缩放拼豆至 ${width}×${height} 网格，并转化量化为最多 ${importLimitColors} 种 DMC 经典绣线色谱。`);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // 12. Calculate dynamic Stitch Stats
  const totalStitches = useMemo(() => grid.filter((c) => c !== null).length, [grid]);
  const estimatedDmcCount = uniqueColors.length;

  const difficultyRating = useMemo(() => {
    if (totalStitches === 0) return "暂无内容";
    if (totalStitches < 350 && estimatedDmcCount <= 8) return "简单 (手残党福音)";
    if (totalStitches < 1250 && estimatedDmcCount <= 16) return "中等 (进阶挑战性)";
    return "困难 (殿堂级刺绣大师)";
  }, [totalStitches, estimatedDmcCount]);

  // Estimate finished canvas dimensions based on 14 holes-per-inch Aida count (most popular!)
  const fabricSizeDisplay = useMemo(() => {
    const inchesWidth = width / 14;
    const inchesHeight = height / 14;
    const cmWidth = inchesWidth * 2.54;
    const cmHeight = inchesHeight * 2.54;

    return `满绣成品尺寸: ${cmWidth.toFixed(1)} × ${cmHeight.toFixed(1)} 厘米 (使用 14ct 标准艾达卡红布绣布)`;
  }, [width, height]);

  // Current hovered cell DMC code and name
  const hoveredCellDmc = useMemo(() => {
    if (!hoveredCell) return null;
    const color = grid[hoveredCell.y * width + hoveredCell.x];
    if (!color) return null;
    return findNearestDMC(color);
  }, [hoveredCell, grid, width]);

  // 13. High fidelity exports wrappers
  const handleExportPNG = () => {
    exportToPNG({
      title: patternTitle,
      grid,
      width,
      height,
      uniqueColors,
      colorToSymbol,
      difficulty: difficultyRating,
      totalStitches,
      fabricSizeText: fabricSizeDisplay,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: patternTitle,
      grid,
      width,
      height,
      uniqueColors,
      colorToSymbol,
      difficulty: difficultyRating,
      totalStitches,
      fabricSizeText: fabricSizeDisplay,
    });
  };

  return (
    <div className="linen-bg min-h-screen text-[#4A3E3D] font-sans pb-16 selection:bg-[#EBE3D5]">
      {/* Aesthetic ThreadSketch Header Board */}
      <header className="bg-[#F7F3EF]/95 backdrop-blur-md text-[#5A5A40] border-b-2 border-[#D9D2C5] px-6 py-6 shadow-sm relative overflow-hidden">
        {/* Decorative embroidery outline overlay */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#8C7355,#8C7355_10px,#F7F3EF_10px,#F7F3EF_20px)] opacity-20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-needle bg-white p-2 rounded-full border border-[#D9D2C5] inline-block shadow-sm">
                🪡
              </span>
              <h1 className="text-3xl font-serif font-extrabold tracking-tight text-[#5A5A40] flex items-center gap-2">
                ThreadSketch
              </h1>
              <span className="text-[10px] uppercase tracking-widest bg-[#5A5A40] text-white font-semibold px-2.5 py-0.5 rounded-full border border-[#5A5A40] hidden sm:inline-block">
                刺绣艺术坊 v1.2
              </span>
              <span className="text-[10px] bg-white text-[#8C7355] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#D9D2C5] inline-block">
                作者: @K1sek1:3
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#8C7355] pr-4 block font-serif italic text-left">
              ✨ 勾勒指尖妙想，缝制光阴心音。在这里将您的像素画稿转化为精致的十字绣实物图纸！
            </p>
          </div>

          {/* Pattern Custom Document Title Name input in accent wood paper-panel */}
          <div className="bg-white p-3 rounded-xl border border-[#D9D2C5] w-full md:w-80 space-y-1 shadow-sm">
            <label className="text-[10px] uppercase tracking-wider text-[#8C7355] font-mono block font-bold text-left">
              刺绣图纸项目名称
            </label>
            <input
              type="text"
              value={patternTitle}
              onChange={(e) => setPatternTitle(e.target.value)}
              className="bg-transparent text-[#5A5A40] font-serif font-bold outline-none border-b border-[#D9D2C5] hover:border-[#8C7355] focus:border-[#5A5A40] w-full text-sm py-0.5 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main Studio Workdesk Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: Canvas Toolbox Controls (SPAN 3) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Atelier Frame & Brush Controls */}
          <div className="card-craft p-5 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#5A5A40] border-b pb-2 border-[#D9D2C5] flex items-center gap-2">
              <span>🧰</span> 手作工坊工具箱
            </h3>

            {/* Grid Sizing & Fine Tuning Adjuster */}
            <div className="space-y-3 bg-[#F7F3EF]/60 p-3.5 rounded-xl border border-[#D9D2C5]">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8C7355] flex items-center gap-1.5 justify-start">
                  <Grid className="w-3.5 h-3.5 text-[#8C7355]" /> 纸面网格规格 (十字绣格)
                </label>
                <span className="text-[11px] font-mono font-bold text-[#5A5A40] bg-white border border-[#D9D2C5] px-2 py-0.5 rounded-md">
                  当前: {gridSize} × {gridSize}
                </span>
              </div>

              {/* Grid presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#8C7355] block text-left font-semibold">快速推荐预设：</span>
                <div className="grid grid-cols-5 gap-1">
                  {[20, 40, 60, 80, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPendingSize(size);
                        handleGridSizeChange(size);
                      }}
                      className={`text-[10px] py-1 rounded-md border transition cursor-pointer font-bold ${
                        size === gridSize
                          ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs"
                          : "bg-white hover:bg-[#F7F3EF] text-[#8C7355] border-[#D9D2C5]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom manual Slider / Input controls */}
              <div className="space-y-2 pt-1 border-t border-[#D9D2C5]/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#8C7355] text-left font-semibold">自定义精准微调：</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={pendingSize}
                      onChange={(e) => {
                        const val = Math.max(10, Math.min(120, Number(e.target.value)));
                        setPendingSize(val);
                      }}
                      className="w-12 text-center text-[11px] bg-white text-[#5A5A40] border border-[#D9D2C5] py-0.5 rounded-md font-mono font-extrabold focus:outline-none focus:border-[#8C7355]"
                    />
                    <span className="text-[10px] text-[#8C7355] font-bold">格</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#8C7355]">10</span>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={pendingSize}
                    onChange={(e) => setPendingSize(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-[#D9D2C5] rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                    style={{ background: `linear-gradient(to right, #5A5A40 0%, #5A5A40 ${((pendingSize - 10) / 110) * 100}%, #D9D2C5 ${((pendingSize - 10) / 110) * 100}%, #D9D2C5 100%)` }}
                  />
                  <span className="text-[10px] font-mono text-[#8C7355]">120</span>
                </div>

                {/* Apply Change Button */}
                <button
                  type="button"
                  onClick={() => handleGridSizeChange(pendingSize)}
                  disabled={pendingSize === gridSize}
                  className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    pendingSize === gridSize
                      ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
                      : "bg-[#8C7355] hover:bg-[#725E46] text-white shadow-sm active:translate-y-0.5"
                  }`}
                >
                  <Grid3X3 className="w-3 h-3" /> 应用新规格：{pendingSize} × {pendingSize} 格
                </button>
              </div>
            </div>

            {/* Brush vs Eraser Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8C7355] block text-left">落针缝线画笔</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentTool("pencil")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl border transition cursor-pointer ${
                    currentTool === "pencil"
                      ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-inner font-bold"
                      : "bg-white hover:bg-[#F7F3EF] text-[#8C7355] border-[#D9D2C5]"
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" /> 上色缝针
                </button>
                <button
                  onClick={() => setCurrentTool("eraser")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs rounded-xl border transition cursor-pointer ${
                    currentTool === "eraser"
                      ? "bg-[#CE1B2D] text-white border-[#CE1B2D] shadow-inner font-bold"
                      : "bg-white hover:bg-[#F7F3EF] text-[#8C7355] border-[#D9D2C5]"
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" /> 拆线器
                </button>
              </div>
            </div>

            {/* Brush Size parameters */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8C7355]">针头画刷尺寸 (格宽)</label>
                <span className="text-[11px] font-bold text-[#5A5A40] bg-[#F7F3EF] px-1.5 py-0.5 rounded-md font-mono border border-[#D9D2C5]">
                  {brushSize} × {brushSize}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`text-xs py-1.5 rounded-lg border transition cursor-pointer ${
                      size === brushSize
                        ? "bg-[#5A5A40] text-white border-[#5A5A40] font-bold"
                        : "bg-white hover:bg-[#F7F3EF] text-[#8C7355] border-[#D9D2C5]"
                    }`}
                  >
                    {size === 1 ? "细单孔" : size === 2 ? "中双孔" : "粗九孔"}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Action Undo and Redo operations */}
            <div className="space-y-2 pt-1 border-t border-[#D9D2C5]/40 mt-3">
              <label className="text-xs font-bold text-[#8C7355] block text-left">时光时间控制 & 缝艺操作</label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-[#F7F3EF] disabled:opacity-40 disabled:hover:bg-white border border-[#D9D2C5] rounded-lg text-xs font-medium text-[#8C7355] cursor-pointer"
                  title="撤回上一步缝印"
                >
                  <Undo2 className="w-3.5 h-3.5" /> 撤销
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-[#F7F3EF] disabled:opacity-40 disabled:hover:bg-white border border-[#D9D2C5] rounded-lg text-xs font-medium text-[#8C7355] cursor-pointer"
                  title="重做下一步缝印"
                >
                  <Redo2 className="w-3.5 h-3.5" /> 重做
                </button>
              </div>

              {/* Huge One-click delete/wipe all capability */}
              <button
                onClick={handleClearCanvas}
                className="w-full mt-1.5 flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm active:translate-y-0.5"
                title="彻底清空当前绣纹，一键重置"
              >
                <Trash2 className="w-4 h-4 text-red-600 animate-pulse" /> 一键全部删除 / 清空画布
              </button>

              {/* Load elegant pre-drawn sample template */}
              <button
                onClick={handleLoadSampleTemplate}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 text-amber-800 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm active:translate-y-0.5"
                title="加载系统自带的精美对称红心底稿"
              >
                <Sparkles className="w-4 h-4 text-amber-600" /> 加载手作示例图案 (十字红心)
              </button>
            </div>
          </div>

          {/* Color Palette component */}
          <ThreadPalette
            currentColor={currentColor}
            setCurrentColor={setCurrentColor}
            activePresetId={activePresetId}
            setActivePresetId={setActivePresetId}
            colorToSymbol={colorToSymbol}
          />
        </section>

        {/* COLUMN 2: Drawing Grid board (SPAN 6) */}
        <section className="lg:col-span-6 flex flex-col items-center gap-6">
          
          {/* Main draw workspace block */}
          <div className="w-full">
            <DrawingCanvas
              grid={grid}
              setGrid={setGrid}
              gridWidth={width}
              gridHeight={height}
              currentColor={currentColor}
              currentTool={currentTool}
              brushSize={brushSize}
              setHoveredCell={setHoveredCell}
              saveHistoryState={saveHistoryState}
            />
          </div>

          {/* Hover Status Coordinates Floating HUD */}
          <div className="w-full card-craft p-3 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
            <div className="flex items-center gap-1 text-[#8C7355]">
              <MousePointer className="w-3.5 h-3.5 text-[#8C7355]" />
              <span>智能针步跟踪：</span>
            </div>
            {hoveredCell ? (
              <div className="flex items-center gap-1.5 text-[#5A5A40]">
                <span className="font-bold bg-[#F7F3EF] border border-[#D9D2C5] px-1.5 py-0.5 rounded text-[11px]">
                  横坐标 X: {hoveredCell.x}, 纵坐标 Y: {hoveredCell.y}
                </span>
                {hoveredCellDmc ? (
                  <span className="text-[#8C7355] font-bold">
                    • DMC {hoveredCellDmc.code} ({hoveredCellDmc.name})
                  </span>
                ) : (
                  <span className="text-stone-400 italic font-bold">• 未落针区域</span>
                )}
              </div>
            ) : (
              <span className="text-stone-400 italic">在上方滑过网格以进行落针探测...</span>
            )}
          </div>

          {/* Color cluster quantizer console */}
          <div className="w-full card-craft p-5 space-y-4">
            <div className="border-b pb-2 border-[#D9D2C5] flex items-center justify-between">
              <h3 className="font-serif font-bold text-md text-[#5A5A40] flex items-center gap-2">
                <span>⚡</span> 线谱色彩智能聚合
              </h3>
              <span className="text-[10px] font-mono uppercase bg-[#F7F3EF] text-[#8C7355] border border-[#D9D2C5] px-2 py-0.5 rounded-full">
                简化画笔颜色
              </span>
            </div>
            <p className="text-xs text-[#8C7355] leading-relaxed text-left">
              精美的刺绣套包通常只需精炼、小巧的色绞配搭。通过一键压缩，将您作品中所含杂色智能聚拢到数量最精简的核心 DMC 标准色谱中。
            </p>
            <div className="flex items-center gap-2.5">
              {[8, 16, 32].map((limit) => (
                <button
                  key={limit}
                  onClick={() => triggerColorQuantization(limit)}
                  className="flex-1 text-xs py-2 bg-white hover:bg-[#F7F3EF] border border-[#D9D2C5] creative-btn font-bold text-[#5A5A40] rounded-xl transition shadow-sm active:translate-y-0.5 cursor-pointer"
                >
                  聚合成 {limit} 色线
                </button>
              ))}
            </div>
          </div>

          {/* Image Import drag-drop wizard */}
          <div className="w-full card-craft p-5 space-y-4">
            <div className="border-b pb-2 border-[#D9D2C5]">
              <h3 className="font-serif font-bold text-md text-[#5A5A40] flex items-center gap-2">
                <span>🖼️</span> 导入照片 & 智能拼豆像素化
              </h3>
            </div>
            
            {/* Direct selector for upload constraints */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F7F3EF] p-3 rounded-xl border border-[#D9D2C5]">
              <div className="space-y-0.5 text-left">
                <span className="text-xs font-bold text-[#5A5A40] block">导入绣线极限色彩深度</span>
                <p className="text-[10px] text-[#8C7355]">限制导入后的图案色值簇群密度数量</p>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#D9D2C5]">
                {[8, 16, 32].map((num) => (
                  <button
                    key={num}
                    onClick={() => setImportLimitColors(num)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      importLimitColors === num
                        ? "bg-[#5A5A40] text-white"
                        : "text-[#8C7355] hover:bg-[#F7F3EF]"
                    }`}
                  >
                    {num} 色色谱
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Drag Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? "border-[#5A5A40] bg-[#F7F3EF] scale-[0.99]"
                  : "border-[#D9D2C5] hover:bg-[#F7F3EF] bg-white"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm text-[#8C7355] border border-[#D9D2C5]">
                  <Upload className="w-5 h-5 text-[#8C7355]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#5A5A40]">
                    将电脑上的图片拖拽到此处，或 <span className="underline text-[#8C7355]">点击寻找文件</span>
                  </span>
                  <p className="text-[10px] text-[#8C7355] mt-1 text-center">
                    支持 JPEG、PNG、WebP 等格式图案。导入后程序将基于您当前的网格线规格进行智能量化。
                  </p>
                </div>
              </div>
            </div>

            {importedImageName && (
              <div className="text-[11px] px-2 py-1 bg-[#F7F3EF] text-[#5A5A40] rounded border border-[#D9D2C5] font-mono flex items-center justify-between">
                <span>已经匹配并分析底图: {importedImageName}</span>
                <button
                  onClick={() => setImportedImageName("")}
                  className="hover:text-red-700 font-bold cursor-pointer"
                >
                  清除该图片
                </button>
              </div>
            )}
          </div>
        </section>

        {/* COLUMN 3: Pattern Previz Output (SPAN 3) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Stitch Gauge stats panel */}
          <div className="card-craft p-5 space-y-4">
            <div className="border-b pb-2 border-[#eadecf]">
              <h3 className="font-serif font-bold text-md text-[#5A5A40] flex items-center gap-2">
                <span>📏</span> 实时编制数据规格
              </h3>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-[#F7F3EF] p-2 rounded-lg border border-[#D9D2C5]">
                <span className="text-[#8C7355]">落针满绣总数:</span>
                <span className="font-bold text-[#5A5A40] text-sm">{totalStitches} 针</span>
              </div>
              <div className="flex justify-between items-center bg-[#F7F3EF] p-2 rounded-lg border border-[#D9D2C5]">
                <span className="text-[#8C7355]">所用绣线种类数:</span>
                <span className="font-bold text-[#5A5A40] text-sm">{estimatedDmcCount} 种颜色</span>
              </div>
              <div className="flex justify-between items-center bg-[#F7F3EF] p-2 rounded-lg border border-[#D9D2C5]">
                <span className="text-[#8C7355]">绣法建议难度:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  difficultyRating.includes("简单")
                    ? "bg-green-50 text-green-800"
                    : difficultyRating.includes("中等")
                    ? "bg-amber-50 text-amber-800"
                    : "bg-rose-50 text-rose-800"
                }`}>
                  {difficultyRating}
                </span>
              </div>
              <div className="bg-[#F7F3EF] p-2.5 rounded-lg border border-[#D9D2C5] text-[11px] text-[#8C7355] italic leading-relaxed text-center">
                {fabricSizeDisplay}
              </div>
            </div>
          </div>

          {/* Export tools */}
          <div className="card-craft p-5 space-y-4">
            <div className="border-b pb-2 border-[#D9D2C5]">
              <h3 className="font-serif font-bold text-md text-[#5A5A40] flex items-center gap-2">
                <span>📁</span> 图纸配线单导出
              </h3>
            </div>
            <p className="text-xs text-[#8C7355] leading-relaxed text-left">
              编译打包您的定制大底。点击下方可以免费下载包含高清数字网格、针法对比符号和 DMC 绣线清单元件的实物绣制图册。
            </p>
            <div className="space-y-2">
              <button
                onClick={handleExportPNG}
                className="w-full bg-[#5A5A40] hover:bg-[#454531] cursor-pointer text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:translate-y-0.5"
              >
                <Download className="w-4 h-4 text-[#D9D2C5]" /> 导出精美刺绣底稿 (PNG 格式)
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full bg-[#8C7355] hover:bg-[#725C44] cursor-pointer text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:translate-y-0.5"
              >
                <FileText className="w-4 h-4 text-[#D9D2C5]" /> 导出矢量配线画稿 (PDF 便携格式)
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER AREA - FULL WIDTH COLOR SCALE LEGEND inventory (SPAN 12) */}
      <footer className="max-w-7xl mx-auto px-4 mt-8">
        <div className="card-craft p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3 border-[#D9D2C5]">
            <div className="text-left">
              <h3 className="font-serif font-bold text-xl text-[#5A5A40] flex items-center gap-2.5 justify-start">
                <span>📋</span> DMC 法国色线系统映射 & 手作物资盘点对照表
              </h3>
              <p className="text-xs text-[#8C7355] mt-0.5 font-serif italic text-left">
                用于刺绣材料实体店和网上选购时方便核对、对色及盘线之用的高级绣物对色单。
              </p>
            </div>
            {/* Quick stats on inventory density */}
            <span className="text-xs font-mono bg-[#F7F3EF] border border-[#D9D2C5] text-[#5A5A40] px-3 py-1 rounded-full font-bold shrink-0">
              套包所需棉线规格数: <span>{estimatedDmcCount} 种类/绞</span>
            </span>
          </div>

          {/* Inventory Table mapping grid */}
          {uniqueColors.length === 0 ? (
            <div className="text-center py-8 text-[#8C7355] italic text-sm">
              当前暂未登记任何绣线代码，请在画布上动笔绘画后，自动为您生成专属 DMC 手作物料卡片！
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#F7F3EF]/70 text-[#8C7355] uppercase font-mono tracking-wider border-b border-[#D9D2C5]">
                    <th className="py-2.5 px-4 text-left">针法符号</th>
                    <th className="py-2.5 px-4 text-left">线稿色样</th>
                    <th className="py-2.5 px-4 text-left">DMC 绣线代码</th>
                    <th className="py-2.5 px-4 text-left">标准色名</th>
                    <th className="py-2.5 px-4 text-left">预估总针数</th>
                    <th className="py-2.5 px-4 text-center">线绞画刷调用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D2C5]">
                  {uniqueColors.map((colorHex, idx) => {
                    const dmc = findNearestDMC(colorHex);
                    const symbol = colorToSymbol[colorHex] || "●";
                    const stitchesCount = grid.filter((c) => c === colorHex).length;

                    return (
                      <tr key={idx} className="hover:bg-[#F7F3EF]/40 transition text-left">
                        {/* 1. Symbol column */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-lg font-extrabold bg-[#F7F3EF] border border-[#D9D2C5] px-2.5 py-1 rounded-md text-[#5A5A40]">
                            {symbol}
                          </span>
                        </td>
                        {/* 2. Hex swatch */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-10 h-6 rounded-md border border-gray-300 inline-block shadow-sm"
                              style={{ backgroundColor: colorHex }}
                            />
                            <span className="font-mono font-bold text-[#8C7355]">{colorHex}</span>
                          </div>
                        </td>
                        {/* 3. DMC Floss Code */}
                        <td className="py-3 px-4 font-mono font-extrabold text-[#5A5A40]">
                          DMC {dmc.code}
                        </td>
                        {/* 4. DMC Color Name */}
                        <td className="py-3 px-4 font-serif text-sm font-medium text-[#5A5A40]">
                          {dmc.name}
                        </td>
                        {/* 5. Stitch Count */}
                        <td className="py-3 px-4 font-mono font-bold text-[#8C7355]">
                          {stitchesCount} 针
                        </td>
                        {/* 6. Draw with this color button picker shortcut! */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setCurrentColor(colorHex);
                              setCurrentTool("pencil");
                            }}
                            className="text-xs bg-white hover:bg-[#F7F3EF] hover:text-[#5A5A40] text-[#8C7355] border border-[#D9D2C5] px-2.5 py-1 rounded-lg transition shadow-sm font-medium cursor-pointer"
                          >
                            选用该色绘图 🧵
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Small studio note */}
          <div className="bg-[#F7F3EF] p-3 rounded-lg border border-[#D9D2C5] text-[10px] text-[#8C7355] italic text-center flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-left font-serif leading-relaxed">* 绣线色号智能匹配自动使用 RGB 色彩白度欧几里得距离逼近矩阵。物料单名称和标记符号均完美参照法国 DMC 标准 25 号纯棉刺绣线系列。</span>
            <span className="font-mono text-[10px] font-bold text-[#5A5A40] not-italic shrink-0 bg-white px-2.5 py-1 rounded-md border border-[#D9D2C5] shadow-xs">
              设计创作: <span className="underline decoration-[#8C7355] underline-offset-2">@K1sek1:3</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Custom Elegant Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-[#332211]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#FAF6F0] rounded-2xl border-2 border-[#8C7355] max-w-sm w-full p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-center gap-2.5 text-[#5A5A40]">
                <HelpCircle className="w-5.5 h-5.5 text-[#8C7355] shrink-0" />
                <h3 className="font-serif font-bold text-base text-[#5A5A40]">
                  {confirmModal.title}
                </h3>
              </div>
              
              <p className="text-xs text-[#8C7355] leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2 bg-white hover:bg-[#F7F3EF] border border-[#D9D2C5] text-xs font-bold text-[#8C7355] rounded-xl transition shadow-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2 bg-[#5A5A40] hover:bg-[#454531] text-xs font-bold text-white rounded-xl transition shadow-xs cursor-pointer"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
