import * as THREE from 'three';
import { TargetVehicle } from '../types';
import {
  createSecurityPickupTruck,
  setVehicleDestroyedState,
} from './VehicleModels';
import { ExplosionSystem } from './ExplosionSystem';

export class ConvoyManager {
  private scene: THREE.Scene;
  private explosionSystem: ExplosionSystem;
  public convoyVehicles: TargetVehicle[] = [];
  private lightbars: { group: THREE.Group; vehId: string }[] = [];
  private wheelsList: { wheels: THREE.Object3D[]; vehId: string }[] = [];
  private vehicleBehaviors: {
    vehId: string;
    targetLane: number;
    currentLane: number;
    laneChangeTimer: number;
    laneChangeDuration: number;
    baseSpeed: number;
    currentSpeed: number;
    lateralSteer: number;
  }[] = [];

  // Road configuration
  private roadAngle = -Math.PI * 0.21;
  private centerRoadPos = new THREE.Vector3(40, 0.35, -50);
  private roadFwd = new THREE.Vector3(-Math.sin(-Math.PI * 0.21), 0, -Math.cos(-Math.PI * 0.21)).normalize();
  private roadRight = new THREE.Vector3(Math.cos(-Math.PI * 0.21), 0, -Math.sin(-Math.PI * 0.21)).normalize();

  // Active target vehicle for HUD targeting/camera tracking
  public get targetVehicle(): TargetVehicle | null {
    return this.convoyVehicles.find((v) => !v.isDestroyed) || this.convoyVehicles[0] || null;
  }

  public get vehicles(): TargetVehicle[] {
    return this.convoyVehicles;
  }

  constructor(scene: THREE.Scene, _roadCurve: THREE.CatmullRomCurve3, explosionSystem: ExplosionSystem) {
    this.scene = scene;
    this.explosionSystem = explosionSystem;
    this.spawnConvoy();
  }

  public spawnConvoy() {
    this.clear();

    // 3 white security pickup trucks moving in tactical convoy along the highway (+100% faster speed: 14-16 m/s)
    const convoySpecs = [
      { id: 'veh_01', name: 'شاحنة أمن دورية قائدة (LEAD PATROL PICKUP)', offset: -35, lane: 2.0, speed: 14.8 },
      { id: 'veh_02', name: 'شاحنة أمن قيادة تكتيكية (COMMAND PICKUP)', offset: 25, lane: -1.8, speed: 14.2 },
      { id: 'veh_03', name: 'شاحنة أمن إسناد خلفية (REAR ESCORT PICKUP)', offset: 85, lane: 1.8, speed: 15.6 },
    ];

    convoySpecs.forEach((spec) => {
      const modelData = createSecurityPickupTruck();

      const pos = this.centerRoadPos
        .clone()
        .addScaledVector(this.roadFwd, spec.offset)
        .addScaledVector(this.roadRight, spec.lane);

      pos.y = 0.35;

      modelData.group.position.copy(pos);
      // Face along the road forward direction
      modelData.group.rotation.y = this.roadAngle + Math.PI;

      this.scene.add(modelData.group);
      this.lightbars.push({ group: modelData.lightbar, vehId: spec.id });
      this.wheelsList.push({ wheels: modelData.wheels, vehId: spec.id });

      this.vehicleBehaviors.push({
        vehId: spec.id,
        targetLane: spec.lane,
        currentLane: spec.lane,
        laneChangeTimer: Math.random() * 4 + 3,
        laneChangeDuration: 3.5,
        baseSpeed: spec.speed,
        currentSpeed: spec.speed,
        lateralSteer: 0,
      });

      this.convoyVehicles.push({
        id: spec.id,
        name: spec.name,
        position: pos.clone(),
        rotation: this.roadAngle + Math.PI,
        isDestroyed: false,
        mesh: modelData.group,
        colorHex: 0xffffff,
        speed: spec.speed,
        lane: spec.lane,
        roadOffset: spec.offset,
      });
    });
  }

