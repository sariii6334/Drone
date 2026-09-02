import * as THREE from 'three';
import { TargetVehicle, StrikeStats } from '../types';
import { soundManager } from '../audio/SoundManager';
import { ConvoyManager } from './ConvoyManager';
import { ExplosionSystem } from './ExplosionSystem';

export interface KamikazeStrikeState {
  isDiving: boolean;
  diveVelocity: THREE.Vector3;
  diveSpeed: number;
  diveTime: number;
  lockedTarget: TargetVehicle | null;
  aimedGroundPos: THREE.Vector3;
  startPos: THREE.Vector3;
  highCamPos?: THREE.Vector3;
}

export interface ActiveMissile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  flightTime: number;
  startPos: THREE.Vector3;
  lockedTarget: TargetVehicle | null;
  aimedGroundPos: THREE.Vector3;
  mesh: THREE.Group;
  highCamPos?: THREE.Vector3;
}

export class WeaponSystem {
  private scene: THREE.Scene;
  private convoyManager: ConvoyManager;
  private explosionSystem: ExplosionSystem;

  public activeMissiles: ActiveMissile[] = [];

  public strikeState: KamikazeStrikeState = {
    isDiving: false,
    diveVelocity: new THREE.Vector3(0, 0, 0),
    diveSpeed: 55,
    diveTime: 0,
    lockedTarget: null,
    aimedGroundPos: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
  };

  constructor(scene: THREE.Scene, convoyManager: ConvoyManager, explosionSystem: ExplosionSystem) {
    this.scene = scene;
    this.convoyManager = convoyManager;
    this.explosionSystem = explosionSystem;
  }

  /**
   * Calculates the exact point where the player's crosshair / forward line-of-sight hits the ground plane
   */
  public calculateAimedGroundPoint(dronePos: THREE.Vector3, droneForward: THREE.Vector3): THREE.Vector3 {
    const fwd = droneForward.clone().normalize();
    if (fwd.y < -0.01) {
      // Ray-plane intersection with ground at y = 0.2
      const t = (0.2 - dronePos.y) / fwd.y;
      if (t > 0 && t < 300) {
        return dronePos.clone().add(fwd.multiplyScalar(t));
      }
    }
    // If aiming horizontal or slightly upwards, project forward 90m onto ground level
    const flatFwd = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
    return dronePos.clone().add(flatFwd.multiplyScalar(90)).setY(0.2);
  }

  /**
   * Finds the vehicle in the reticle cone of vision strictly when the player is aiming at it
   */
  public findAimedVehicle(dronePos: THREE.Vector3, droneForward: THREE.Vector3): { vehicle: TargetVehicle; angle: number; dist: number } | null {
    const activeVehicles = this.convoyManager.convoyVehicles.filter((v) => !v.isDestroyed);
    if (activeVehicles.length === 0) return null;

    let bestTarget: TargetVehicle | null = null;
    let bestScore = -1;
    let targetAngle = 0;
    let targetDist = 0;

    const fwd = droneForward.clone().normalize();

    activeVehicles.forEach((veh) => {
      const vehCenter = veh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const toVeh = vehCenter.clone().sub(dronePos);
      const dist = toVeh.length();
      const dirToVeh = toVeh.clone().normalize();

      const dot = fwd.dot(dirToVeh);
      // Precise reticle lock cone (~15 degrees cone strictly near crosshairs center)
      if (dot > 0.965) {
        const score = dot / Math.max(1, dist * 0.04);
        if (score > bestScore) {
          bestScore = score;
          bestTarget = veh;
          targetAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
          targetDist = dist;
        }
      }
    });

    if (bestTarget) {
      return { vehicle: bestTarget, angle: targetAngle, dist: targetDist };
    }
    return null;
  }

