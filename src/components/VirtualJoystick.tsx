import React, { useRef, useState, useEffect, useCallback } from 'react';
import { JoystickInput } from '../types';

interface DualJoystickProps {
  onLeftStickChange: (input: JoystickInput) => void;
  onRightStickChange: (input: JoystickInput) => void;
  leftValue: JoystickInput;
  rightValue: JoystickInput;
}

interface SingleStickProps {
  id: string;
  label: string;
  subLabel: string;
  upLabel: string;
  downLabel: string;
  leftLabel: string;
  rightLabel: string;
  value: JoystickInput;
  onChange: (val: JoystickInput) => void;
  colorScheme?: 'cyan' | 'amber';
}

function SingleJoystick({
  id,
  label,
  subLabel,
  upLabel,
  downLabel,
  leftLabel,
  rightLabel,
  value,
  onChange,
  colorScheme = 'cyan',
}: SingleStickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  const radius = 65; // px max travel

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const clampedDist = Math.min(dist, radius);
      const normalizedDist = clampedDist / radius;

      // Inverted Y so Up is +1 and Down is -1
      const normX = (Math.cos(angle) * normalizedDist);
      const normY = -(Math.sin(angle) * normalizedDist);

      onChange({
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
      });
    },
    [onChange, radius]
  );

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointer(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    setIsDragging(true);
    handlePointer(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && activeTouchId.current === null) {
        handlePointer(e.clientX, e.clientY);
      }
    };

    const onMouseUp = () => {
      if (isDragging && activeTouchId.current === null) {
        setIsDragging(false);
        onChange({ x: 0, y: 0 });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || activeTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          handlePointer(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging || activeTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          activeTouchId.current = null;
          setIsDragging(false);
          onChange({ x: 0, y: 0 });
          break;
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handlePointer, onChange]);

  const knobX = value.x * radius;
  const knobY = -value.y * radius; // inverted for screen coord

  const borderColor = colorScheme === 'cyan' ? 'border-cyan-500/40' : 'border-amber-500/40';
  const knobColor = colorScheme === 'cyan' ? 'bg-cyan-400 border-cyan-300 shadow-cyan-500/50' : 'bg-amber-400 border-amber-300 shadow-amber-500/50';
  const tagColor = colorScheme === 'cyan' ? 'text-cyan-400' : 'text-amber-400';

  return (
    <div id={id} className="flex flex-col items-center select-none touch-none">
      {/* Stick Header Label */}
      <div className="mb-2 text-center">
        <div className={`text-xs font-mono font-bold tracking-wider ${tagColor}`}>{label}</div>
        <div className="text-[10px] text-zinc-400 font-sans">{subLabel}</div>
      </div>

      {/* Joystick Area */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className={`relative w-36 h-36 rounded-full bg-zinc-950/70 backdrop-blur-md border-2 ${borderColor} shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing`}
      >
        {/* Crosshair guide lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-full h-[1px] bg-zinc-400" />
          <div className="h-full w-[1px] bg-zinc-400 absolute" />
          <div className="w-20 h-20 rounded-full border border-dashed border-zinc-400" />
        </div>

        {/* Directional Labels */}
        <span className="absolute top-1 text-[9px] font-mono text-zinc-400 uppercase tracking-tighter pointer-events-none">
          ▲ {upLabel}
        </span>
        <span className="absolute bottom-1 text-[9px] font-mono text-zinc-400 uppercase tracking-tighter pointer-events-none">
          ▼ {downLabel}
        </span>
        <span className="absolute left-1 text-[9px] font-mono text-zinc-400 uppercase tracking-tighter pointer-events-none">
          ◀ {leftLabel}
        </span>
        <span className="absolute right-1 text-[9px] font-mono text-zinc-400 uppercase tracking-tighter pointer-events-none">
          {rightLabel} ▶
        </span>

        {/* Movable Knob */}
        <div
          style={{
            transform: `translate3d(${knobX}px, ${knobY}px, 0)`,
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
          }}
          className={`w-14 h-14 rounded-full border-2 ${knobColor} shadow-md flex items-center justify-center pointer-events-none`}
        >
          <div className="w-4 h-4 rounded-full bg-zinc-950/60" />
        </div>
      </div>
    </div>
  );
}

export function DualJoystick({
  onLeftStickChange,
  onRightStickChange,
  leftValue,
  rightValue,
}: DualJoystickProps) {
  return (
    <div
      id="dual-joystick-controller"
      className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-8 flex items-end justify-between pointer-events-none select-none"
    >
      {/* Left Stick: Throttle (Alt) & Yaw */}
      <div className="pointer-events-auto filter drop-shadow-2xl">
        <SingleJoystick
          id="joystick-left"
          label="عصا الارتفاع والدوران"
          subLabel="Left Stick (ALT / YAW)"
          upLabel="صعود"
          downLabel="هبوط"
          leftLabel="دوران ◀"
          rightLabel="▶ دوران"
          value={leftValue}
          onChange={onLeftStickChange}
          colorScheme="cyan"
        />
      </div>

      {/* Right Stick: Pitch (Forward/Back) & Roll (Strafe) */}
      <div className="pointer-events-auto filter drop-shadow-2xl">
        <SingleJoystick
          id="joystick-right"
          label="عصا الحركة والتوجيه"
          subLabel="Right Stick (PITCH / ROLL)"
          upLabel="للأمام"
          downLabel="للخلف"
          leftLabel="يسار ◀"
          rightLabel="▶ يمين"
          value={rightValue}
          onChange={onRightStickChange}
          colorScheme="amber"
        />
      </div>
    </div>
  );
}
