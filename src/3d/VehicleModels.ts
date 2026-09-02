import * as THREE from 'three';
import { TargetVehicle } from '../types';

/**
 * Creates Desert Camo Texture
 */
function createMilitaryCamoTexture(baseColor = '#8c7550'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#6b573a';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 15 + Math.random() * 25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#423624';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates Black & White Checkerboard Police / Security Decal Texture
 * matching the security pickup trucks in the photo
 */
function createSecurityDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 128);

  // Black checkerboard band (2 rows of alternating black and white squares)
  const squareSize = 24;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 22; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = '#18191c';
        ctx.fillRect(col * squareSize + 10, row * squareSize + 38, squareSize, squareSize);
      }
    }
  }

  // Security badge / seal circle
  ctx.fillStyle = '#222328';
  ctx.beginPath();
  ctx.arc(420, 64, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECURITY', 420, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates 3D Armed Tactical Personnel seated/standing in the pickup bed
 */
function createTacticalOperator(isStanding = false): THREE.Group {
  const op = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x18191c, // Black tactical suit
    roughness: 0.8,
    metalness: 0.2,
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x111215, // Heavy tactical body armor
    roughness: 0.7,
    metalness: 0.3,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e10, // Ballistic helmet
    roughness: 0.5,
    metalness: 0.5,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x242528, // Balaclava
    roughness: 0.9,
  });

  const weaponMat = new THREE.MeshStandardMaterial({
    color: 0x08090a,
    roughness: 0.3,
    metalness: 0.9,
  });

  // Torso / Body Armor
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.32), vestMat);
  torso.position.y = isStanding ? 0.95 : 0.6;
  torso.castShadow = true;
  op.add(torso);

  // Head with Balaclava
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
  head.position.y = isStanding ? 1.45 : 1.1;
  head.castShadow = true;
  op.add(head);

  // Tactical FAST Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), helmetMat);
  helmet.position.set(0, (isStanding ? 1.48 : 1.13), 0);
  helmet.scale.set(1.05, 0.9, 1.1);
  helmet.castShadow = true;
  op.add(helmet);

  // Tactical NVG / Goggles mount
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.1), weaponMat);
  goggles.position.set(0, (isStanding ? 1.46 : 1.11), 0.16);
  op.add(goggles);

  // Arms holding rifle
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), suitMat);
  leftArm.position.set(-0.32, (isStanding ? 0.95 : 0.6), 0.12);
  leftArm.rotation.x = Math.PI * 0.25;
  op.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), suitMat);
  rightArm.position.set(0.32, (isStanding ? 0.95 : 0.6), 0.12);
  rightArm.rotation.x = Math.PI * 0.25;
  op.add(rightArm);

  // Assault Rifle (AK / M4)
  const rifle = new THREE.Group();
  rifle.position.set(0.1, (isStanding ? 0.95 : 0.6), 0.35);
  rifle.rotation.y = -Math.PI * 0.1;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), weaponMat);
  rifle.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), weaponMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.4);
  rifle.add(barrel);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.1), weaponMat);
  mag.position.set(0, -0.12, 0.05);
  mag.rotation.x = -Math.PI * 0.15;
  rifle.add(mag);

  op.add(rifle);

  // Legs (seated or standing)
  if (!isStanding) {
    const thighs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.5), suitMat);
    thighs.position.set(0, 0.35, 0.2);
    op.add(thighs);

    const shins = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.18), suitMat);
    shins.position.set(0, 0.15, 0.45);
    op.add(shins);
  } else {
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.75, 0.22), suitMat);
    legs.position.set(0, 0.4, 0);
    op.add(legs);
  }

  return op;
}

/**
 * 0. Security / Police Double-Cab Pickup Truck with Armed Personnel in Bed
 * Exact match to IMG_20260901_200648_731.jpg!
 */
