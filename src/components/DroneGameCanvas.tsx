import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { JoystickInput, DroneControls, TargetVehicle, MissionResult, StrikeStats } from '../types';
import { DronePhysics } from '../3d/DronePhysics';
import { createDroneModel, DroneObject } from '../3d/DroneModel';
import { buildEnvironment, EnvironmentData } from '../3d/Environment';
import { ConvoyManager } from '../3d/ConvoyManager';
import { ExplosionSystem } from '../3d/ExplosionSystem';
import { WeaponSystem } from '../3d/WeaponSystem';
import { soundManager } from '../audio/SoundManager';
import { DualJoystick } from './VirtualJoystick';
import { FPVOverlay } from './FPVOverlay';
import { WelcomeScreens } from './WelcomeScreens';

export function DroneGameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Welcome Screen state
  const [showWelcomeScreens, setShowWelcomeScreens] = useState<boolean>(true);

  // Joysticks input state
  const [leftStick, setLeftStick] = useState<JoystickInput>({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState<JoystickInput>({ x: 0, y: 0 });
  const leftStickRef = useRef<JoystickInput>({ x: 0, y: 0 });
  const rightStickRef = useRef<JoystickInput>({ x: 0, y: 0 });

  // Game / Strike States
  const [missionResult, setMissionResult] = useState<MissionResult>('idle');
  const missionResultRef = useRef<MissionResult>('idle');
  missionResultRef.current = missionResult;

  const [isDiving, setIsDiving] = useState<boolean>(false);
  const isDivingRef = useRef<boolean>(false);
  isDivingRef.current = isDiving;

  // Cinematic Air-Strike Camera Mode ('idle' | 'kamikaze' | 'missile' | 'impact_replay')
  const [cinematicMode, setCinematicMode] = useState<'idle' | 'kamikaze' | 'missile' | 'impact_replay'>('idle');
  const cinematicModeRef = useRef<'idle' | 'kamikaze' | 'missile' | 'impact_replay'>('idle');
  cinematicModeRef.current = cinematicMode;

  const [cinematicElapsed, setCinematicElapsed] = useState<number>(0);
  const cinematicStartTimeRef = useRef<number>(0);
  const impactPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // 3-Second Countdown before Cinematic Scene starts
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeMissilesCount, setActiveMissilesCount] = useState<number>(0);
  const [destroyedCount, setDestroyedCount] = useState<number>(0);
  const [strikeStats, setStrikeStats] = useState<StrikeStats | null>(null);
  const [lockedVehicle, setLockedVehicle] = useState<TargetVehicle | null>(null);
  const [hudTelemetry, setHudTelemetry] = useState({ altitude: 11, speed: 0, distance: 40 });
  const [targetIndicator, setTargetIndicator] = useState<{
    screenX: number;
    screenY: number;
    angle: number;
    distance: number;
    isVisible: boolean;
    isInFront: boolean;
    targetName: string;
  } | null>(null);

  // 360° Free-Look Touch Swipe / Mouse Drag
  const orbitYawRef = useRef<number>(0);
  const orbitPitchRef = useRef<number>(0.2);
  const orbitDistRef = useRef<number>(4.8);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDraggingLookRef = useRef<boolean>(false);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // 3D references
  const physicsRef = useRef<DronePhysics>(new DronePhysics());
  const droneModelRef = useRef<DroneObject | null>(null);
  const convoyRef = useRef<ConvoyManager | null>(null);
  const explosionRef = useRef<ExplosionSystem | null>(null);
  const weaponRef = useRef<WeaponSystem | null>(null);
  const envRef = useRef<EnvironmentData | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spawnDronePos = new THREE.Vector3(18.0, 27.5, 23.5);
  const spawnDroneYaw = 0.45;
  const launchCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(18.0, 48.0, 42.0));
  const cinematicLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const previousDronePosRef = useRef<THREE.Vector3>(new THREE.Vector3(18.0, 27.5, 23.5));
  const flightStartTimeRef = useRef<number>(performance.now());
  const cinematicOrbitAngleRef = useRef<number>(Math.random() * Math.PI * 2);
  const modalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalResultRef = useRef<'success' | 'failed' | null>(null);

  // Clear pending cinematic timers and countdowns
  const clearCinematicTimer = useCallback(() => {
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      modalTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownValue(null);
  }, []);

  // Skip cinematic replay immediately
  const handleSkipCinematic = useCallback(() => {
    clearCinematicTimer();
    if (pendingFinalResultRef.current) {
      const res = pendingFinalResultRef.current;
      setMissionResult(res);
      missionResultRef.current = res;
      if (res === 'success') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#38bdf8', '#fbbf24'],
        });
      }
    }
  }, [clearCinematicTimer]);

  // Reset Drone & Target for new attempt
  const handleRestart = useCallback(() => {
    clearCinematicTimer();
    if (!physicsRef.current) return;

    // Reset physics to spawn position overlooking highway convoy from building roof
    physicsRef.current.reset(spawnDronePos.clone(), spawnDroneYaw);
    previousDronePosRef.current.copy(spawnDronePos);
    flightStartTimeRef.current = performance.now();
    orbitYawRef.current = 0;
    orbitPitchRef.current = 0.2;
    pendingFinalResultRef.current = null;

    // Respawn tactical convoy in fresh state
    if (convoyRef.current) {
      convoyRef.current.spawnConvoy();
    }

    // Reset weapon system
    if (weaponRef.current) {
      weaponRef.current.reset();
    }

    // Reset drone model position
    if (droneModelRef.current) {
      droneModelRef.current.group.position.copy(spawnDronePos);
      droneModelRef.current.group.visible = true;
    }

    setIsDiving(false);
    isDivingRef.current = false;
    setCinematicMode('idle');
    cinematicModeRef.current = 'idle';
    setCinematicElapsed(0);
    cinematicStartTimeRef.current = 0;
    setMissionResult('idle');
    missionResultRef.current = 'idle';
    setStrikeStats(null);
    setLockedVehicle(null);
    setActiveMissilesCount(0);
    setDestroyedCount(0);
    setCountdownValue(null);

    soundManager.playNewDroneDeployChime();
  }, [clearCinematicTimer]);

  // Trigger 3-second countdown followed by 14-second pure cinematic scene
  const startCountdownAndCinematic = useCallback((
    impactPos: THREE.Vector3,
    isHit: boolean,
    hitVehicle: TargetVehicle | null,
    impactSpeed: number,
    startPos: THREE.Vector3
  ) => {
    if (missionResultRef.current !== 'idle' || cinematicModeRef.current !== 'idle') return;

    clearCinematicTimer();

    // 1. Instantly hide physical drone model on collision
    if (droneModelRef.current) {
      droneModelRef.current.group.visible = false;
      droneModelRef.current.group.position.set(0, -999, 0);
    }

    impactPosRef.current.copy(impactPos);
    cinematicLookAtRef.current.copy(impactPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
    cinematicOrbitAngleRef.current = Math.random() * Math.PI * 2;

    const totalDist = Math.round(startPos.distanceTo(impactPos));

    if (isHit && hitVehicle) {
      pendingFinalResultRef.current = 'success';
      const stats: StrikeStats = {
        targetName: hitVehicle.name,
        distance: totalDist,
        strikeSpeed: Math.round(impactSpeed),
        hitAccuracy: 100,
      };
      setStrikeStats(stats);
    } else {
      pendingFinalResultRef.current = 'failed';
      const activeVehs = convoyRef.current?.convoyVehicles.filter((v) => !v.isDestroyed) || [];
      let closestDist = 999;
      let closestName = '';
      activeVehs.forEach((v) => {
        const d = impactPos.distanceTo(v.position);
        if (d < closestDist) {
          closestDist = d;
          closestName = v.name;
        }
      });

      const stats: StrikeStats = {
        targetName: closestName || 'شاحنة أمن تكتيكية',
        distance: totalDist,
        missDistance: Math.round(closestDist * 10) / 10,
        strikeSpeed: Math.round(impactSpeed),
        hitAccuracy: Math.max(0, Math.round((1 - Math.min(1, closestDist / 30)) * 80)),
      };
      setStrikeStats(stats);
    }

    // Set countdown to 3
    setCountdownValue(3);
    soundManager.playCountdownBeep(3);

    // Countdown step 2
    countdownTimerRef.current = setTimeout(() => {
      setCountdownValue(2);
      soundManager.playCountdownBeep(2);

      // Countdown step 1
      countdownTimerRef.current = setTimeout(() => {
        setCountdownValue(1);
        soundManager.playCountdownBeep(1);

        // Countdown ends -> Start 14-second pure cinematic scene
        countdownTimerRef.current = setTimeout(() => {
          setCountdownValue(null);
          soundManager.playCinematicWhoosh();

          setCinematicElapsed(0);
          cinematicStartTimeRef.current = performance.now();
          setCinematicMode('impact_replay');
          cinematicModeRef.current = 'impact_replay';

          // Trigger explosion & sound effects
          if (isHit && hitVehicle) {
            if (explosionRef.current) {
              explosionRef.current.triggerExplosion(impactPos, 1.5, true);
            }
            if (convoyRef.current) {
              convoyRef.current.damageVehicle(hitVehicle.id, 100);
            }
            soundManager.playTargetDestroyedAlert();
            setDestroyedCount((prev) => prev + 1);
          } else {
            if (explosionRef.current) {
              explosionRef.current.triggerExplosion(impactPos, 1.15, false);
            }
            soundManager.playMissionFailedBuzzer();
          }

          // 14-second long, professional multi-phase cinematic replay before modal
          modalTimeoutRef.current = setTimeout(() => {
            const finalRes = pendingFinalResultRef.current || 'failed';
            setMissionResult(finalRes);
            missionResultRef.current = finalRes;

            if (finalRes === 'success') {
              confetti({
                particleCount: 90,
                spread: 75,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#38bdf8', '#fbbf24'],
              });
            }
          }, 14000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, [clearCinematicTimer]);

  // Trigger professional impact cinematic sequence on drone collision
  const triggerImpactCinematic = useCallback((
    impactPos: THREE.Vector3,
    hitVehicle: TargetVehicle | null,
    impactSpeed: number,
    startPos: THREE.Vector3
  ) => {
    startCountdownAndCinematic(impactPos, !!hitVehicle, hitVehicle, impactSpeed, startPos);
  }, [startCountdownAndCinematic]);

  // Launch Missile Projectile ("إطلاق صاروخ" - Fires rocket with immediate cinematic overhead camera)
  const handleFireMissile = useCallback(() => {
    if (cinematicModeRef.current !== 'idle' || missionResultRef.current !== 'idle' || !weaponRef.current || !physicsRef.current) return;

    soundManager.init();
    soundManager.resume();

    const dronePos = physicsRef.current.position;
    const forward = physicsRef.current.getForwardVector();
    const velocity = physicsRef.current.velocity;
    const targetVehicle = lockedVehicle || null;

    const { missile, highCamPos } = weaponRef.current.launchMissile(dronePos, forward, velocity, targetVehicle);
    launchCamPosRef.current.copy(highCamPos);
    cinematicLookAtRef.current.copy(missile.position);

    cinematicStartTimeRef.current = performance.now();
    setCinematicElapsed(0);
    setCinematicMode('missile');
    cinematicModeRef.current = 'missile';
    setActiveMissilesCount(weaponRef.current.activeMissiles.length);
  }, [lockedVehicle]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      soundManager.init();
      soundManager.resume();
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.code] = true;

      // Spacebar / Enter / R -> Restart if ended or Quick Restart
      if (e.code === 'KeyR' || ((e.code === 'Space' || e.key === 'Enter') && missionResultRef.current !== 'idle')) {
        e.preventDefault();
        handleRestart();
      }

      // 'Space' / 'F' or 'E' key -> Launch Missile during active flight
      if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyE') {
        e.preventDefault();
        if (missionResultRef.current === 'idle' && cinematicModeRef.current === 'idle') {
          handleFireMissile();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleFireMissile, handleRestart]);

  // Main 3D Scene Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(
      70,
      width / height,
      0.1,
      1600
    );
    cameraRef.current = camera;

    // Initial camera pose behind drone on building roof
    const totalYaw = spawnDroneYaw;
    const dist = 4.8;
    const pitchAngle = 0.2;
    const horizontalDist = dist * Math.cos(pitchAngle);
    const verticalDist = dist * Math.sin(pitchAngle);
    const initialChaseOffset = new THREE.Vector3(
      Math.sin(totalYaw) * horizontalDist,
      Math.max(0.8, 1.8 + verticalDist),
      Math.cos(totalYaw) * horizontalDist
    );
    const initialCamPos = spawnDronePos.clone().add(initialChaseOffset);
    camera.position.copy(initialCamPos);
    launchCamPosRef.current.copy(initialCamPos);

    const droneCenter = spawnDronePos.clone().add(new THREE.Vector3(0, 0.4, 0));
    const viewDir = droneCenter.clone().sub(initialCamPos).normalize();
    const lookTarget = droneCenter.clone().add(viewDir.multiplyScalar(30));
    camera.lookAt(lookTarget);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Build Colorful Arena Environment
    const env = buildEnvironment(scene);
    envRef.current = env;

    // 4. Create Tactical Drone Model
    const droneModel = createDroneModel();
    droneModel.setColorScheme(0x00d4ff, 0xffd000);
    scene.add(droneModel.group);
    droneModelRef.current = droneModel;

    // 5. Particle Explosion System
    const explosionSystem = new ExplosionSystem(scene);
    explosionRef.current = explosionSystem;

    // 6. Stationary Arena Target Vehicle Manager
    const convoy = new ConvoyManager(scene, env.roadCurve, explosionSystem);
    convoyRef.current = convoy;

    // 7. Kamikaze Weapon & Missile System
    const weaponSystem = new WeaponSystem(scene, convoy, explosionSystem);
    weaponRef.current = weaponSystem;

    // Initial positioning
    physicsRef.current.reset(spawnDronePos.clone(), spawnDroneYaw);

    // Touch & Mouse Drag to Orbit / Look Around
    const handleTouchStart = (e: TouchEvent) => {
      if (lookTouchIdRef.current !== null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;

        if (
          el &&
          (el.closest('button') ||
            el.closest('#joystick-left') ||
            el.closest('#joystick-right') ||
            el.closest('#modal-mission-completed') ||
            el.closest('#modal-mission-failed') ||
            el.closest('[data-interactive="true"]'))
        ) {
          continue;
        }

        lookTouchIdRef.current = touch.identifier;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lookTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          const dx = touch.clientX - lastLookPosRef.current.x;
          const dy = touch.clientY - lastLookPosRef.current.y;
          lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

          orbitYawRef.current -= dx * 0.007;
          orbitPitchRef.current = Math.max(-0.45, Math.min(0.75, orbitPitchRef.current + dy * 0.006));
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          break;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (
        el &&
        (el.closest('button') ||
          el.closest('#joystick-left') ||
          el.closest('#joystick-right') ||
          el.closest('#modal-mission-completed') ||
          el.closest('#modal-mission-failed') ||
          el.closest('[data-interactive="true"]'))
      ) {
        return;
      }
      isMouseDraggingLookRef.current = true;
      lastLookPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDraggingLookRef.current) return;
      const dx = e.clientX - lastLookPosRef.current.x;
      const dy = e.clientY - lastLookPosRef.current.y;
      lastLookPosRef.current = { x: e.clientX, y: e.clientY };

      orbitYawRef.current -= dx * 0.007;
      orbitPitchRef.current = Math.max(-0.45, Math.min(0.75, orbitPitchRef.current + dy * 0.006));
    };

    const handleMouseUp = () => {
      isMouseDraggingLookRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Responsive Canvas Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Strike Event Callbacks
    const onDirectHit = (target: TargetVehicle, stats: StrikeStats) => {
      startCountdownAndCinematic(
        target.position.clone(),
        true,
        target,
        stats.strikeSpeed || 140,
        spawnDronePos
      );
    };

    const onMiss = (stats: StrikeStats) => {
      startCountdownAndCinematic(
        impactPosRef.current.clone(),
        false,
        null,
        stats.strikeSpeed || 120,
        spawnDronePos
      );
    };

    // Animation Loop
    let lastTime = performance.now();
    let animationFrameId: number;
    let frameCount = 0;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      frameCount++;

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Update Cinematic Replay Timer (0s to 14.0s)
      if (cinematicModeRef.current !== 'idle' && cinematicStartTimeRef.current > 0) {
        const sec = Math.min(14.0, (currentTime - cinematicStartTimeRef.current) / 1000);
        if (frameCount % 2 === 0) {
          setCinematicElapsed(sec);
        }
      }

      // 1. Process Controls
      const curLeftStick = leftStickRef.current;
      const curRightStick = rightStickRef.current;
      const keys = keysPressed.current;

      let throttle = curLeftStick.y;
      let yaw = curLeftStick.x;

      if (keys['w'] || keys['keyw']) throttle = 1.0;
      if (keys['s'] || keys['keys']) throttle = -1.0;
      if (keys['a'] || keys['keya']) yaw = -1.0;
      if (keys['d'] || keys['keyd']) yaw = 1.0;

      let pitch = curRightStick.y;
      let roll = curRightStick.x;

      if (keys['arrowup'] || keys['i'] || keys['keyi']) pitch = 1.0;
      if (keys['arrowdown'] || keys['k'] || keys['keyk']) pitch = -1.0;
      if (keys['arrowleft'] || keys['j'] || keys['keyj']) roll = -1.0;
      if (keys['arrowright'] || keys['l'] || keys['keyl']) roll = 1.0;

      const controls: DroneControls = { throttle, yaw, pitch, roll };

      // 2. Physics / Drone Flight Simulation & Instantaneous Collision Check
      let dronePos = physicsRef.current.position;
      let droneRot = new THREE.Euler(0, physicsRef.current.yaw, 0);
      let droneSpeed = 0;

      if (missionResultRef.current === 'idle' && cinematicModeRef.current === 'idle') {
        const prevPos = dronePos.clone();
        const physicsState = physicsRef.current.update(controls, deltaTime);
        dronePos = physicsState.position;
        droneRot = physicsState.rotation;
        droneSpeed = physicsState.speed;

        const timeSinceFlightStart = (currentTime - flightStartTimeRef.current) / 1000;
        const activeVehicles = convoyRef.current?.convoyVehicles.filter((v) => !v.isDestroyed) || [];

        // Check 1: Continuous Raycast Collision with Moving Trucks
        let hitVehicle: TargetVehicle | null = null;
        const impactPoint = dronePos.clone();

        for (const veh of activeVehicles) {
          const vehCenter = veh.position.clone().add(new THREE.Vector3(0, 1.1, 0));

          // Closest point on movement segment [prevPos -> dronePos] to truck center
          const seg = dronePos.clone().sub(prevPos);
          const segLenSq = seg.lengthSq();
          let t = 0;
          if (segLenSq > 0.0001) {
            t = Math.max(0, Math.min(1, vehCenter.clone().sub(prevPos).dot(seg) / segLenSq));
          }
          const closestOnSeg = prevPos.clone().addScaledVector(seg, t);
          const distToVeh = closestOnSeg.distanceTo(vehCenter);

          if (distToVeh < 3.4 || dronePos.distanceTo(vehCenter) < 3.4) {
            hitVehicle = veh;
            impactPoint.copy(closestOnSeg);
            break;
          }
        }

        if (hitVehicle) {
          triggerImpactCinematic(impactPoint, hitVehicle, Math.max(droneSpeed, 24), spawnDronePos);
        } else if (timeSinceFlightStart > 0.15) {
          // Check 2: Instant Ground Collision
          const isGroundHit = dronePos.y <= 0.45 || (prevPos.y > 0.45 && dronePos.y <= 0.45);

          // Check 3: Launch Building Walls & Obstacles
          const buildingCenter = new THREE.Vector3(18, 12, 24);
          const isInsideBuildingHoriz = Math.abs(dronePos.x - buildingCenter.x) < 5.8 && Math.abs(dronePos.z - buildingCenter.z) < 5.8;
          const isBuildingHit = isInsideBuildingHoriz && (dronePos.y < 24.2 || (timeSinceFlightStart > 1.2 && dronePos.y <= 24.5));

          // Check 4: Radar Station at (-45, -35)
          const radarDist = Math.hypot(dronePos.x - (-45), dronePos.z - (-35));
          const isRadarHit = radarDist < 6.8 && dronePos.y < 12.0;

          // Check 5: Arena Boundaries
          const isOutOfBounds = Math.abs(dronePos.x) > 320 || Math.abs(dronePos.z) > 320;

          if (isGroundHit || isBuildingHit || isRadarHit || isOutOfBounds) {
            const groundPoint = dronePos.clone();
            if (groundPoint.y < 0.25) groundPoint.y = 0.25;
            triggerImpactCinematic(groundPoint, null, Math.max(droneSpeed, 18), spawnDronePos);
          }
        }
      }

      // Update Missiles
      if (weaponRef.current) {
        weaponRef.current.updateMissiles(
          deltaTime,
          onDirectHit,
          onMiss
        );
        setActiveMissilesCount(weaponRef.current.activeMissiles.length);

        // If missile cinematic mode, track the active missile
        if (cinematicModeRef.current === 'missile' && weaponRef.current.activeMissiles.length > 0) {
          const leadMissile = weaponRef.current.activeMissiles[0];
          impactPosRef.current.copy(leadMissile.position);
          cinematicLookAtRef.current.lerp(leadMissile.position, 16 * deltaTime);
        }
      }

      // Check Target Lock & Screen Direction Indicator
      if (frameCount % 4 === 0 && weaponRef.current && missionResultRef.current === 'idle' && !isDivingRef.current) {
        const found = weaponRef.current.findAimedVehicle(dronePos, physicsRef.current.getForwardVector());
        setLockedVehicle(found ? found.vehicle : null);

        const primaryTarget = found?.vehicle || convoyRef.current?.targetVehicle || null;
        const targetDist = primaryTarget
          ? dronePos.distanceTo(primaryTarget.position)
          : 35;

        setHudTelemetry({
          altitude: Math.max(0, dronePos.y),
          speed: Math.round(droneSpeed),
          distance: Math.round(targetDist),
        });

        // 3D Target projection to 2D Screen coordinates for navigation indicator
        if (primaryTarget && cameraRef.current) {
          const targetWorldPos = primaryTarget.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          const proj = targetWorldPos.clone().project(cameraRef.current);

          const isInFront = proj.z < 1.0;
          let screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
          let screenY = (-(proj.y * 0.5) + 0.5) * window.innerHeight;

          if (!isInFront) {
            screenX = window.innerWidth - screenX;
            screenY = window.innerHeight - screenY;
          }

          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const dx = screenX - centerX;
          const dy = screenY - centerY;
          const angleRad = Math.atan2(dy, dx);
          const angleDeg = (angleRad * 180) / Math.PI;

          const margin = 70;
          const clampedX = Math.max(margin, Math.min(window.innerWidth - margin, screenX));
          const clampedY = Math.max(margin + 50, Math.min(window.innerHeight - margin - 80, screenY));

          setTargetIndicator({
            screenX: clampedX,
            screenY: clampedY,
            angle: angleDeg,
            distance: Math.round(targetDist),
            isVisible: true,
            isInFront,
            targetName: primaryTarget.name,
          });
        } else {
          setTargetIndicator(null);
        }
      }

      // 3. Update Drone Model
      if (droneModelRef.current && droneModelRef.current.group.visible) {
        droneModelRef.current.group.position.copy(dronePos);
        droneModelRef.current.group.rotation.copy(droneRot);
        droneModelRef.current.update(deltaTime, controls.throttle, droneSpeed, isDivingRef.current);
      }

      // 4. Update Sound
      const isMoving = Math.abs(pitch) > 0.1 || Math.abs(roll) > 0.1;
      soundManager.updateDroneAudio(throttle, droneSpeed, isMoving);

      // 5. Update Target Vehicles
      if (convoyRef.current) {
        convoyRef.current.update(deltaTime, cameraRef.current?.position);
      }

      // 6. Update Explosions
      if (explosionRef.current) {
        explosionRef.current.update(deltaTime);
      }

      // 7. Update Environment Animation (Radar Dish)
      if (envRef.current) {
        envRef.current.update(currentTime * 0.001);
      }

      // 8. Dynamic Professional Camera Logic
      if (cameraRef.current) {
        const isCinematic = cinematicModeRef.current !== 'idle' || isDivingRef.current || missionResultRef.current !== 'idle';

        if (isCinematic) {
          // =========================================================================
          // 🎬 MASTERPIECE 14-SECOND MULTI-PHASE CINEMATIC DIRECTOR CAMERA
          // =========================================================================
          if (cinematicModeRef.current === 'impact_replay') {
            const elapsed = (currentTime - cinematicStartTimeRef.current) / 1000;
            const initialAngle = cinematicOrbitAngleRef.current;

            let targetCam = new THREE.Vector3();

            if (elapsed < 3.5) {
              // PHASE 1: Impact Close-Up with Slow-Motion Debris Dynamics (0.0s - 3.5s)
              const shake = Math.max(0, (1 - elapsed / 2.5) * 0.35);
              const shakeX = Math.sin(currentTime * 0.06) * shake;
              const shakeY = Math.cos(currentTime * 0.05) * shake;

              targetCam.set(
                impactPosRef.current.x + Math.sin(initialAngle) * 16 + shakeX,
                10 + shakeY,
                impactPosRef.current.z + Math.cos(initialAngle) * 16 + shakeX
              );
            } else if (elapsed < 8.5) {
              // PHASE 2: 360° Low-Altitude Tactical Orbital Pan Around Convoy (3.5s - 8.5s)
              const p2 = (elapsed - 3.5) / 5.0;
              const ease2 = p2 * p2 * (3 - 2 * p2); // smooth step
              const curAngle = initialAngle + ease2 * Math.PI * 1.6;
              const curRadius = 16 + ease2 * 16; // 16m -> 32m
              const curHeight = 10 + ease2 * 14; // 10m -> 24m

              targetCam.set(
                impactPosRef.current.x + Math.sin(curAngle) * curRadius,
                curHeight,
                impactPosRef.current.z + Math.cos(curAngle) * curRadius
              );
            } else {
              // PHASE 3: Expansive High-Altitude Satellite & Aerial Reconnaissance View (8.5s - 14.0s)
              const p3 = (elapsed - 8.5) / 5.5;
              const ease3 = p3 * p3 * (3 - 2 * p3);
              const curAngle = initialAngle + Math.PI * 1.6 + ease3 * 0.6;
              const curRadius = 32 + ease3 * 22; // 32m -> 54m
              const curHeight = 24 + ease3 * 32; // 24m -> 56m

              targetCam.set(
                impactPosRef.current.x + Math.sin(curAngle) * curRadius,
                curHeight,
                impactPosRef.current.z + Math.cos(curAngle) * curRadius
              );
            }

            cameraRef.current.position.lerp(targetCam, 7 * deltaTime);
            cinematicLookAtRef.current.lerp(impactPosRef.current.clone().add(new THREE.Vector3(0, 1.2, 0)), 9 * deltaTime);
            cameraRef.current.lookAt(cinematicLookAtRef.current);
          } else {
            // Live missile flight tracking
            cameraRef.current.position.lerp(launchCamPosRef.current, 12 * deltaTime);
            cameraRef.current.lookAt(cinematicLookAtRef.current);
          }
        } else {
          // Standard Elevated Chase Camera
          if (lookTouchIdRef.current === null && !isMouseDraggingLookRef.current) {
            if (Math.abs(controls.pitch) > 0.1 || Math.abs(controls.yaw) > 0.1) {
              orbitYawRef.current *= Math.pow(0.92, deltaTime * 60);
              orbitPitchRef.current += (0.2 - orbitPitchRef.current) * (0.06 * deltaTime * 60);
            }
          }

          const totalYaw = physicsRef.current.yaw + orbitYawRef.current;
          const pitchAngle = orbitPitchRef.current;
          const dist = orbitDistRef.current;

          const horizontalDist = dist * Math.cos(pitchAngle);
          const verticalDist = dist * Math.sin(pitchAngle);

          const chaseOffset = new THREE.Vector3(
            Math.sin(totalYaw) * horizontalDist,
            Math.max(0.8, 1.8 + verticalDist),
            Math.cos(totalYaw) * horizontalDist
          );
          const targetCamPos = dronePos.clone().add(chaseOffset);
          cameraRef.current.position.lerp(targetCamPos, 16 * deltaTime);

          const droneCenter = dronePos.clone().add(new THREE.Vector3(0, 0.4, 0));
          const viewDir = droneCenter.clone().sub(targetCamPos).normalize();
          const lookTarget = droneCenter.clone().add(viewDir.multiplyScalar(30));
          cameraRef.current.lookAt(lookTarget);
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
      }
    };
  }, []);

  // Joystick handlers
  const handleLeftStickChange = useCallback((val: JoystickInput) => {
    setLeftStick(val);
    leftStickRef.current = val;
  }, []);

  const handleRightStickChange = useCallback((val: JoystickInput) => {
    setRightStick(val);
    rightStickRef.current = val;
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen bg-neutral-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FPV HUD & Cinematic Overlay */}
      <FPVOverlay
        altitude={hudTelemetry.altitude}
        speed={hudTelemetry.speed}
        distance={hudTelemetry.distance}
        lockedVehicle={lockedVehicle}
        targetIndicator={targetIndicator}
        missionResult={missionResult}
        strikeStats={strikeStats}
        isDiving={isDiving}
        cinematicMode={cinematicMode}
        cinematicElapsed={cinematicElapsed}
        countdownValue={countdownValue}
        activeMissilesCount={activeMissilesCount}
        destroyedCount={destroyedCount}
        totalTargets={3}
        onFireMissile={handleFireMissile}
        onRestart={handleRestart}
        onOpenBriefing={() => setShowWelcomeScreens(true)}
        onSkipCinematic={handleSkipCinematic}
      />

      {/* Virtual Dual Touch Joysticks (Hidden during cinematic air-strike replay) */}
      {missionResult === 'idle' && cinematicMode === 'idle' && !isDiving && (
        <DualJoystick
          leftValue={leftStick}
          rightValue={rightStick}
          onLeftStickChange={handleLeftStickChange}
          onRightStickChange={handleRightStickChange}
        />
      )}

      {/* Auto Welcome Screen with speech */}
      {showWelcomeScreens && (
        <WelcomeScreens
          onStartGame={() => {
            setShowWelcomeScreens(false);
            soundManager.init();
            soundManager.resume();
          }}
          onComplete={() => {
            setShowWelcomeScreens(false);
            soundManager.init();
            soundManager.resume();
          }}
        />
      )}
    </div>
  );
}
