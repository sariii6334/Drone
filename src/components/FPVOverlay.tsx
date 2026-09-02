import React from 'react';
import { TargetVehicle, MissionResult, StrikeStats } from '../types';
import { Crosshair, RotateCcw, CheckCircle2, XCircle, Target, Navigation, HelpCircle, Bomb, Zap, Video, Flame } from 'lucide-react';

export interface TargetIndicatorInfo {
  screenX: number;
  screenY: number;
  angle: number;
  distance: number;
  isVisible: boolean;
  isInFront: boolean;
  targetName: string;
}

interface FPVOverlayProps {
  altitude: number;
  speed: number;
  distance: number;
  lockedVehicle: TargetVehicle | null;
  targetIndicator?: TargetIndicatorInfo | null;
  missionResult: MissionResult;
  strikeStats: StrikeStats | null;
  isDiving: boolean;
  cinematicMode?: 'idle' | 'kamikaze' | 'missile' | 'impact_replay';
  cinematicElapsed?: number;
  countdownValue?: number | null;
  activeMissilesCount?: number;
  destroyedCount?: number;
  totalTargets?: number;
  onFireMissile: () => void;
  onRestart: () => void;
  onOpenBriefing?: () => void;
  onSkipCinematic?: () => void;
}

export const FPVOverlay: React.FC<FPVOverlayProps> = ({
  altitude,
  speed,
  distance,
  lockedVehicle,
  targetIndicator,
  missionResult,
  strikeStats,
  isDiving,
  cinematicMode = 'idle',
  countdownValue = null,
  activeMissilesCount = 0,
  destroyedCount = 0,
  totalTargets = 3,
  onFireMissile,
  onRestart,
  onOpenBriefing,
}) => {
  const isCinematic = cinematicMode !== 'idle' || isDiving;
  const isCountingDown = countdownValue !== null && countdownValue > 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between text-white font-mono overflow-hidden">
      {/* ========================================================================= */}
      {/* ⏳ 3-SECOND COUNTDOWN OVERLAY (عد تنازلي قبل بدء المشهد السينمائي)         */}
      {/* ========================================================================= */}
      {isCountingDown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="relative flex flex-col items-center justify-center">
            {/* Glowing shockwave ring */}
            <div className="absolute w-40 h-40 sm:w-56 sm:h-56 rounded-full border-4 border-amber-400/60 animate-ping" />
            <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-300 to-red-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.9)] animate-in zoom-in-75 duration-200">
              {countdownValue}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎬 CINEMATIC SCENE: 100% CLEAN - NO TEXT ON SCREEN (تظهر فقط الكاميرا ثلاثية الأبعاد) */}
      {/* ========================================================================= */}
      {/* When isCinematic is active, NO text, HUD, or writing is rendered to ensure clear unobstructed view */}

      {/* ========================================================================= */}
      {/* 🎮 STANDARD FLIGHT HUD (Visible ONLY during normal flight)                 */}
      {/* ========================================================================= */}
      {!isCinematic && !isCountingDown && missionResult === 'idle' && (
        <div className="p-2.5 sm:p-4 flex flex-col justify-between h-full">
          {/* Tactical Framing Brackets in 4 Corners */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-white/60" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-white/60" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-white/60" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-white/60" />

          {/* TOP HEADER BAR - DUAL FIRE BUTTONS (انقضاض & إطلاق صاروخ) */}
          <div className="flex flex-wrap items-center justify-between gap-2 z-40 w-full">
            {/* Left: OSD Mode Tag + Briefing Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-white/20 text-xs sm:text-sm shadow-xl">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-black tracking-wider text-red-400">FPV-01</span>
                <span className="text-white/30">|</span>
                <span className="text-amber-300 font-bold hidden sm:inline">STRIKE-RECON</span>
              </div>

              {onOpenBriefing && (
                <button
                  id="btn-open-briefing"
                  onClick={onOpenBriefing}
                  className="pointer-events-auto bg-black/75 hover:bg-neutral-800 text-amber-300 px-2.5 py-1.5 sm:py-2 rounded-xl border border-white/20 flex items-center gap-1 text-xs transition-all shadow-xl backdrop-blur-md active:scale-95"
                  title="عرض التعليمات والخطاب الترحيبي"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">الخطاب</span>
                </button>
              )}

              {/* Destroyed Targets Counter */}
              <div className="hidden sm:flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300 backdrop-blur-md">
                <span>الأهداف: {destroyedCount}/{totalTargets}</span>
              </div>
            </div>

            {/* Center: THE ACTION BUTTON (إطلاق صاروخ) & Manual Strike Guidance */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* BUTTON: إطلاق صاروخ (MISSILE LAUNCH) */}
              <button
                id="btn-fire-missile"
                onClick={onFireMissile}
                className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl font-black text-xs sm:text-base shadow-xl transition-all border border-cyan-300 bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-700 hover:from-cyan-500 hover:to-teal-400 text-white shadow-cyan-950/80 transform active:scale-95"
                title="تطلق المسيرة صاروخاً نفاثاً وتتحول الكاميرا لمنظور علوي سينمائي"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
                <div className="text-right">
                  <span className="block font-black leading-tight">إطلاق صاروخ 🚀</span>
                </div>
              </button>

              <div className="hidden md:flex items-center gap-1.5 bg-black/60 border border-amber-500/50 px-3 py-1.5 rounded-xl text-amber-300 text-xs font-bold backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>انقضاض يدوي: قد المسيرة واصطدم بالهدف! 💥</span>
              </div>
            </div>

            {/* Right: Quick Restart Button */}
            <button
              id="btn-restart-top"
              onClick={onRestart}
              className="pointer-events-auto bg-black/75 hover:bg-neutral-800 active:scale-95 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-white/25 flex items-center gap-1.5 text-xs sm:text-sm transition-all shadow-xl backdrop-blur-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة الإقلاع</span>
              <span className="sm:hidden">إعادة</span>
            </button>
          </div>

          {/* DYNAMIC TARGET DIRECTION INDICATOR (Visual Arrow & Distance Badge) */}
          {targetIndicator && (
            <div
              style={{
                left: `${targetIndicator.screenX}px`,
                top: `${targetIndicator.screenY}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-none z-20 transition-transform duration-75 flex flex-col items-center"
            >
              {/* Rotating Directional Arrow Vector */}
              <div
                style={{
                  transform: `rotate(${targetIndicator.angle + 90}deg)`,
                }}
                className="w-10 h-10 flex items-center justify-center filter drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]"
              >
                <Navigation className={`w-9 h-9 ${lockedVehicle ? 'text-emerald-400 fill-emerald-400' : 'text-amber-400 fill-amber-400'} animate-pulse`} />
              </div>

              {/* Target Distance Badge */}
              <div className="mt-1 bg-black/85 border border-emerald-400/80 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold text-emerald-300 shadow-lg tracking-wider whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🎯 الهدف: {targetIndicator.targetName} ({targetIndicator.distance}m)</span>
              </div>
            </div>
          )}

          {/* Center Crosshair Aiming Reticle with Target Lock Bracket */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              {/* Main Reticle */}
              <div className="w-14 h-0.5 bg-white/60" />
              <div className="h-14 w-0.5 bg-white/60 absolute" />
              <div className={`w-8 h-8 border rounded-full absolute transition-all ${lockedVehicle ? 'border-emerald-400 scale-125' : 'border-white/40'}`} />
              <div className={`w-2 h-2 rounded-full absolute ${lockedVehicle ? 'bg-emerald-400' : 'bg-red-500/80'}`} />

              {/* Active Target Box around Crosshair */}
              {lockedVehicle && (
                <div className="absolute -inset-12 border-2 border-dashed border-emerald-400/90 rounded-2xl pointer-events-none animate-pulse flex flex-col justify-between p-1.5 bg-emerald-950/20">
                  <span className="text-[10px] text-emerald-400 font-black tracking-widest self-start bg-black/80 px-1.5 py-0.5 rounded">
                    🔒 LOCKED {Math.round(distance)}M
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold self-end bg-black/80 px-1.5 py-0.5 rounded">
                    جاهز للإطلاق/الانقضاض 🎯
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center OSD Telemetry Box (Centered perfectly between Left & Right Joysticks) */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-white/30 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm tracking-wide text-white/90 shadow-2xl flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-[10px]">ALT</span>
                <span className="font-bold text-amber-400">{Math.round(altitude)}m</span>
              </div>
              <div className="w-px h-3.5 bg-white/20" />
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-[10px]">SPD</span>
                <span className="font-bold text-cyan-400">{Math.round(speed)}m/s</span>
              </div>
              <div className="w-px h-3.5 bg-white/20" />
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-[10px]">DIST</span>
                <span className="font-bold text-emerald-400">{Math.round(distance)}m</span>
              </div>
            </div>

            {/* Active Missile Status or Guidance Tip */}
            {activeMissilesCount > 0 ? (
              <div className="flex items-center gap-1.5 bg-cyan-950/85 border border-cyan-400/80 text-cyan-300 px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-lg animate-pulse backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 text-cyan-300" />
                <span>صاروخ نفاث في الجو ({activeMissilesCount}) 🚀</span>
              </div>
            ) : lockedVehicle ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/85 border border-emerald-500/80 text-emerald-400 px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-lg">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>[قفل الهدف: {lockedVehicle.name}]</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏆 MISSION SUCCESS MODAL                                                  */}
      {/* ========================================================================= */}
      {missionResult === 'success' && (
        <div
          id="modal-mission-completed"
          className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto"
        >
          <div className="bg-neutral-900/95 border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-950/80 transform animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-wider mb-2">
              MISSION COMPLETED ✔
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 mb-5">
              تم إصابة وتدمير شاحنة الأمن بنجاح تام!
            </p>

            {/* Detailed Strike Telemetry Breakdown */}
            <div className="bg-black/60 rounded-2xl p-4 border border-emerald-500/30 text-xs sm:text-sm text-left space-y-2 mb-6 font-mono">
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Target Hit:</span>
                <span className="font-bold text-emerald-400">{strikeStats?.targetName || 'شاحنة أمن تكتيكية'}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Impact Speed:</span>
                <span className="font-bold text-cyan-400">{strikeStats?.strikeSpeed || 150} m/s</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Launch Distance:</span>
                <span className="font-bold text-amber-400">{strikeStats?.distance || Math.round(distance)} m</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Accuracy:</span>
                <span className="font-bold text-emerald-400">100% (Direct Hit)</span>
              </div>
            </div>

            <button
              id="btn-play-again-success"
              onClick={onRestart}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>إعادة المحاولة (PLAY AGAIN)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ❌ MISSION FAILED MODAL                                                   */}
      {/* ========================================================================= */}
      {missionResult === 'failed' && (
        <div
          id="modal-mission-failed"
          className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto"
        >
          <div className="bg-neutral-900/95 border-2 border-red-500/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-red-950/80 transform animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-red-500 tracking-wider mb-2">
              MISSION FAILED ✖
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 mb-4">
              أخطأت الضربة الهدف واصطدمت بجانب السيارة!
            </p>

            {/* Detailed Miss Feedback */}
            <div className="bg-black/60 rounded-2xl p-4 border border-red-500/30 text-xs sm:text-sm text-left space-y-2 mb-6 font-mono">
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Miss Distance:</span>
                <span className="font-bold text-red-400">{strikeStats?.missDistance || 8.5} m away</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Closest Vehicle:</span>
                <span className="font-bold text-amber-400">{strikeStats?.targetName || 'شاحنة أمن'}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Impact Speed:</span>
                <span className="font-bold text-cyan-400">{strikeStats?.strikeSpeed || 120} m/s</span>
              </div>
              <p className="text-xs text-amber-300/90 pt-1 border-t border-white/10 text-right">
                💡 نصيحة: وجه المسيرة مباشرة نحو الشاحنة قبل الضغط على زر الانقضاض أو إطلاق الصاروخ!
              </p>
            </div>

            <button
              id="btn-play-again-failed"
              onClick={onRestart}
              className="w-full bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>إعادة المحاولة والإقلاع</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
