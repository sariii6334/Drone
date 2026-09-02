import * as THREE from 'three';

export interface EnvironmentData {
  scene: THREE.Scene;
  roadCurve: THREE.CatmullRomCurve3;
  roadPoints: THREE.Vector3[];
  launchPads: THREE.Vector3[];
  buildingPosition: THREE.Vector3;
  update: (time: number) => void;
}

/**
 * Creates realistic Asphalt Highway Canvas Texture with center dashed line & gravel edge
 */
function createAsphaltRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark weathered asphalt base
  ctx.fillStyle = '#42413e';
  ctx.fillRect(0, 0, 1024, 1024);

  // Gravel shoulder edges
  ctx.fillStyle = '#6e5e4a';
  ctx.fillRect(0, 0, 100, 1024);
  ctx.fillRect(924, 0, 100, 1024);

  // Road surface tire wear lanes (darker tire track streaks)
  ctx.fillStyle = 'rgba(40, 39, 36, 0.4)';
  ctx.fillRect(220, 0, 160, 1024);
  ctx.fillRect(640, 0, 160, 1024);

  // White center dashed line
  ctx.fillStyle = '#dcd8cc';
  for (let y = 0; y < 1024; y += 128) {
    ctx.fillRect(504, y + 20, 16, 88);
  }

  // Solid white edge lines
  ctx.fillStyle = 'rgba(215, 210, 195, 0.7)';
  ctx.fillRect(110, 0, 12, 1024);
  ctx.fillRect(902, 0, 12, 1024);

  // Asphalt grain and crack noise
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(20,20,20,0.18)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 40);
  return texture;
}

/**
 * Creates Dry Semi-Arid Countryside Ground Texture with soil, dry grass and patches
 */
function createAridSoilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm dry dirt tone
  ctx.fillStyle = '#8f7756';
  ctx.fillRect(0, 0, 1024, 1024);

  // Dry scrub patches & clay earth variation
  const earthTones = ['#7c6443', '#9b825e', '#a68f6a', '#6f5a3b', '#85704f'];
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 40 + Math.random() * 90;
    ctx.fillStyle = earthTones[i % earthTones.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dry straw / grass grain noise
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(70, 50, 25, 0.22)' : 'rgba(220, 195, 140, 0.25)';
    ctx.fillRect(x, y, 2, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(30, 30);
  return texture;
}

/**
 * Creates Weathered Concrete Texture for the observation outpost building
 */
function createWeatheredConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7a756c';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete block seam lines
  ctx.strokeStyle = '#5a554c';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const xOffset = (y / 64) % 2 === 0 ? 0 : 64;
    for (let x = xOffset; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 64);
      ctx.stroke();
    }
  }

  // Weathering, water stains & dust
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Builds the exact countryside landscape shown in the user's reference photo:
 * - Paved asphalt highway cutting through semi-arid scrubland
 * - Flat-roof concrete outpost building in foreground
 * - Low stone drywall boundaries
 * - Olive & scrub trees
 * - Utility power poles along the road
 */
