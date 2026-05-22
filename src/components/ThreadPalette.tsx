import React from "react";
import { DMCThread, findNearestDMC } from "../data/dmcThreads";
import { PALETTE_PRESETS } from "../data/palettes";
import { Pipette, Sparkles } from "lucide-react";

interface ThreadPaletteProps {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  activePresetId: string;
  setActivePresetId: (id: string) => void;
  colorToSymbol: { [color: string]: string };
}

export const ThreadPalette: React.FC<ThreadPaletteProps> = ({
  currentColor,
  setCurrentColor,
  activePresetId,
  setActivePresetId,
  colorToSymbol,
}) => {
  const activePreset =
    PALETTE_PRESETS.find((p) => p.id === activePresetId) || PALETTE_PRESETS[0];

  const currentDmc = findNearestDMC(currentColor);

  // Handle custom color picking
  const onColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentColor(e.target.value.toUpperCase());
  };

  return (
    <div className="card-craft p-5 space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between border-b pb-2 border-[#D9D2C5]">
        <h3 className="font-serif font-bold text-lg text-[#5A5A40] flex items-center gap-2">
          <span className="text-xl">🧵</span> 针缝色彩线谱
        </h3>
        <span className="text-xs font-mono bg-[#F7F3EF] text-[#8C7355] px-2 py-0.5 rounded-full border border-[#D9D2C5]">
          DMC 官方色号对照
        </span>
      </div>

      {/* 预设套包选择器 */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#8C7355]">主题绣线套包预设</label>
        <div className="grid grid-cols-2 gap-1.5">
          {PALETTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setActivePresetId(preset.id);
                if (preset.colors.length > 0) {
                  setCurrentColor(preset.colors[0]);
                }
              }}
              className={`text-xs px-2 py-1.5 rounded-lg border text-left transition cursor-pointer ${
                activePresetId === preset.id
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm font-bold"
                  : "bg-white hover:bg-[#F7F3EF] text-[#8C7355] border-[#D9D2C5]"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 活动线绞材质浮层 */}
      <div className="bg-[#F7F3EF] p-3 rounded-xl border border-[#D9D2C5] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8C7355]">当前首选绣线</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded-full border border-gray-300 inline-block shadow-sm"
              style={{ backgroundColor: currentColor }}
            />
            <span className="text-xs font-mono font-bold text-[#5A5A40]">{currentDmc.code}</span>
          </div>
        </div>
        <div className="text-sm font-serif font-bold text-[#5A5A40] truncate">
          DMC {currentDmc.code} : {currentDmc.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8C7355] font-mono">
          <span className="bg-white border border-[#D9D2C5] px-1.5 py-0.5 rounded text-[11px] font-bold">
            图纸符号: {colorToSymbol[currentColor] || "●"}
          </span>
          <span>色值: {currentColor}</span>
        </div>
      </div>

      {/* 备选色绞 */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#8C7355]">套包选用线绞</label>
        <div className="grid grid-cols-5 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
          {activePreset.colors.map((colorHex, idx) => {
            const isSelected = currentColor.toLowerCase() === colorHex.toLowerCase();
            const threadDmc = findNearestDMC(colorHex);
            const symbol = colorToSymbol[colorHex] || "";

            return (
              <button
                key={idx}
                onClick={() => setCurrentColor(colorHex)}
                title={`DMC ${threadDmc.code} — ${threadDmc.name}`}
                className="group flex flex-col items-center relative focus:outline-none cursor-pointer"
              >
                {/* 绞线外观造型 */}
                <div
                  className={`w-10 h-10 rounded-xl relative flex items-center justify-center transition-all ${
                    isSelected
                      ? "ring-2 ring-[#8C7355] ring-offset-2 scale-110 shadow-md"
                      : "hover:scale-105 border border-[#D9D2C5]"
                  }`}
                  style={{ backgroundColor: colorHex }}
                >
                  {/* 绕线筒仿真中央高亮 */}
                  <div className="absolute top-1 bottom-1 left-3.5 right-3.5 bg-white opacity-20 rounded" />
                  
                  {/* 色块内叠加高亮对比符号 */}
                  <span className="text-[11px] font-bold font-mono opacity-80 group-hover:opacity-100 mix-blend-difference text-white">
                    {symbol}
                  </span>
                </div>
                {/* 线标编号 */}
                <span className="text-[10px] font-mono mt-1 text-[#8C7355] group-hover:text-[#5A5A40] truncate w-full text-center">
                  {threadDmc.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 自定义染线配色 */}
      <div className="border-t border-[#D9D2C5] pt-3 flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0">
          <input
            type="color"
            value={currentColor}
            onChange={onColorChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            id="custom-color-picker"
          />
          <label
            htmlFor="custom-color-picker"
            className="flex items-center justify-center w-full h-full rounded-full border border-[#D9D2C5] bg-white cursor-pointer hover:bg-[#F7F3EF] transition shadow-sm"
          >
            <Pipette className="w-5 h-5 text-[#8C7355]" />
          </label>
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-xs font-bold text-[#5A5A40] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8C7355]" /> 手工定制扎染绣线
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentColor}
              onChange={onColorChange}
              placeholder="输入色值 如 #E51A24"
              className="w-full text-xs font-mono bg-white border border-[#D9D2C5] px-2 py-1.5 rounded-lg text-gray-700 outline-none focus:border-[#8C7355]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
