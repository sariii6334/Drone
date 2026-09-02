import * as THREE from 'three';

export interface JoystickInput {
  x: number; // -1 to 1
  y: number; // -1 to 1
}

export interface DroneControls {
  throttle: number; // -1 to +1 (Altitude Up / Down)
  yaw: number; // -1 to +1 (Turn Left / Right)
  pitch: number; // -1 to +1 (Move Forward / Backward)
  roll: number; // -1 to +1 (Strafe Left / Right)
}

export interface TargetVehicle {
  id: string;
  name: string;
  position: THREE.Vector3;
  rotation: number;
  isDestroyed: boolean;
  mesh?: THREE.Group;
  colorHex: number;
  speed?: number;
  lane?: number;
  roadOffset?: number;
}

export type MissionResult = 'idle' | 'diving' | 'success' | 'failed';

export interface StrikeStats {
  targetName?: string;
  distance: number;
  missDistance?: number;
  strikeSpeed: number;
  hitAccuracy: number; // percentage
}