export function buildEnvironment(scene: THREE.Scene): EnvironmentData {
  // 1. Natural Daylight & Atmospheric Sky Color (matching reference photo)
  const skyColor = new THREE.Color(0xbab0a0);
  const sunLightColor = new THREE.Color(0xfff7e8);

  scene.background = skyColor;
  scene.fog = new THREE.FogExp2(0xb5a894, 0.0028);

  // Sunlight and Ambient
  const ambientLight = new THREE.AmbientLight(0xd9cdb8, 0.9);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x7a664d, 0.85);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(sunLightColor, 2.4);
  sunLight.position.set(100, 160, 90);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 450;
  sunLight.shadow.camera.left = -140;
  sunLight.shadow.camera.right = 140;
  sunLight.shadow.camera.top = 140;
  sunLight.shadow.camera.bottom = -140;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  // 2. Terrain Surface (Semi-arid Arid Soil with gentle roll, leveled along highway corridor)
  const soilTexture = createAridSoilTexture();
  const terrainGeo = new THREE.PlaneGeometry(900, 900, 140, 140);
  terrainGeo.rotateX(-Math.PI / 2);

  const roadCenterPt = new THREE.Vector2(40, -50);
  const roadNorm = new THREE.Vector2(Math.cos(-Math.PI * 0.21), -Math.sin(-Math.PI * 0.21)).normalize();

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Calculate perpendicular distance to the highway corridor
    const distToRoad = Math.abs((x - roadCenterPt.x) * roadNorm.x + (z - roadCenterPt.y) * roadNorm.y);

    // Subtle gentle rolling countryside hills in distance
    const rawHillHeight =
      Math.sin(x * 0.01 + z * 0.008) * 3.2 +
      Math.cos(x * 0.015 - z * 0.012) * 2.5 +
      Math.sin(x * 0.03) * 0.6;

    // Smooth clearance corridor around the highway so sand never covers road or vehicles
    let roadFactor = 1.0;
    if (distToRoad < 14) {
      roadFactor = 0.0; // Completely level under highway and shoulders
    } else if (distToRoad < 36) {
      const t = (distToRoad - 14) / 22;
      roadFactor = t * t * (3 - 2 * t); // Smooth hermite blend to natural dunes
    }

    // Level area around launch outpost tower
    const distToTower = Math.hypot(x - 18, z - 24);
    let towerFactor = 1.0;
    if (distToTower < 16) {
      towerFactor = 0.0;
    } else if (distToTower < 30) {
      const t = (distToTower - 16) / 14;
      towerFactor = t * t * (3 - 2 * t);
    }

    const finalY = Math.max(-0.1, rawHillHeight * Math.min(roadFactor, towerFactor));
    posAttr.setY(i, finalY);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: soilTexture,
    roughness: 0.95,
    metalness: 0.05,
  });

  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // 3. Two-Lane Asphalt Highway cutting diagonally across the scene
  const roadTexture = createAsphaltRoadTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.82,
    metalness: 0.15,
  });

  // Build Highway Mesh elevated cleanly at y = 0.35
  const roadWidth = 14;
  const roadLength = 1200;
  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 120);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.position.set(40, 0.35, -50);
  roadMesh.rotation.y = -Math.PI * 0.21; // Diagonal angle matching the photo
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // 4. Concrete Observation Outpost Tower in Foreground (Elevated High Launch Tower)
  // The tall military observation tower on which the drone launches!
  const concreteTexture = createWeatheredConcreteTexture();
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    roughness: 0.9,
    metalness: 0.1,
  });

  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1917,
    roughness: 0.95,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.3,
  });

  const buildingPos = new THREE.Vector3(18, 0, 24);
  const buildingGroup = new THREE.Group();
  buildingGroup.position.copy(buildingPos);

  // Main High Observation Tower Structure (Much higher - 4 storeys / 24m)
  const bWidth = 10;
  const bHeight = 24;
  const bDepth = 10;

  // Solid Core Walls
  const mainWallGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
  const mainWall = new THREE.Mesh(mainWallGeo, concreteMat);
  mainWall.position.y = bHeight / 2;
  mainWall.castShadow = true;
  mainWall.receiveShadow = true;
  buildingGroup.add(mainWall);

  // Upper Observation Deck Glass / Slits
  const deckBand = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.6, 2.8, bDepth + 0.6), darkInteriorMat);
  deckBand.position.y = bHeight - 3.5;
  buildingGroup.add(deckBand);

  // High Rooftop with Steel Guardrails & Launch Pad Markings
  const parapetHeight = 1.2;
  const parapetThickness = 0.5;

  // 4 Rooftop Parapet Ledges
  const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(bWidth, parapetHeight, parapetThickness), concreteMat);
  parapetFront.position.set(0, bHeight + parapetHeight / 2, -bDepth / 2 + parapetThickness / 2);
  parapetFront.castShadow = true;
  buildingGroup.add(parapetFront);

  const parapetBack = new THREE.Mesh(new THREE.BoxGeometry(bWidth, parapetHeight, parapetThickness), concreteMat);
  parapetBack.position.set(0, bHeight + parapetHeight / 2, bDepth / 2 - parapetThickness / 2);
  parapetBack.castShadow = true;
  buildingGroup.add(parapetBack);

  const parapetLeft = new THREE.Mesh(new THREE.BoxGeometry(parapetThickness, parapetHeight, bDepth), concreteMat);
  parapetLeft.position.set(-bWidth / 2 + parapetThickness / 2, bHeight + parapetHeight / 2, 0);
  parapetLeft.castShadow = true;
  buildingGroup.add(parapetLeft);

  const parapetRight = new THREE.Mesh(new THREE.BoxGeometry(parapetThickness, parapetHeight, bDepth), concreteMat);
  parapetRight.position.set(bWidth / 2 - parapetThickness / 2, bHeight + parapetHeight / 2, 0);
  parapetRight.castShadow = true;
  buildingGroup.add(parapetRight);

  // Rooftop concrete floor slab with Drone Launch Pad H
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.2, 0.4, bDepth - 0.2), concreteMat);
  roofSlab.position.y = bHeight - 0.2;
  roofSlab.receiveShadow = true;
  buildingGroup.add(roofSlab);

  // Yellow Helipad / Drone Pad Circle & H on roof
  const padGeo = new THREE.RingGeometry(1.8, 2.2, 32);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
  const padMesh = new THREE.Mesh(padGeo, padMat);
  padMesh.position.set(0, bHeight + 0.05, 0);
  buildingGroup.add(padMesh);

  // High Communications Mast / Antenna positioned safely on far back-right corner
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 7, 8), metalMat);
  mast.position.set(bWidth / 2 - 0.8, bHeight + 3.5, bDepth / 2 - 0.8);
  buildingGroup.add(mast);

  // Blinking Red Aviation Beacon on top of the mast
  const beaconLight = new THREE.PointLight(0xff0000, 3, 25);
  beaconLight.position.set(bWidth / 2 - 0.8, bHeight + 7.2, bDepth / 2 - 0.8);
  buildingGroup.add(beaconLight);

  const beaconBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 })
  );
  beaconBulb.position.copy(beaconLight.position);
  buildingGroup.add(beaconBulb);

  // Window Cutouts along the height of the tower
  for (let wy = 5; wy < bHeight - 4; wy += 4.5) {
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.4), darkInteriorMat);
    win1.position.set(-2.0, wy, -bDepth / 2 - 0.05);
    buildingGroup.add(win1);

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.4), darkInteriorMat);
    win2.position.set(2.0, wy, -bDepth / 2 - 0.05);
    buildingGroup.add(win2);
  }

  // Ground Floor Entrance Doorway
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 0.4), darkInteriorMat);
  door.position.set(0, 1.7, -bDepth / 2 - 0.05);
  buildingGroup.add(door);

  // Adjacent Low Outpost Base Annex
  const annexWall = new THREE.Mesh(new THREE.BoxGeometry(7, 5.5, 8), concreteMat);
  annexWall.position.set(8.5, 2.75, 2.0);
  annexWall.castShadow = true;
  buildingGroup.add(annexWall);

  buildingGroup.rotation.y = -Math.PI * 0.12;
  scene.add(buildingGroup);

  // 5. Rustic Stone Drywalls (Low stone fences dividing arid fields matching photo)
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a775a,
    roughness: 0.95,
  });

  const wallSegments = [
    { start: new THREE.Vector3(-120, 0, 60), end: new THREE.Vector3(-40, 0, 30) },
    { start: new THREE.Vector3(-40, 0, 30), end: new THREE.Vector3(20, 0, -20) },
    { start: new THREE.Vector3(-150, 0, 10), end: new THREE.Vector3(-80, 0, -30) },
    { start: new THREE.Vector3(40, 0, -70), end: new THREE.Vector3(140, 0, -120) },
    { start: new THREE.Vector3(-90, 0, 110), end: new THREE.Vector3(-10, 0, 80) },
    { start: new THREE.Vector3(60, 0, 30), end: new THREE.Vector3(120, 0, -10) },
  ];

  wallSegments.forEach((seg) => {
    const len = seg.start.distanceTo(seg.end);
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.9), stoneMat);
    const mid = seg.start.clone().add(seg.end).multiplyScalar(0.5);
    wallMesh.position.set(mid.x, 0.55, mid.z);
    wallMesh.rotation.y = Math.atan2(seg.end.x - seg.start.x, seg.end.z - seg.start.z) - Math.PI / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);
  });

  // 6. Utility / Telegraph Power Poles along the Highway (Matching photo)
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a28,
    roughness: 0.9,
  });

  const poleLocations = [
    new THREE.Vector3(-60, 0, 65),
    new THREE.Vector3(-15, 0, 25),
    new THREE.Vector3(35, 0, -20),
    new THREE.Vector3(85, 0, -65),
    new THREE.Vector3(135, 0, -110),
  ];

  poleLocations.forEach((pos) => {
    const poleGroup = new THREE.Group();
    poleGroup.position.copy(pos);

    // Vertical wooden pole
    const vertical = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 14, 8), poleMat);
    vertical.position.y = 7;
    vertical.castShadow = true;
    poleGroup.add(vertical);

    // Cross beam
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.2), poleMat);
    crossBeam.position.y = 13.2;
    crossBeam.rotation.y = -Math.PI * 0.21;
    crossBeam.castShadow = true;
    poleGroup.add(crossBeam);

    scene.add(poleGroup);
  });

  // 7. Natural Olive Trees & Dry Acacia Shrubs (Matching photo)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x453828, roughness: 0.95 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3d432b, roughness: 0.85 }); // Olive green
  const dryBushMat = new THREE.MeshStandardMaterial({ color: 0x5a5538, roughness: 0.9 });

  const treeLocations = [
    { x: -35, z: 20, scale: 1.2 },
    { x: -50, z: 45, scale: 1.5 },
    { x: -20, z: -40, scale: 1.1 },
    { x: 30, z: -75, scale: 1.4 },
    { x: 65, z: -40, scale: 1.3 },
    { x: -75, z: -10, scale: 1.6 },
    { x: 80, z: -90, scale: 1.2 },
    { x: -10, z: 70, scale: 1.0 },
    { x: 45, z: 15, scale: 1.3 },
    { x: 95, z: 10, scale: 1.5 },
    { x: -110, z: 50, scale: 1.7 },
  ];

  treeLocations.forEach((t) => {
    const tree = new THREE.Group();
    tree.position.set(t.x, 0, t.z);
    tree.scale.setScalar(t.scale);

    // Gnarled Olive Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6), trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    tree.add(trunk);

    // Broad Olive Foliage Canopy
    const canopyGeo = new THREE.DodecahedronGeometry(2.4, 1);
    const canopy = new THREE.Mesh(canopyGeo, foliageMat);
    canopy.position.set(0, 4.0, 0);
    canopy.scale.set(1.4, 0.9, 1.4);
    canopy.castShadow = true;
    tree.add(canopy);

    scene.add(tree);
  });

  // Dry small bushes scattered in fields
  for (let b = 0; b < 45; b++) {
    const bx = (Math.random() - 0.5) * 350;
    const bz = (Math.random() - 0.5) * 350;
    // Skip road area
    if (Math.abs(bx * 0.6 + bz * 0.8) < 18) continue;

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + Math.random() * 0.8, 1), dryBushMat);
    bush.position.set(bx, 0.6, bz);
    bush.scale.set(1.2, 0.7, 1.2);
    bush.castShadow = true;
    scene.add(bush);
  }

  // Drone spawn location: Hovering right above the concrete observation roof!
  const droneLaunchPos = new THREE.Vector3(
    buildingPos.x + 0.5,
    bHeight + 2.8, // Hovering cleanly above roof
    buildingPos.z - 0.5
  );

  return {
    scene,
    roadCurve,
    roadPoints: roadCurvePoints,
    launchPads: [droneLaunchPos],
    buildingPosition: buildingPos,
    update: (_time: number) => {
      // Dynamic light update if needed
    },
  };
}
