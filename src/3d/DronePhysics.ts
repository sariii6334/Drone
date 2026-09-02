import * as THREE from 'three';
import { DroneControls } from '../types';

export interface DronePhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler; // x=pitch, y=yaw, z=roll
  targetRotation: THREE.Euler;
  speed: number;
  altitude: number;
}

export class DronePhysics {
  public position = new THREE.Vector3(0, 10, 50); // Start nicely elevated facing the arena center
  public velocity = new THREE.Vector3(0, 0, 0);
  public yaw = 0; // Heading forward into the arena
  public pitch = 0;
  public roll = 0;

  // Visual tilt angles
  private visualPitch = 0;
  private visualRoll = 0;

  // Flight parameters - high speed, snappy, ultra responsive
  private readonly maxSpeedHorizontal = 48; // m/s (fast & agile)
  private readonly maxSpeedVertical = 28; // m/s
  private readonly accelHorizontal = 110;
  private readonly accelVertical = 80;
  private readonly yawRate = 3.6; // rad/s (quick snappy turns)
  private readonly drag = 0.78; // Crisp, instant auto-braking on release
  private readonly tiltAngleMax = 0.38; // rad

  // Bounds
  public minAltitude = -5.0; // Allow full free ground impact without artificial clamp
  public maxAltitude = 220;

  public reset(startPos = new THREE.Vector3(0, 12, 70), startYaw = 0) {
    this.position.copy(startPos);
    this.velocity.set(0, 0, 0);
    this.yaw = startYaw;
    this.pitch = 0;
    this.roll = 0;
    this.visualPitch = 0;
    this.visualRoll = 0;
  }

  public update(controls: DroneControls, deltaTime: number): DronePhysicsState {
    const dt = Math.min(deltaTime, 0.05);

    // 1. LEFT STICK: Yaw Rotation & Altitude
    // Yaw (Left/Right) -> Rotates heading smoothly
    this.yaw -= controls.yaw * this.yawRate * dt;

    // Altitude (Up/Down) -> Vertical Velocity
    const targetVerticalVel = controls.throttle * this.maxSpeedVertical;
    this.velocity.y += (targetVerticalVel - this.velocity.y) * Math.min(1.0, this.accelVertical * dt * 0.3);

    // 2. RIGHT STICK: Pitch (Forward/Back) & Roll (Lateral Strafe)
    // Forward vector based on current yaw heading
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Target horizontal movement vectors
    const targetVelX = (forward.x * controls.pitch + right.x * controls.roll) * this.maxSpeedHorizontal;
    const targetVelZ = (forward.z * controls.pitch + right.z * controls.roll) * this.maxSpeedHorizontal;

    // Smooth horizontal acceleration
    this.velocity.x += (targetVelX - this.velocity.x) * Math.min(1.0, this.accelHorizontal * dt * 0.3);
    this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(1.0, this.accelHorizontal * dt * 0.3);

    // Auto-hover / aerodynamic braking when stick is released
    if (Math.abs(controls.pitch) < 0.05 && Math.abs(controls.roll) < 0.05) {
      this.velocity.x *= Math.pow(this.drag, dt * 60);
      this.velocity.z *= Math.pow(this.drag, dt * 60);
      if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.001) this.velocity.z = 0;
    }
    if (Math.abs(controls.throttle) < 0.05) {
      this.velocity.y *= Math.pow(this.drag, dt * 60);
      if (Math.abs(this.velocity.y) < 0.001) this.velocity.y = 0;
    }

    // 3. Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Clamp altitude cleanly
    if (this.position.y < this.minAltitude) {
      this.position.y = this.minAltitude;
      this.velocity.y = Math.max(0, this.velocity.y);
    } else if (this.position.y > this.maxAltitude) {
      this.position.y = this.maxAltitude;
      this.velocity.y = Math.min(0, this.velocity.y);
    }

    // 4. Calculate Dynamic Visual Banking & Tilt
    const targetPitch = controls.pitch * this.tiltAngleMax;
    const targetRoll = -controls.roll * this.tiltAngleMax - controls.yaw * 0.22;

    const tiltLerp = 16 * dt;
    this.visualPitch += (targetPitch - this.visualPitch) * tiltLerp;
    this.visualRoll += (targetRoll - this.visualRoll) * tiltLerp;

    const speed = this.velocity.length();

    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      rotation: new THREE.Euler(this.visualPitch, this.yaw, this.visualRoll, 'YXZ'),
      targetRotation: new THREE.Euler(targetPitch, this.yaw, targetRoll, 'YXZ'),
      speed,
      altitude: this.position.y,
    };
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }
}