  public update(deltaTime: number, _cameraPos?: THREE.Vector3) {
    const time = Date.now() * 0.008;

    this.convoyVehicles.forEach((veh) => {
      const behavior = this.vehicleBehaviors.find((b) => b.vehId === veh.id);

      if (veh.isDestroyed) {
        // Billow subtle smoke from damaged chassis
        if (Math.random() < 0.25 && veh.mesh) {
          const smokePos = veh.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
          this.explosionSystem.emitVehicleDust(smokePos);
        }
      } else if (veh.mesh && behavior) {
        // 1. Dynamic AI Lane Shifting & Path Variation
        behavior.laneChangeTimer -= deltaTime;
        if (behavior.laneChangeTimer <= 0) {
          // Choose a new random lane target across the asphalt (-2.6m to +2.6m)
          const laneOptions = [-2.4, -1.2, 1.2, 2.4];
          behavior.targetLane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
          behavior.laneChangeTimer = Math.random() * 6 + 5; // Change lane every 5-11 seconds
        }

        // Smoothly steer into target lane
        const laneDiff = behavior.targetLane - behavior.currentLane;
        const laneShiftRate = 1.8 * deltaTime;
        if (Math.abs(laneDiff) > laneShiftRate) {
          behavior.currentLane += Math.sign(laneDiff) * laneShiftRate;
          behavior.lateralSteer = Math.sign(laneDiff) * 0.08;
        } else {
          behavior.currentLane = behavior.targetLane;
          behavior.lateralSteer = 0;
        }

        // Slight speed breathing for organic dynamic flow
        behavior.currentSpeed = behavior.baseSpeed + Math.sin(time * 0.5 + (veh.roadOffset || 0) * 0.02) * 1.2;

        const moveSpeed = behavior.currentSpeed;
        veh.speed = moveSpeed;
        veh.roadOffset = (veh.roadOffset ?? 0) - moveSpeed * deltaTime;

        // Loop across massive highway bounds (-500m to +500m) so vehicles never disappear in screen view
        if (veh.roadOffset < -500) {
          veh.roadOffset = 500;
        }

        veh.lane = behavior.currentLane;
        const newPos = this.centerRoadPos
          .clone()
          .addScaledVector(this.roadFwd, veh.roadOffset)
          .addScaledVector(this.roadRight, behavior.currentLane);

        // Gentle chassis rumble from high-speed asphalt motion
        const rumble = Math.sin(time * 6 + (veh.roadOffset || 0)) * 0.018;
        newPos.y = 0.35 + rumble;

        veh.position.copy(newPos);
        veh.mesh.position.copy(newPos);
        veh.mesh.rotation.y = this.roadAngle + Math.PI + behavior.lateralSteer;

        // Rotate wheels realistically matching high 14-16 m/s speed
        const wheelEntry = this.wheelsList.find((w) => w.vehId === veh.id);
        if (wheelEntry) {
          const wheelSpin = (moveSpeed * deltaTime) / 0.45;
          wheelEntry.wheels.forEach((w) => {
            w.rotation.x += wheelSpin;
          });
        }
      }
    });

    // Flashing emergency lightbars (police red & blue strobe)
    const flash = Math.sin(Date.now() * 0.02) > 0;
    this.lightbars.forEach((lb) => {
      const veh = this.convoyVehicles.find((v) => v.id === lb.vehId);
      if (veh && !veh.isDestroyed) {
        lb.group.children.forEach((child) => {
          if ((child as THREE.PointLight).isPointLight) {
            (child as THREE.PointLight).intensity = flash ? 2.8 : 0.4;
          }
        });
      } else {
        lb.group.children.forEach((child) => {
          if ((child as THREE.PointLight).isPointLight) {
            (child as THREE.PointLight).intensity = 0;
          }
        });
      }
    });
  }

  /**
   * Highly accurate 3D Oriented Bounding Box collision test
   * Tests whether a projectile or drone path physically hits the 3D volume of a security truck
   */
  public checkPhysicalCollision(
    curPos: THREE.Vector3,
    prevPos?: THREE.Vector3,
    extraTolerance: number = 0.3
  ): { hit: boolean; vehicle: TargetVehicle | null; hitPoint: THREE.Vector3 } {
    const activeVehicles = this.convoyVehicles.filter((v) => !v.isDestroyed);
    if (activeVehicles.length === 0) {
      return { hit: false, vehicle: null, hitPoint: curPos.clone() };
    }

    // Number of segment interpolation samples to prevent projectile tunneling
    const startPt = prevPos ? prevPos : curPos;
    const segVec = curPos.clone().sub(startPt);
    const segLen = segVec.length();
    const samples = Math.max(1, Math.ceil(segLen / 0.4));

    // Vehicle Local Bounding Box Bounds (Security Pickup Truck: ~2.4m wide, ~2.2m tall, ~6.0m long)
    const halfWidth = 1.25 + extraTolerance;
    const minY = 0.0 - extraTolerance;
    const maxY = 2.2 + extraTolerance;
    const halfLength = 3.0 + extraTolerance;

    for (let s = 0; s <= samples; s++) {
      const frac = s / samples;
      const testPt = startPt.clone().addScaledVector(segVec, frac);

      for (const veh of activeVehicles) {
        const vehPos = veh.position;
        const vehAngle = veh.mesh ? veh.mesh.rotation.y : veh.rotation;

        // Transform testPt into vehicle's local coordinate space
        const dx = testPt.x - vehPos.x;
        const dy = testPt.y - vehPos.y;
        const dz = testPt.z - vehPos.z;

        const cosA = Math.cos(-vehAngle);
        const sinA = Math.sin(-vehAngle);

        const localX = dx * cosA - dz * sinA;
        const localY = dy;
        const localZ = dx * sinA + dz * cosA;

        // Precise Box Containment Test
        if (
          Math.abs(localX) <= halfWidth &&
          localY >= minY &&
          localY <= maxY &&
          Math.abs(localZ) <= halfLength
        ) {
          return { hit: true, vehicle: veh, hitPoint: testPt };
        }
      }
    }

    return { hit: false, vehicle: null, hitPoint: curPos.clone() };
  }

  public damageVehicle(vehicleId: string, _damage: number): boolean {
    const veh = this.convoyVehicles.find((v) => v.id === vehicleId);
    if (!veh || veh.isDestroyed) return false;

    veh.isDestroyed = true;
    setVehicleDestroyedState(veh);
    return true;
  }

  public getActiveTarget(_num?: number): TargetVehicle | null {
    return this.convoyVehicles.find((v) => !v.isDestroyed) || null;
  }

  public clear() {
    this.convoyVehicles.forEach((veh) => {
      if (veh.mesh) {
        this.scene.remove(veh.mesh);
      }
    });
    this.convoyVehicles = [];
    this.lightbars = [];
    this.vehicleBehaviors = [];
  }
}
