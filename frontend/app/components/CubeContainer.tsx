"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

export type CubeFace = "front" | "right" | "back" | "left";

interface CubeContainerProps {
  activeFace: CubeFace;
  faces: Record<CubeFace, ReactNode>;
  size?: number;
  perspective?: number;
  tiltX?: number;
  onTransitionEnd?: () => void;
}

const faceRotations: Record<CubeFace, number> = {
  front: 0,
  right: -90,
  back: -180,
  left: -270,
};

export function CubeContainer({
  activeFace,
  faces,
  size = 100,
  perspective = 900,
  tiltX = 0,
  onTransitionEnd,
}: CubeContainerProps) {
  const translateZ = size / 2;

  const cubeStyle = useMemo(
    () => ({
      transform: `rotateX(${tiltX}deg) rotateY(${faceRotations[activeFace]}deg)`,
    }),
    [activeFace, tiltX]
  );

  const faceBaseClasses =
    "absolute inset-0 w-full h-full backface-hidden";

  return (
    <div
      className="relative w-full h-full"
      style={{
        perspective: `${perspective}px`,
      }}
    >
      <div
        className="relative w-full h-full preserve-3d transition-transform duration-[600ms] ease-out"
        style={{
          ...cubeStyle,
          transformStyle: "preserve-3d",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {/* Front Face - 对话模块 */}
        <div
          className={`${faceBaseClasses} ${
            activeFace === "front"
              ? "pointer-events-auto overflow-y-auto overscroll-contain"
              : "pointer-events-none overflow-hidden"
          } rounded-[24px] border border-red-900/60 bg-[#050505]/95 shadow-[0_0_40px_rgba(220,38,38,0.08)]`}
          style={{
            transform: `rotateY(0deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-0 rounded-[24px] pointer-events-none shadow-[inset_0_0_60px_rgba(220,38,38,0.03)]" />
          {faces.front}
        </div>

        {/* Right Face - 成长档案 */}
        <div
          className={`${faceBaseClasses} ${
            activeFace === "right"
              ? "pointer-events-auto overflow-y-auto overscroll-contain"
              : "pointer-events-none overflow-hidden"
          } rounded-[24px] border border-red-900/60 bg-[#050505]/95 shadow-[0_0_40px_rgba(220,38,38,0.08)]`}
          style={{
            transform: `rotateY(90deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-0 rounded-[24px] pointer-events-none shadow-[inset_0_0_60px_rgba(220,38,38,0.03)]" />
          {faces.right}
        </div>

        {/* Back Face - 资料搜索更新 */}
        <div
          className={`${faceBaseClasses} ${
            activeFace === "back"
              ? "pointer-events-auto overflow-y-auto overscroll-contain"
              : "pointer-events-none overflow-hidden"
          } rounded-[24px] border border-red-900/60 bg-[#050505]/95 shadow-[0_0_40px_rgba(220,38,38,0.08)]`}
          style={{
            transform: `rotateY(180deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-0 rounded-[24px] pointer-events-none shadow-[inset_0_0_60px_rgba(220,38,38,0.03)]" />
          {faces.back}
        </div>

        {/* Left Face - 计划模块 */}
        <div
          className={`${faceBaseClasses} ${
            activeFace === "left"
              ? "pointer-events-auto overflow-y-auto overscroll-contain"
              : "pointer-events-none overflow-hidden"
          } rounded-[24px] border border-red-900/60 bg-[#050505]/95 shadow-[0_0_40px_rgba(220,38,38,0.08)]`}
          style={{
            transform: `rotateY(-90deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-0 rounded-[24px] pointer-events-none shadow-[inset_0_0_60px_rgba(220,38,38,0.03)]" />
          {faces.left}
        </div>

        {/* Top Face - 装饰面 */}
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] border border-red-950/80 bg-[linear-gradient(180deg,#110404_0%,#070707_100%)] shadow-[0_0_24px_rgba(220,38,38,0.05)]"
          style={{
            transform: `rotateX(90deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_55%)]" />
        </div>

        {/* Bottom Face - 装饰面 */}
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] border border-zinc-950 bg-[#030303]"
          style={{
            transform: `rotateX(-90deg) translateZ(${translateZ}px)`,
            backfaceVisibility: "hidden",
          }}
        />
      </div>
    </div>
  );
}

// 简化的立方体视图切换器组件
interface CubeViewSwitcherProps {
  activeFace: CubeFace;
  onFaceChange: (face: CubeFace) => void;
  className?: string;
}

const faceConfig: { key: CubeFace; label: string; code: string }[] = [
  { key: "front", label: "对话", code: "01" },
  { key: "right", label: "档案", code: "02" },
  { key: "back", label: "搜索", code: "03" },
  { key: "left", label: "计划", code: "04" },
];

export function CubeViewSwitcher({
  activeFace,
  onFaceChange,
  className = "",
}: CubeViewSwitcherProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-2xl border border-red-950/60 bg-[#0a0a0a]/80 backdrop-blur-sm ${className}`}
    >
      {faceConfig.map(({ key, label, code }) => (
        <button
          key={key}
          onClick={() => onFaceChange(key)}
          className={`
            relative flex items-center gap-3 rounded-[16px] border px-4 py-2.5 text-sm font-medium
            transition-all duration-300 ease-out
            ${
              activeFace === key
                ? "border-red-700/70 bg-[linear-gradient(135deg,rgba(127,29,29,0.5),rgba(10,10,10,0.95))] text-red-50 shadow-[0_0_20px_rgba(220,38,38,0.22)]"
                : "border-zinc-900 text-zinc-500 hover:border-red-950 hover:text-zinc-200 hover:bg-zinc-900/50"
            }
          `}
        >
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] tracking-[0.2em] ${
              activeFace === key
                ? "border-red-500/60 bg-red-500/10 text-red-200"
                : "border-zinc-800 bg-black/40 text-zinc-500"
            }`}
          >
            {code}
          </span>
          <span>{label}</span>
          {activeFace === key && (
            <>
              <span className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export default CubeContainer;