export function createSecurityPickupTruck(): {
  group: THREE.Group;
  lightbar: THREE.Group;
  wheels: THREE.Object3D[];
  personnel: THREE.Group[];
} {
  const group = new THREE.Group();
  group.name = 'SecurityPickupTruck';

  // Glossy White Automotive Paint
  const whitePaintMat = new THREE.MeshStandardMaterial({
    color: 0xf8f9fb,
    roughness: 0.35,
    metalness: 0.15,
  });

  const decalMat = new THREE.MeshStandardMaterial({
    map: createSecurityDecalTexture(),
    roughness: 0.4,
    metalness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdde2e8,
    roughness: 0.15,
    metalness: 0.9,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2125,
    roughness: 0.6,
    metalness: 0.7,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.9,
    metalness: 0.1,
  });

  const tintedGlassMat = new THREE.MeshStandardMaterial({
    color: 0x11161f,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
  });

  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
  const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x1166ff });

  // 1. Lower Chassis & Frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 5.8), darkMetalMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  group.add(chassis);

  // 2. Front Hood & Engine Bay (White)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 1.8), whitePaintMat);
  hood.position.set(0, 1.15, -1.9);
  hood.castShadow = true;
  group.add(hood);

  // Front Grille & Radiator (Chrome & Dark Mesh)
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.15), chromeMat);
  grille.position.set(0, 1.05, -2.82);
  group.add(grille);

  // Front Headlights
  for (let s = -1; s <= 1; s += 2) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    headlight.position.set(s * 0.85, 1.1, -2.82);
    group.add(headlight);
  }

  // Front Heavy Chrome Bumper
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.35, 0.3), chromeMat);
  frontBumper.position.set(0, 0.65, -2.85);
  frontBumper.castShadow = true;
  group.add(frontBumper);

  // 3. Double-Cab Passenger Cabin (White)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.85, 2.2), whitePaintMat);
  cabin.position.set(0, 1.45, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  // Sloped Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.65, 0.7), tintedGlassMat);
  windshield.position.set(0, 1.5, -1.05);
  windshield.rotation.x = -Math.PI * 0.18;
  group.add(windshield);

  // Side Windows (Left & Right)
  for (let s = -1; s <= 1; s += 2) {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.45), tintedGlassMat);
    sideGlass.position.set(s * 1.085, 1.5, -0.1);
    sideGlass.rotation.y = s * Math.PI / 2;
    group.add(sideGlass);

    // Side Mirrors
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.25), darkMetalMat);
    mirror.position.set(s * 1.18, 1.4, -0.85);
    group.add(mirror);

    // Side Steps (Running boards)
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 2.0), chromeMat);
    step.position.set(s * 1.14, 0.5, -0.1);
    group.add(step);
  }

  // 4. Checkered Security Decal Panels (Sides of the Truck)
  for (let s = -1; s <= 1; s += 2) {
    const decalPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.4), decalMat);
    decalPanel.position.set(s * 1.085, 0.98, 0.6);
    decalPanel.rotation.y = s * Math.PI / 2;
    group.add(decalPanel);
  }

  // 5. Emergency Police Lightbar on Roof (Red & Blue flashing)
  const lightbarGroup = new THREE.Group();
  lightbarGroup.position.set(0, 1.95, -0.15);

  const lightbarMount = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.22), darkMetalMat);
  lightbarGroup.add(lightbarMount);

  const redBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.2), redLightMat);
  redBar.position.set(-0.32, 0.08, 0);
  lightbarGroup.add(redBar);

  const blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.2), blueLightMat);
  blueBar.position.set(0.32, 0.08, 0);
  lightbarGroup.add(blueBar);

  const redLight = new THREE.PointLight(0xff0022, 2.0, 10);
  redLight.position.set(-0.32, 0.15, 0);
  lightbarGroup.add(redLight);

  const blueLight = new THREE.PointLight(0x0044ff, 2.0, 10);
  blueLight.position.set(0.32, 0.15, 0);
  lightbarGroup.add(blueLight);

  group.add(lightbarGroup);

  // 6. Open Rear Cargo Bed (Matching the photo with personnel sitting)
  // Bed Floor
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.15, 2.1), darkMetalMat);
  bedFloor.position.set(0, 0.72, 1.85);
  bedFloor.receiveShadow = true;
  group.add(bedFloor);

  // Bed Side Walls (White)
  for (let s = -1; s <= 1; s += 2) {
    const bedSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 2.1), whitePaintMat);
    bedSide.position.set(s * 1.02, 1.05, 1.85);
    bedSide.castShadow = true;
    group.add(bedSide);
  }

  // Tailgate at the rear (White)
  const tailgate = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 0.12), whitePaintMat);
  tailgate.position.set(0, 1.05, 2.9);
  tailgate.castShadow = true;
  group.add(tailgate);

  // Tailgate Badge
  const tailDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), decalMat);
  tailDecal.position.set(0.6, 1.05, 2.97);
  group.add(tailDecal);

  // Rear Chrome Step Bumper
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.35), chromeMat);
  rearBumper.position.set(0, 0.65, 3.0);
  rearBumper.castShadow = true;
  group.add(rearBumper);

  // Red Taillights
  for (let s = -1; s <= 1; s += 2) {
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.08), redLightMat);
    taillight.position.set(s * 1.0, 1.15, 2.95);
    group.add(taillight);
  }

  // Roll Bar in Cargo Bed
  const rollBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), darkMetalMat);
  rollBar.rotation.z = Math.PI / 2;
  rollBar.position.set(0, 1.5, 0.95);
  group.add(rollBar);

  for (let s = -1; s <= 1; s += 2) {
    const rollLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), darkMetalMat);
    rollLeg.position.set(s * 0.95, 1.1, 0.95);
    group.add(rollLeg);
  }

  // 7. Tactical Security Operators in the Cargo Bed (Matching the 5-6 men in the photo!)
  const personnel: THREE.Group[] = [];

  const operatorPositions = [
    { x: -0.5, z: 1.3, rotY: -Math.PI * 0.45, standing: false }, // Left seated looking out
    { x: -0.55, z: 2.1, rotY: -Math.PI * 0.55, standing: false }, // Left rear seated
    { x: 0.5, z: 1.3, rotY: Math.PI * 0.45, standing: false },  // Right seated looking out
    { x: 0.55, z: 2.1, rotY: Math.PI * 0.55, standing: false },  // Right rear seated
    { x: 0.0, z: 2.4, rotY: Math.PI, standing: false },          // Rear tailgate sentry
    { x: 0.0, z: 1.1, rotY: -Math.PI * 0.2, standing: true },    // Standing roof sentry
  ];

  operatorPositions.forEach((pos) => {
    const op = createTacticalOperator(pos.standing);
    op.position.set(pos.x, 0.72, pos.z);
    op.rotation.y = pos.rotY;
    group.add(op);
    personnel.push(op);
  });

  // 8. 4 Off-road Pickup Wheels
  const wheels: THREE.Object3D[] = [];
  const wheelPositions = [
    { x: -1.15, z: -1.7 },
    { x: 1.15, z: -1.7 },
    { x: -1.15, z: 1.9 },
    { x: 1.15, z: 1.9 },
  ];

  wheelPositions.forEach((wp) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, 0.48, wp.z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.36, 12), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    group.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  return { group, lightbar: lightbarGroup, wheels, personnel };
}

