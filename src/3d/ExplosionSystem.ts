import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager';

export interface ActiveExplosion {
  group: THREE.Group;
  age: number;
  maxAge: number;
  particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotSpeed: THREE.Vector3;
    baseScale: number;
    isSmoke: boolean;
    isDebris?: boolean;
  }[];
  shockwave?: THREE.Mesh;
  light?: THREE.PointLight;
}

export interface VehicleFire {
  group: THREE.Group;
  position: THREE.Vector3;
  age: number;
  light?: THREE.PointLight;
  particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    baseScale: number;
    isFire: boolean;
    life: number;
    maxLife: number;
  }[];
}

export interface DustParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
}

export class ExplosionSystem {
  private scene: THREE.Scene;
  private explosions: ActiveExplosion[] = [];
  private vehicleFires: VehicleFire[] = [];
  private dustTrails: DustParticle[] = [];

  private fireMat: THREE.MeshBasicMaterial;
  private smokeMat: THREE.MeshStandardMaterial;
  private sparkMat: THREE.MeshBasicMaterial;
  private dustMat: THREE.MeshBasicMaterial;
  private debrisMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Rich orange-crimson fiery core
    this.fireMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.95,
    });

    // Dark billowing volumetric smoke
    this.smokeMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      transparent: true,
      opacity: 0.82,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Crisp small golden-orange sparks
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.95,
    });

    // Ground dust / dirt
    this.dustMat = new THREE.MeshBasicMaterial({
      color: 0x8c7853,
      transparent: true,
      opacity: 0.45,
    });

    // Charred wreckage fragments
    this.debrisMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.8,
      metalness: 0.4,
    });
  }

  /**
   * Triggers a crisp, cinematic explosion with fire, shockwave, and flying debris
   */
  public triggerExplosion(position: THREE.Vector3, scale = 1.0, isVehicleHit = false) {
    soundManager.playExplosion(scale);

    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    // Soft warm flash point light
    const light = new THREE.PointLight(0xff5511, 2.5 * Math.min(scale, 1.4), 16 * Math.min(scale, 1.4));
    light.position.set(0, 1.0, 0);
    group.add(light);

    // Ground Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.9, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.position.y = 0.12;
    group.add(shockwave);

    const particles: ActiveExplosion['particles'] = [];

    // 1. Fireball Core & Smoke Particles
    const fireballCount = isVehicleHit ? 16 : 10;
    for (let i = 0; i < fireballCount; i++) {
      const isFire = i < (isVehicleHit ? 7 : 4);
      const geo = new THREE.DodecahedronGeometry(isFire ? 0.5 : 0.75, 1);
      const mat = isFire ? this.fireMat.clone() : this.smokeMat.clone();
      const mesh = new THREE.Mesh(geo, mat);

      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.45;
      const speed = (2.0 + Math.random() * 4.5) * Math.min(scale, 1.2);

      const vx = Math.cos(angle) * Math.cos(elevation) * speed;
      const vy = Math.sin(elevation) * speed + (isFire ? 1.8 : 3.2);
      const vz = Math.sin(angle) * Math.cos(elevation) * speed;

      group.add(mesh);

      particles.push({
        mesh,
        velocity: new THREE.Vector3(vx, vy, vz),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        baseScale: (isFire ? 0.95 : 1.2) * Math.min(scale, 1.2),
        isSmoke: !isFire,
      });
    }

    // 2. High velocity fiery sparks
    for (let i = 0; i < 20; i++) {
      const sGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const sMesh = new THREE.Mesh(sGeo, this.sparkMat.clone());

      const spd = 6 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;

      const vx = Math.cos(theta) * Math.sin(phi) * spd;
      const vy = Math.cos(phi) * spd + 3.0;
      const vz = Math.sin(theta) * Math.sin(phi) * spd;

      group.add(sMesh);

      particles.push({
        mesh: sMesh,
        velocity: new THREE.Vector3(vx, vy, vz),
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        baseScale: 0.4,
        isSmoke: false,
      });
    }

    // 3. Flying vehicle wreckage fragments (if vehicle hit)
    if (isVehicleHit) {
      for (let i = 0; i < 8; i++) {
        const dGeo = new THREE.BoxGeometry(
          0.2 + Math.random() * 0.3,
          0.1 + Math.random() * 0.2,
          0.2 + Math.random() * 0.3
        );
        const dMesh = new THREE.Mesh(dGeo, this.debrisMat.clone());
        dMesh.castShadow = true;

        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 7;
        const vx = Math.cos(angle) * speed;
        const vy = 3.5 + Math.random() * 5.0;
        const vz = Math.sin(angle) * speed;

        group.add(dMesh);

        particles.push({
          mesh: dMesh,
          velocity: new THREE.Vector3(vx, vy, vz),
          rotSpeed: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
          baseScale: 1.0,
          isSmoke: false,
          isDebris: true,
        });
      }

      // Add persistent fire and smoke to this vehicle
      this.addVehicleFire(position.clone());
    }

    this.explosions.push({
      group,
      age: 0,
      maxAge: 4.5,
      particles,
      shockwave,
      light,
    });
  }

  /**
   * Creates continuous burning flames and thick smoke on destroyed vehicle wreckage
   */
  public addVehicleFire(position: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    const light = new THREE.PointLight(0xff5500, 1.8, 14);
    light.position.set(0, 1.2, 0);
    group.add(light);

    // Ground scorch decal
    const scorchGeo = new THREE.CircleGeometry(3.2, 24);
    scorchGeo.rotateX(-Math.PI / 2);
    const scorchMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0c,
      transparent: true,
      opacity: 0.9,
    });
    const scorch = new THREE.Mesh(scorchGeo, scorchMat);
    scorch.position.y = 0.03;
    group.add(scorch);

    this.vehicleFires.push({
      group,
      position: position.clone(),
      age: 0,
      light,
      particles: [],
    });
  }

  public emitVehicleDust(position: THREE.Vector3) {
    if (this.dustTrails.length > 50) return;

    const geo = new THREE.SphereGeometry(0.35 + Math.random() * 0.2, 5, 4);
    const mesh = new THREE.Mesh(geo, this.dustMat.clone());
    mesh.position.set(
      position.x + (Math.random() - 0.5) * 0.8,
      position.y + 0.1,
      position.z + (Math.random() - 0.5) * 0.8
    );

    this.scene.add(mesh);

    this.dustTrails.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        0.8 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.8
      ),
      age: 0,
      maxAge: 1.2,
    });
  }

  public update(deltaTime: number) {
    // 1. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += deltaTime;
      const progress = exp.age / exp.maxAge;

      // Expand & smoothly fade shockwave
      if (exp.shockwave) {
        const shockScale = 1 + progress * 7;
        exp.shockwave.scale.set(shockScale, shockScale, shockScale);
        (exp.shockwave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - progress * 2.2));
      }

      // Fade point light quickly in first 0.3s
      if (exp.light) {
        exp.light.intensity = Math.max(0, 2.5 * (1 - progress * 4.0));
      }

      // Update particles
      exp.particles.forEach((p) => {
        p.mesh.position.addScaledVector(p.velocity, deltaTime);

        if (p.isDebris) {
          // Heavy gravity for wreckage debris pieces
          p.velocity.y -= 14.0 * deltaTime;
          if (p.mesh.position.y < 0.1) {
            p.mesh.position.y = 0.1;
            p.velocity.set(0, 0, 0);
          }
        } else if (p.isSmoke) {
          p.velocity.y += 0.4 * deltaTime; // Smoke rises
          p.velocity.multiplyScalar(0.96);
        } else {
          p.velocity.y -= 8.0 * deltaTime; // Sparks fall
          p.velocity.multiplyScalar(0.95);
        }

        p.mesh.rotation.x += p.rotSpeed.x * deltaTime;
        p.mesh.rotation.y += p.rotSpeed.y * deltaTime;

        // Controlled particle growth and fade
        if (!p.isDebris) {
          const growth = p.isSmoke ? 1 + progress * 2.0 : 1 - progress * 0.5;
          const scale = Math.max(0.01, p.baseScale * growth);
          p.mesh.scale.set(scale, scale, scale);

          const mat = p.mesh.material as THREE.Material & { opacity: number };
          if (mat.opacity !== undefined) {
            mat.opacity = Math.max(0, (1 - progress * 1.1) * (p.isSmoke ? 0.82 : 0.95));
          }
        }
      });

      if (exp.age >= exp.maxAge) {
        this.scene.remove(exp.group);
        this.explosions.splice(i, 1);
      }
    }

    // 2. Update Persistent Vehicle Fires & Smoke Plumes
    for (let f = 0; f < this.vehicleFires.length; f++) {
      const vf = this.vehicleFires[f];
      vf.age += deltaTime;

      // Flicker fire light
      if (vf.light) {
        vf.light.intensity = 1.0 + Math.sin(Date.now() * 0.02 + f) * 0.4;
      }

      // Spawn new rising fire and smoke puff
      if (Math.random() < 0.65 && vf.particles.length < 45) {
        const isFire = Math.random() < 0.45;
        const pGeo = new THREE.DodecahedronGeometry(isFire ? 0.4 : 0.65, 1);
        const pMat = isFire ? this.fireMat.clone() : this.smokeMat.clone();
        const pMesh = new THREE.Mesh(pGeo, pMat);

        pMesh.position.set(
          (Math.random() - 0.5) * 1.4,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 1.8
        );

        vf.group.add(pMesh);

        vf.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            isFire ? 2.0 + Math.random() * 1.5 : 2.8 + Math.random() * 2.2,
            (Math.random() - 0.5) * 0.5
          ),
          baseScale: isFire ? 0.75 : 1.1,
          isFire,
          life: 0,
          maxLife: isFire ? 1.0 : 2.8,
        });
      }

      // Update vehicle fire particles
      for (let pIdx = vf.particles.length - 1; pIdx >= 0; pIdx--) {
        const vp = vf.particles[pIdx];
        vp.life += deltaTime;
        const pNorm = vp.life / vp.maxLife;

        vp.mesh.position.addScaledVector(vp.velocity, deltaTime);
        const curScale = vp.baseScale * (vp.isFire ? 1 - pNorm * 0.5 : 1 + pNorm * 1.8);
        vp.mesh.scale.set(curScale, curScale, curScale);

        const mat = vp.mesh.material as THREE.Material & { opacity: number };
        if (mat.opacity !== undefined) {
          mat.opacity = Math.max(0, (1 - pNorm) * (vp.isFire ? 0.9 : 0.75));
        }

        if (vp.life >= vp.maxLife) {
          vf.group.remove(vp.mesh);
          vf.particles.splice(pIdx, 1);
        }
      }
    }

    // 3. Update Dust Trails
    for (let i = this.dustTrails.length - 1; i >= 0; i--) {
      const d = this.dustTrails[i];
      d.age += deltaTime;
      const p = d.age / d.maxAge;

      d.mesh.position.addScaledVector(d.velocity, deltaTime);
      const scale = 1 + p * 2.2;
      d.mesh.scale.set(scale, scale * 0.8, scale);

      const mat = d.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.45 * (1 - p));

      if (d.age >= d.maxAge) {
        this.scene.remove(d.mesh);
        this.dustTrails.splice(i, 1);
      }
    }
  }

  public clear() {
    this.explosions.forEach((e) => this.scene.remove(e.group));
    this.vehicleFires.forEach((vf) => {
      vf.particles.forEach((p) => vf.group.remove(p.mesh));
      this.scene.remove(vf.group);
    });
    this.dustTrails.forEach((d) => this.scene.remove(d.mesh));
    this.explosions = [];
    this.vehicleFires = [];
    this.dustTrails = [];
  }
}
