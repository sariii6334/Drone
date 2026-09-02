import * as THREE from 'three';

export interface DroneObject {
  group: THREE.Group;
  propellers: THREE.Mesh[];
  gimbalCamera: THREE.Object3D;
  frontLeds: THREE.PointLight[];
  boosterFire: THREE.Mesh;
  boosterLight: THREE.PointLight;
  update: (deltaTime: number, throttle: number, speed: number, isKamikazeDiving?: boolean) => void;
  setColorScheme: (accentColorHex: number, ledColorHex: number) => void;
}

/**
 * Creates the exact matte slate-gray tactical reconnaissance quadcopter
 * matching the drone shown in the user's reference photo.
 */
export function createDroneModel(): DroneObject {
  const group = new THREE.Group();
  group.name = 'TacticalReconDrone';
  group.scale.set(0.85, 0.85, 0.85);

  // Matte military polymers and carbon fiber materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x22252a, // Matte dark slate grey
    roughness: 0.5,
    metalness: 0.4,
  });

  const topShellMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d22,
    roughness: 0.45,
    metalness: 0.5,
  });

  const motorMat = new THREE.MeshStandardMaterial({
    color: 0x111215,
    roughness: 0.3,
    metalness: 0.85,
  });

  const propMat = new THREE.MeshStandardMaterial({
    color: 0x141518,
    roughness: 0.2,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x050a12,
    roughness: 0.1,
    metalness: 0.95,
  });

  const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

  // 1. Sleek Central Fuselage Body
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.18, 0.85);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.1;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Aerodynamic Tapered Top Shell
  const topShellGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.12, 8);
  topShellGeo.rotateX(Math.PI / 2);
  topShellGeo.scale(1.0, 1.0, 2.2);
  const topShell = new THREE.Mesh(topShellGeo, topShellMat);
  topShell.position.set(0, 0.22, 0);
  topShell.castShadow = true;
  group.add(topShell);

  // 2. Gimbal Camera at front nose (Matching photo)
  const gimbalPivot = new THREE.Group();
  gimbalPivot.position.set(0, 0.05, -0.48);

  const gimbalSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), motorMat);
  gimbalSphere.castShadow = true;
  gimbalPivot.add(gimbalSphere);

  const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 16), motorMat);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(0, 0, -0.07);
  gimbalPivot.add(lensBarrel);

  const glassLens = new THREE.Mesh(new THREE.CircleGeometry(0.052, 16), lensMat);
  glassLens.position.set(0, 0, -0.111);
  glassLens.rotation.y = Math.PI;
  gimbalPivot.add(glassLens);

  group.add(gimbalPivot);

  // 3. 4 Structural Folding Drone Arms (Matching photo angled configuration)
  const armSpecs = [
    { x: -0.52, z: -0.48, rotY: -Math.PI * 0.28 }, // Front Left
    { x: 0.52, z: -0.48, rotY: Math.PI * 0.28 },  // Front Right
    { x: -0.62, z: 0.48, rotY: -Math.PI * 0.72 }, // Rear Left
    { x: 0.62, z: 0.48, rotY: Math.PI * 0.72 },  // Rear Right
  ];

  const propellers: THREE.Mesh[] = [];
  const frontLeds: THREE.PointLight[] = [];

  armSpecs.forEach((spec, idx) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(spec.x * 0.4, 0.12, spec.z * 0.4);

    // Diagonal carbon arm strut
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.08), bodyMat);
    armMesh.position.set(spec.x > 0 ? 0.28 : -0.28, 0, spec.z > 0 ? 0.28 : -0.28);
    armMesh.rotation.y = spec.rotY;
    armMesh.castShadow = true;
    group.add(armMesh);

    // Motor Pod at end of arm
    const motorX = spec.x * 1.15;
    const motorZ = spec.z * 1.15;

    const motorPod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), motorMat);
    motorPod.position.set(motorX, 0.16, motorZ);
    motorPod.castShadow = true;
    group.add(motorPod);

    // Motor Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), motorMat);
    shaft.position.set(motorX, 0.25, motorZ);
    group.add(shaft);

    // Propeller Blades (2-Blade Aerodynamic Rotor)
    const propGeo = new THREE.BoxGeometry(0.9, 0.015, 0.08);
    const propMesh = new THREE.Mesh(propGeo, propMat);
    propMesh.position.set(motorX, 0.28, motorZ);
    propMesh.castShadow = true;
    group.add(propMesh);
    propellers.push(propMesh);

    // Under-motor Navigation LED
    const ledIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), ledMat);
    ledIndicator.position.set(motorX, 0.08, motorZ);
    group.add(ledIndicator);

    if (idx < 2) {
      const pLight = new THREE.PointLight(0x00ff88, 0.6, 6);
      pLight.position.set(motorX, 0.08, motorZ);
      group.add(pLight);
      frontLeds.push(pLight);
    }
  });

  // 4. Booster Rocket Exhaust for Kamikaze Dive
  const boosterFireGeo = new THREE.ConeGeometry(0.18, 0.8, 8);
  boosterFireGeo.rotateX(-Math.PI / 2);
  const boosterFireMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0,
  });
  const boosterFire = new THREE.Mesh(boosterFireGeo, boosterFireMat);
  boosterFire.position.set(0, 0.1, 0.6);
  group.add(boosterFire);

  const boosterLight = new THREE.PointLight(0xff4400, 0, 15);
  boosterLight.position.set(0, 0.1, 0.7);
  group.add(boosterLight);

  return {
    group,
    propellers,
    gimbalCamera: gimbalPivot,
    frontLeds,
    boosterFire,
    boosterLight,
    update: (deltaTime: number, throttle: number, speed: number, isKamikazeDiving = false) => {
      // Rotate propellers continuously based on throttle and motion
      const propSpeed = (25 + Math.max(0, throttle) * 45 + speed * 1.5) * deltaTime;
      propellers.forEach((prop, i) => {
        prop.rotation.y += i % 2 === 0 ? propSpeed : -propSpeed;
      });

      // Kamikaze Booster Fire effect
      if (isKamikazeDiving) {
        (boosterFire.material as THREE.MeshBasicMaterial).opacity = 0.9 + Math.random() * 0.1;
        boosterFire.scale.set(
          1 + Math.random() * 0.3,
          1 + Math.random() * 0.3,
          1.5 + Math.random() * 0.5
        );
        boosterLight.intensity = 3.5 + Math.random() * 1.5;
      } else {
        (boosterFire.material as THREE.MeshBasicMaterial).opacity = 0;
        boosterLight.intensity = 0;
      }
    },
    setColorScheme: (_accentColorHex: number, _ledColorHex: number) => {},
  };
}