/**
 * Canvas texture for Truck Canvas Canopy (Fabric weave and rope seams)
 */
function createCanvasTruckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b583e'; // Heavy khaki-tan canvas
  ctx.fillRect(0, 0, 512, 512);

  // Canvas fold lines
  ctx.strokeStyle = '#4e3f2b';
  ctx.lineWidth = 4;
  for (let y = 32; y < 512; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Fabric texture noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(30,20,10,0.12)' : 'rgba(200,180,150,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * 1. Tactical Armored 4x4 Combat Vehicle (Tigr / Oshkosh style)
 * Exactly as shown in the military convoy in the photo
 */
export function createTacticalArmored4x4(): {
  group: THREE.Group;
  turret?: THREE.Object3D;
  wheels: THREE.Object3D[];
} {
  const group = new THREE.Group();
  group.name = 'TacticalArmored4x4';

  const camoTexture = createMilitaryCamoTexture('#8c7550');
  const armorMat = new THREE.MeshStandardMaterial({
    map: camoTexture,
    roughness: 0.7,
    metalness: 0.3,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2124,
    roughness: 0.55,
    metalness: 0.75,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18191b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2630,
    roughness: 0.1,
    metalness: 0.9,
  });

  // Lower Chassis & Bullbar
  const chassisGeo = new THREE.BoxGeometry(2.4, 0.7, 5.2);
  const chassis = new THREE.Mesh(chassisGeo, armorMat);
  chassis.position.y = 0.8;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Front Engine Hood (Angled)
  const hoodGeo = new THREE.BoxGeometry(2.3, 0.65, 1.8);
  const hood = new THREE.Mesh(hoodGeo, armorMat);
  hood.position.set(0, 1.25, -1.5);
  hood.castShadow = true;
  group.add(hood);

  // Front Radiator Grille & Bullbar
  const grille = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.2), darkMetalMat);
  grille.position.set(0, 1.15, -2.45);
  group.add(grille);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 0.4), darkMetalMat);
  bumper.position.set(0, 0.65, -2.6);
  bumper.castShadow = true;
  group.add(bumper);

  // Main Armored Cabin
  const cabinGeo = new THREE.BoxGeometry(2.3, 0.9, 2.7);
  const cabin = new THREE.Mesh(cabinGeo, armorMat);
  cabin.position.set(0, 1.55, 0.7);
  cabin.castShadow = true;
  group.add(cabin);

  // Angled Front Windshield with Armored Glass
  const windshieldGeo = new THREE.BoxGeometry(2.1, 0.6, 0.8);
  const windshield = new THREE.Mesh(windshieldGeo, armorMat);
  windshield.position.set(0, 1.55, -0.7);
  windshield.rotation.x = -Math.PI * 0.15;
  windshield.castShadow = true;
  group.add(windshield);

  // Windshield Glass Panes
  for (let s = -1; s <= 1; s += 2) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.45), glassMat);
    pane.position.set(s * 0.5, 1.58, -0.98);
    pane.rotation.x = -Math.PI * 0.15;
    group.add(pane);
  }

  // Roof Hatch & Machine Gun Mount
  const hatchGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.2, 16);
  const hatch = new THREE.Mesh(hatchGeo, darkMetalMat);
  hatch.position.set(0, 2.05, 0.2);
  group.add(hatch);

  // Heavy 12.7mm Machine Gun
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0, 2.2, 0.2);

  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.7), darkMetalMat);
  gunGroup.add(gunBody);

  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), darkMetalMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.05, -0.9);
  gunGroup.add(gunBarrel);

  const gunShield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.08), darkMetalMat);
  gunShield.position.set(0, 0.15, -0.4);
  gunGroup.add(gunShield);

  group.add(gunGroup);

  // Rear Spare Tire Mounted on Back Door
  const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), tireMat);
  spareTire.position.set(0, 1.35, 2.25);
  spareTire.castShadow = true;
  group.add(spareTire);

  // 4 Heavy Off-road Wheels
  const wheels: THREE.Object3D[] = [];
  const wheelPositions = [
    { x: -1.3, z: -1.6 },
    { x: 1.3, z: -1.6 },
    { x: -1.3, z: 1.6 },
    { x: 1.3, z: 1.6 },
  ];

  wheelPositions.forEach((wp) => {
    const wheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.45, 16), tireMat);
    wheelMesh.rotation.z = Math.PI / 2;
    wheelMesh.position.set(wp.x, 0.52, wp.z);
    wheelMesh.castShadow = true;
    group.add(wheelMesh);
    wheels.push(wheelMesh);
  });

  return { group, turret: gunGroup, wheels };
}

