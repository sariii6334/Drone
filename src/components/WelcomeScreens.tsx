import React, { useState, useEffect } from 'react';
import { Rocket, ShieldAlert, Sparkles, Navigation, Gamepad2, Crosshair, Zap, Bomb, Flame } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface WelcomeScreensProps {
  onStartGame?: () => void;
  onComplete?: () => void;
}

export const WelcomeScreens: React.FC<WelcomeScreensProps> = ({ onStartGame, onComplete }) => {
  const [countdown, setCountdown] = useState<number>(4);
  const [progress, setProgress] = useState<number>(0);

  const triggerStart = () => {
    if (typeof onStartGame === 'function') {
      onStartGame();
    } else if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  useEffect(() => {
    soundManager.init();
    soundManager.resume();

    // Smooth progress fill over 4 seconds
    const intervalMs = 50;
    const totalDurationMs = 4000;
    const step = (intervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const autoStartTimer = setTimeout(() => {
      soundManager.playNewDroneDeployChime();
      triggerStart();
    }, totalDurationMs);

    return () => {
      clearInterval(timer);
      clearInterval(countdownTimer);
      clearTimeout(autoStartTimer);
    };
  }, [onStartGame, onComplete]);

  const handleInstantStart = () => {
    soundManager.init();
    soundManager.resume();
    soundManager.playNewDroneDeployChime();
    triggerStart();
  };

  return (
    <div
      onClick={handleInstantStart}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-slate-900 to-black select-none cursor-pointer overflow-y-auto"
    >
      {/* Dynamic Background Atmosphere */}
      <div className="absolute w-[32rem] h-[32rem] bg-amber-500/15 rounded-full blur-3xl pointer-events-none -top-10 -left-10 animate-pulse" />
      <div className="absolute w-[32rem] h-[32rem] bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10 animate-pulse" />

      {/* SINGLE ENTERTAINING WELCOME SPEECH CARD */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full bg-neutral-900/95 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-amber-950/80 backdrop-blur-xl text-center transform animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>🎉 WELLCOME خطاب رسمي وممتع!</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-xs font-black">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>⚡ نموذج أولي بسيط ⚡</span>
          </div>
        </div>

        {/* Hero Icon */}
        <div className="relative w-16 h-16 mx-auto mb-3">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl blur opacity-75 animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 rounded-2xl flex items-center justify-center text-black shadow-xl">
            <Rocket className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 mb-1">
          أهلاً بك يا بطل في صقر الصحراء FPV! 🎮🦅
        </h1>
        <p className="text-neutral-400 text-xs font-mono uppercase tracking-wider mb-4">
          DESERT FALCON: RECON & STRIKE OPERATION
        </p>

        {/* Entertaining Speech Card (خطاب ترحيبي ممتع ومسلٍّ) */}
        <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-right space-y-2.5 mb-5 text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans shadow-inner">
          <p className="flex items-start gap-2">
            <span className="text-base">📢</span>
            <span>
              <strong className="text-amber-300">خطاب القيادة العامة:</strong> مرحباً بك يا كابتن! مسيرتك جاهزة على قمة أعلى برج مراقبة بالصحراء لرصد رتل الشاحنات على الطريق السريع.
            </span>
          </p>

          <div className="border-t border-white/10 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-neutral-800/80 border border-amber-500/30 p-2 rounded-xl flex items-start gap-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block font-bold">1️⃣ مسيرة حساسة وانقضاض يدوي:</strong>
                <span className="text-neutral-300">تحكم بالمسيرة واصطدم بالشاحنات المتحركة أو أي مكان لبدء المشهد السينمائي فوراً!</span>
              </div>
            </div>

            <div className="bg-neutral-800/80 border border-cyan-500/30 p-2 rounded-xl flex items-start gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-cyan-300 block font-bold">2️⃣ إطلاق صواريخ نفاثة:</strong>
                <span className="text-neutral-300">أطلق الصاروخ نحو الشاحنات المتحركة مع مشهد سينمائي علوي مدته 7 ثوانٍ!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automatic Progress & Countdown Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1.5 px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              جاري الانتقال لساحة العمليات تلقائياً...
            </span>
            <span className="text-white bg-amber-600/40 px-2 py-0.5 rounded-md border border-amber-500/30">
              {countdown > 0 ? `${countdown} ثوانٍ` : 'انطلاق!'}
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-white/15">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Direct Instant Action Button */}
        <button
          id="btn-instant-start-game"
          onClick={handleInstantStart}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-sm sm:text-base py-3 px-4 rounded-xl shadow-lg shadow-amber-950/80 flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <Rocket className="w-5 h-5" />
          <span>🚀 ابدأ فوراً دون انتظار (انقر هنا أو في أي مكان)</span>
        </button>
      </div>
    </div>
  );
};