  /**
   * Calculates a dramatic, elevated cinematic camera vantage point overlooking the dive trajectory
   */
  public calculateCinematicCamPos(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 {
    const trajectoryVec = targetPos.clone().sub(startPos);
    const midPoint = startPos.clone().add(targetPos).multiplyScalar(0.5);

    // Compute perpendicular horizontal vector for side-overhead framing
    const forwardNorm = trajectoryVec.clone().setY(0).normalize();
    const sideVec = new THREE.Vector3(-forwardNorm.z, 0, forwardNorm.x).normalize();

    // High-angle overhead vantage ("منظور سطحي من فوق")
    return new THREE.Vector3(
      midPoint.x + sideVec.x * 26 + forwardNorm.x * -10,
      Math.max(startPos.y + 28, 45),
      midPoint.z + sideVec.z * 26 + forwardNorm.z * -10
    );
  }

  /**
   * Creates a detailed 3D mesh for a launched missile projectile
   */
  private createMissileMesh(): THREE.Group {
    const missileGroup = new THREE.Group();

    // Missile Fuselage Cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.6,
      roughness: 0.35,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.x = Math.PI / 2;
    missileGroup.add(bodyMesh);

    // Red Conical Nosecone
    const noseGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.4,
    });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.rotation.x = -Math.PI / 2;
    noseMesh.position.z = -0.85;
    missileGroup.add(noseMesh);