/**
 * 2. Heavy Military Supply / Transport Truck (Kamaz / Ural 6x6 with Canvas Cover)
 * Prominently visible in the middle of the convoy in the photo!
 */
export function createMilitarySupplyTruck(): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
} {
  const group = new THREE.Group();
  group.name = 'MilitarySupplyTruck';

  const camoTexture = createMilitaryCamoTexture('#7a6645');
  const canvasTexture = createCanvasTruckTexture();

  const armorMat = new THREE.MeshStandardMaterial({
    map: camoTexture,
    roughness: 0.75,
    metalness: 0.25,
  });

  const canvasMat = new THREE.MeshStandardMaterial({
    map: canvasTexture,
    roughness: 0.9,
    metalness: 0.05,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x222428,
    roughness: 0.6,
    metalness: 0.7,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x161719,
    roughness: 0.92,
    metalness: 0.08,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x14202a,
    roughness: 0.1,
    metalness: 0.9,
  });

  // Long Steel Frame Chassis
  const chassisGeo = new THREE.BoxGeometry(2.4, 0.6, 8.8);
  const chassis = new THREE.Mesh(chassisGeo, darkMetalMat);
  chassis.position.y = 0.9;
  chassis.castShadow = true;
  group.add(chassis);

  // Front Driver Cab
  const cabGeo = new THREE.BoxGeometry(2.5, 1.8, 2.4);
  const cab = new THREE.Mesh(cabGeo, armorMat);
  cab.position.set(0, 2.0, -2.8);
  cab.castShadow = true;
  group.add(cab);

  // Front Windshield
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.7), glassMat);
  windshield.position.set(0, 2.3, -4.01);
  windshield.rotation.y = Math.PI;
  group.add(windshield);

  // Front Bumper & Grille
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 0.4), darkMetalMat);
  bumper.position.set(0, 0.75, -4.2);
  bumper.castShadow = true;
  group.add(bumper);

  // Large Rear Cargo Bed with Rounded Canvas Cover Canopy
  const bedGeo = new THREE.BoxGeometry(2.6, 0.6, 5.8);
  const bed = new THREE.Mesh(bedGeo, armorMat);
  bed.position.set(0, 1.4, 1.3);
  bed.castShadow = true;
  group.add(bed);

  // Canopy Cover Box
  const canopyGeo = new THREE.BoxGeometry(2.65, 2.1, 5.75);
  const canopy = new THREE.Mesh(canopyGeo, canvasMat);
  canopy.position.set(0, 2.7, 1.3);
  canopy.castShadow = true;
  group.add(canopy);

  // Canopy Arched Top
  const archGeo = new THREE.CylinderGeometry(1.32, 1.32, 5.75, 16, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  archGeo.rotateX(Math.PI / 2);
  const arch = new THREE.Mesh(archGeo, canvasMat);
  arch.position.set(0, 3.75, 1.3);
  arch.castShadow = true;
  group.add(arch);

  // 6 Heavy Truck Wheels (6x6 Drivetrain)
  const wheels: THREE.Object3D[] = [];
  const zPositions = [-2.8, 1.0, 2.6];

  zPositions.forEach((zPos) => {
    for (let s = -1; s <= 1; s += 2) {
      const wheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.5, 16), tireMat);
      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.position.set(s * 1.35, 0.65, zPos);
      wheelMesh.castShadow = true;
      group.add(wheelMesh);
      wheels.push(wheelMesh);
    }
  });

  return { group, wheels };
}

/**
 * 3. Heavy Armored Personnel Carrier (BTR / Stryker 8x8 with Turret)
 */
export function createHeavyAPC8x8(): {
  group: THREE.Group;
  turret: THREE.Object3D;
  wheels: THREE.Object3D[];
} {
  const group = new THREE.Group();
  group.name = 'HeavyAPC8x8';

  const camoTexture = createMilitaryCamoTexture('#856f48');
  const armorMat = new THREE.MeshStandardMaterial({
    map: camoTexture,
    roughness: 0.72,
    metalness: 0.3,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x202226,
    roughness: 0.6,
    metalness: 0.7,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x161719,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Boat-shaped sloped lower hull
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 7.6), armorMat);
  lowerHull.position.y = 0.9;
  lowerHull.castShadow = true;
  group.add(lowerHull);

  // Angled Front Upper Glacis
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.8, 2.2), armorMat);
  glacis.position.set(0, 1.4, -3.1);
  glacis.rotation.x = -Math.PI * 0.18;
  glacis.castShadow = true;
  group.add(glacis);

  // Upper Main Hull
  const upperHull = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.8, 5.4), armorMat);
  upperHull.position.set(0, 1.7, 0.5);
  upperHull.castShadow = true;
  group.add(upperHull);

  // 30mm Combat Turret
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, 2.1, -0.4);

  const turretBody = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.7, 12), armorMat);
  turretBody.castShadow = true;
  turretGroup.add(turretBody);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), darkMetalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.15, -2.1);
  barrel.castShadow = true;
  turretGroup.add(barrel);

  group.add(turretGroup);

  // 8 Heavy Wheels
  const wheels: THREE.Object3D[] = [];
  const zWheelPos = [-2.6, -0.9, 0.9, 2.6];

  zWheelPos.forEach((zPos) => {
    for (let s = -1; s <= 1; s += 2) {
      const wheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.48, 16), tireMat);
      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.position.set(s * 1.55, 0.58, zPos);
      wheelMesh.castShadow = true;
      group.add(wheelMesh);
      wheels.push(wheelMesh);
    }
  });

  return { group, turret: turretGroup, wheels };
}

// Universal creator
export function createViperModel() {
  return createTacticalArmored4x4();
}

/**
 * Transforms a vehicle model into charred destroyed wreck with realistic wreckage,
 * collapsed suspension, crumpled bodywork, and glowing ember highlights
 */
export function setVehicleDestroyedState(vehicle: TargetVehicle) {
  if (!vehicle.mesh) return;

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.95,
    metalness: 0.2,
  });

  const glowingEmberMat = new THREE.MeshBasicMaterial({
    color: 0xff3300,
  });

  vehicle.mesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.material = charredMat;

      // Random slight crumple / blast displacement
      mesh.rotation.x += (Math.random() - 0.5) * 0.15;
      mesh.rotation.y += (Math.random() - 0.5) * 0.15;
      mesh.rotation.z += (Math.random() - 0.5) * 0.2;
    }
  });

  // Add small glowing hot ember cores inside the chassis
  const ember1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 1), glowingEmberMat);
  ember1.position.set(0, 0.6, -1.2);
  vehicle.mesh.add(ember1);

  const ember2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), glowingEmberMat);
  ember2.position.set(0.3, 0.7, 0.8);
  vehicle.mesh.add(ember2);

  // Collapse suspension onto the pavement / sand
  vehicle.mesh.position.y = 0.08;
  vehicle.mesh.rotation.z += (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.12);
  vehicle.mesh.rotation.x += (Math.random() - 0.5) * 0.18;
}