    // 4 Stabilizing Tail Fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
    const finGeo = new THREE.BoxGeometry(0.04, 0.4, 0.22);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.z = 0.5;
      fin.rotation.z = (i * Math.PI) / 2;
      missileGroup.add(fin);
    }

    // Rocket Thruster Flare
    const thrusterGeo = new THREE.ConeGeometry(0.14, 0.6, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = 0.9;
    missileGroup.add(thruster);

    return missileGroup;
  }

  /**
   * Fires a missile projectile strictly towards the player's aimed target / direction
   */
  public launchMissile(
    dronePos: THREE.Vector3,
    droneForward: THREE.Vector3,
    droneVelocity: THREE.Vector3,
    manualLockedVehicle: TargetVehicle | null = null
  ): { missile: ActiveMissile; highCamPos: THREE.Vector3 } {
    soundManager.playMissileLaunch();

    // Target acquisition: check if user specifically aimed at/locked a vehicle
    let target = manualLockedVehicle;
    if (!target || target.isDestroyed) {
      const found = this.findAimedVehicle(dronePos, droneForward);
      if (found) {
        target = found.vehicle;
      }
    }

    // If no vehicle was aimed at, calculate exact ground spot the player aimed towards
    const aimedGroundPos = this.calculateAimedGroundPoint(dronePos, droneForward);
    const targetPos = target?.position ? target.position.clone().add(new THREE.Vector3(0, 1.0, 0)) : aimedGroundPos;
    const highCamPos = this.calculateCinematicCamPos(dronePos, targetPos);

    let initialDir = droneForward.clone().normalize();
    if (target) {
      const toTarget = target.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(dronePos).normalize();
      initialDir.lerp(toTarget, 0.85).normalize();
    } else {
      const toGround = aimedGroundPos.clone().sub(dronePos).normalize();
      initialDir.copy(toGround);
    }

    const startSpeed = 50; // Tuned for clear ~3.2s flight trajectory
    const missileMesh = this.createMissileMesh();
    const spawnPos = dronePos.clone().add(new THREE.Vector3(0, -0.3, 0)).add(droneForward.clone().multiplyScalar(0.8));
    missileMesh.position.copy(spawnPos);
    this.scene.add(missileMesh);

    const missile: ActiveMissile = {
      id: `missile_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      position: spawnPos,
      velocity: initialDir.multiplyScalar(startSpeed).add(droneVelocity.clone().multiplyScalar(0.15)),
      speed: startSpeed,
      flightTime: 0,
      startPos: spawnPos.clone(),
      lockedTarget: target && !target.isDestroyed ? target : null,
      aimedGroundPos: aimedGroundPos,
      mesh: missileMesh,
      highCamPos,
    };

    this.activeMissiles.push(missile);
    return { missile, highCamPos };
  }

  /**
   * Updates flying missile projectiles
   */
  public updateMissiles(
    deltaTime: number,
    onHitVehicle: (targetVehicle: TargetVehicle, stats: StrikeStats) => void,
    onMissOrGround?: (stats: StrikeStats) => void
  ) {
    const activeVehicles = this.convoyManager.convoyVehicles.filter((v) => !v.isDestroyed);

    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i];
      missile.flightTime += deltaTime;
      missile.speed = Math.min(85, missile.speed + 12 * deltaTime);

      let currentDir = missile.velocity.clone().normalize();

      // Only home in if player actually locked/aimed at this specific vehicle
      if (missile.lockedTarget && !missile.lockedTarget.isDestroyed) {
        const targetPos = missile.lockedTarget.position.clone().add(new THREE.Vector3(0, 0.9, 0));
        const desiredDir = targetPos.clone().sub(missile.position).normalize();
        currentDir.lerp(desiredDir, Math.min(1.0, 8.0 * deltaTime)).normalize();
      } else {
        // Fly straight towards aimed ground location with slight ballistic curve
        const toGround = missile.aimedGroundPos.clone().sub(missile.position).normalize();
        currentDir.lerp(toGround, Math.min(1.0, 4.0 * deltaTime)).normalize();
      }

      missile.velocity.copy(currentDir.multiplyScalar(missile.speed));
      const nextPos = missile.position.clone().addScaledVector(missile.velocity, deltaTime);

      // Orient missile mesh
      const dirNorm = missile.velocity.clone().normalize();
      const yaw = Math.atan2(-dirNorm.x, -dirNorm.z);
      const pitch = Math.asin(Math.max(-1, Math.min(1, dirNorm.y)));
      missile.mesh.rotation.set(-pitch, yaw, 0, 'YXZ');
      missile.mesh.position.copy(nextPos);

      // Light smoke trail
      if (Math.random() < 0.65) {
        const tailPos = nextPos.clone().add(dirNorm.clone().multiplyScalar(-0.7));
        this.explosionSystem.emitVehicleDust(tailPos);
      }

      // Check physical 3D box collision with convoy trucks
      const hitResult = this.convoyManager.checkPhysicalCollision(nextPos, missile.position, 0.25);
      if (hitResult.hit && hitResult.vehicle) {
        // Direct Hit physically inside the vehicle model!
        this.explosionSystem.triggerExplosion(hitResult.hitPoint, 1.25, true);
        this.convoyManager.damageVehicle(hitResult.vehicle.id, 100);

        const totalDist = missile.startPos.distanceTo(hitResult.hitPoint);
        const stats: StrikeStats = {
          targetName: hitResult.vehicle.name,
          distance: Math.round(totalDist),
          strikeSpeed: Math.round(missile.speed),
          hitAccuracy: 100,
        };

        this.scene.remove(missile.mesh);
        this.activeMissiles.splice(i, 1);
        onHitVehicle(hitResult.vehicle, stats);
        continue;
      }

      // Ground or flight timeout (Ground impact is at y <= 0.35)
      const isGround = nextPos.y <= 0.35;
      const isTimeout = missile.flightTime >= 4.0;
      const isOutOfBounds = Math.abs(nextPos.x) > 300 || Math.abs(nextPos.z) > 300;

      if (isGround || isTimeout || isOutOfBounds) {
        const impactPos = nextPos.clone();
        if (impactPos.y < 0.35) impactPos.y = 0.35;

        let closestDist = 999;
        let closestName = '';
        activeVehicles.forEach((v) => {
          const d = impactPos.distanceTo(v.position);
          if (d < closestDist) {
            closestDist = d;
            closestName = v.name;
          }
        });

        // Contained ground impact blast (no vehicle fire since it missed)
        this.explosionSystem.triggerExplosion(impactPos, 0.9, false);

        const stats: StrikeStats = {
          targetName: closestName || 'شاحنة أمن تكتيكية',
          distance: Math.round(missile.startPos.distanceTo(impactPos)),
          missDistance: Math.round(closestDist * 10) / 10,
          strikeSpeed: Math.round(missile.speed),
          hitAccuracy: Math.max(0, Math.round((1 - Math.min(1, closestDist / 30)) * 80)),
        };

        this.scene.remove(missile.mesh);
        this.activeMissiles.splice(i, 1);
        if (onMissOrGround) {
          onMissOrGround(stats);
        }
        continue;
      }

      missile.position.copy(nextPos);
    }
  }

  /**
   * Initiates direct kamikaze drone suicide dive strictly towards the player's aimed target or ground point
   */
  public launchKamikazeStrike(
    dronePos: THREE.Vector3,
    droneForward: THREE.Vector3,
    manualLockedVehicle: TargetVehicle | null = null
  ): { success: boolean; highCamPos: THREE.Vector3 } {
    if (this.strikeState.isDiving) {
      return { success: false, highCamPos: dronePos };
    }

    soundManager.playKamikazeBooster();

    // Check if player specifically aimed at or locked a vehicle
    let target = manualLockedVehicle;
    if (!target || target.isDestroyed) {
      const found = this.findAimedVehicle(dronePos, droneForward);
      if (found) {
        target = found.vehicle;
      }
    }

    // If no vehicle was aimed at, calculate exact ground spot the player aimed towards
    const aimedGroundPos = this.calculateAimedGroundPoint(dronePos, droneForward);
    const targetPos = target?.position ? target.position.clone().add(new THREE.Vector3(0, 1.0, 0)) : aimedGroundPos;
    const highCamPos = this.calculateCinematicCamPos(dronePos, targetPos);

    let initialDir = droneForward.clone().normalize();
    if (target) {
      const toTarget = target.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(dronePos).normalize();
      initialDir.lerp(toTarget, 0.8).normalize();
    } else {
      const toGround = aimedGroundPos.clone().sub(dronePos).normalize();
      initialDir.copy(toGround);
    }

    const startSpeed = 55; // Tuned for clear ~3.2s flight trajectory

    this.strikeState = {
      isDiving: true,
      diveVelocity: initialDir.multiplyScalar(startSpeed),
      diveSpeed: startSpeed,
      diveTime: 0,
      lockedTarget: target && !target.isDestroyed ? target : null,
      aimedGroundPos: aimedGroundPos,
      startPos: dronePos.clone(),
      highCamPos: highCamPos,
    };

    return { success: true, highCamPos };
  }

  /**
   * Updates kamikaze diving drone
   */
  public updateKamikaze(
    dronePos: THREE.Vector3,
    deltaTime: number,
    onHitVehicle: (targetVehicle: TargetVehicle, stats: StrikeStats) => void,
    onMissOrGround: (stats: StrikeStats) => void
  ): { newPos: THREE.Vector3; newRot: THREE.Euler; speed: number; highCamPos?: THREE.Vector3 } | null {
    if (!this.strikeState.isDiving) return null;

    const activeVehicles = this.convoyManager.convoyVehicles.filter((v) => !v.isDestroyed);

    this.strikeState.diveTime += deltaTime;
    this.strikeState.diveSpeed = Math.min(90, this.strikeState.diveSpeed + 12 * deltaTime);

    let currentDir = this.strikeState.diveVelocity.clone().normalize();

    // Proportional homing only if player actually aimed/locked onto a vehicle
    if (this.strikeState.lockedTarget && !this.strikeState.lockedTarget.isDestroyed) {
      const targetPos = this.strikeState.lockedTarget.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      const desiredDir = targetPos.clone().sub(dronePos).normalize();
      currentDir.lerp(desiredDir, Math.min(1.0, 8.0 * deltaTime)).normalize();
    } else {
      // Plunge directly towards aimed ground point
      const toGround = this.strikeState.aimedGroundPos.clone().sub(dronePos).normalize();
      currentDir.lerp(toGround, Math.min(1.0, 4.0 * deltaTime)).normalize();
    }

    this.strikeState.diveVelocity.copy(currentDir.multiplyScalar(this.strikeState.diveSpeed));
    const nextPos = dronePos.clone().addScaledVector(this.strikeState.diveVelocity, deltaTime);

    // Calculate rotation facing velocity vector
    const dirNorm = this.strikeState.diveVelocity.clone().normalize();
    const yaw = Math.atan2(-dirNorm.x, -dirNorm.z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, dirNorm.y)));
    const rot = new THREE.Euler(-pitch, yaw, 0, 'YXZ');

    // Emit light booster smoke
    if (Math.random() < 0.65) {
      const rearPos = dronePos.clone().add(dirNorm.clone().multiplyScalar(-0.8));
      this.explosionSystem.emitVehicleDust(rearPos);
    }

    // Precise physical 3D box collision check with active trucks in convoy
    const hitResult = this.convoyManager.checkPhysicalCollision(nextPos, dronePos, 0.3);
    if (hitResult.hit && hitResult.vehicle) {
      // Direct Hit physically inside the vehicle model!
      this.explosionSystem.triggerExplosion(hitResult.hitPoint, 1.35, true);
      this.convoyManager.damageVehicle(hitResult.vehicle.id, 100);

      const totalDist = this.strikeState.startPos.distanceTo(hitResult.hitPoint);
      const stats: StrikeStats = {
        targetName: hitResult.vehicle.name,
        distance: Math.round(totalDist),
        strikeSpeed: Math.round(this.strikeState.diveSpeed),
        hitAccuracy: 100,
      };

      this.strikeState.isDiving = false;
      onHitVehicle(hitResult.vehicle, stats);
      return null;
    }

    // Ground Collision OR Max Flight Timeout (ground is at y <= 0.35)
    const isGroundImpact = nextPos.y <= 0.35;
    const isTimeout = this.strikeState.diveTime >= 4.0;
    const isOutOfBounds = Math.abs(nextPos.x) > 300 || Math.abs(nextPos.z) > 300;

    if (isGroundImpact || isTimeout || isOutOfBounds) {
      const impactPos = nextPos.clone();
      if (impactPos.y < 0.35) impactPos.y = 0.35;

      let closestDist = 999;
      let closestName = '';
      activeVehicles.forEach((v) => {
        const d = impactPos.distanceTo(v.position);
        if (d < closestDist) {
          closestDist = d;
          closestName = v.name;
        }
      });

      // Contained ground impact blast
      this.explosionSystem.triggerExplosion(impactPos, 0.95, false);

      const stats: StrikeStats = {
        targetName: closestName || 'شاحنة أمن تكتيكية',
        distance: Math.round(this.strikeState.startPos.distanceTo(impactPos)),
        missDistance: Math.round(closestDist * 10) / 10,
        strikeSpeed: Math.round(this.strikeState.diveSpeed),
        hitAccuracy: Math.max(0, Math.round((1 - Math.min(1, closestDist / 30)) * 80)),
      };

      this.strikeState.isDiving = false;
      onMissOrGround(stats);
      return null;
    }

    return {
      newPos: nextPos,
      newRot: rot,
      speed: this.strikeState.diveSpeed,
      highCamPos: this.strikeState.highCamPos,
    };
  }

  public reset() {
    this.activeMissiles.forEach((m) => {
      this.scene.remove(m.mesh);
    });
    this.activeMissiles = [];

    this.strikeState = {
      isDiving: false,
      diveVelocity: new THREE.Vector3(0, 0, 0),
      diveSpeed: 55,
      diveTime: 0,
      lockedTarget: null,
      aimedGroundPos: new THREE.Vector3(),
      startPos: new THREE.Vector3(),
    };
  }
}
