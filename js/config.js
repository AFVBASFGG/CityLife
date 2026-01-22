export const CONFIG = {
  gridW: 28,
  gridH: 28,

  tileW: 62,
  tileH: 34,

  // Camera
  zoomMin: 0.55,
  zoomMax: 1.75,

  // Simulation tuning
  influenceFalloff: 7.5,      // larger = influence reaches farther
  influenceThreshold: 0.08,   // graph edges only if weight >= this
  tickMs: 250,                // simulation tick (HUD updates)

  // If road distance > this, treat influence as negligible
  maxUsefulDistance: 28,

  // Aesthetic: rotation steps
  rotations: [0, 1, 2, 3], // 0..3 = 0/90/180/270

  // OBJ sprite overrides (generated in assets/obj-sprites)
  buildingSprites: {
    house: { src: "assets/glb-sprites/house.png", scale: 0.6, xOffset: 0, yOffset: -2, tint: false },
    school: { src: "assets/glb-sprites/university.png", scale: 0.62, xOffset: 0, yOffset: -4, tint: false },
    office: { src: "assets/glb-sprites/office.png", scale: 0.65, xOffset: 0, yOffset: -6, tint: false },
    factory: { src: "assets/glb-sprites/factory.png", scale: 0.62, xOffset: 0, yOffset: -4, tint: false },
    hospital: { src: "assets/glb-sprites/hospital.png", scale: 0.62, xOffset: 0, yOffset: -4, tint: false },
    mall: { src: "assets/glb-sprites/mall.png", scale: 0.62, xOffset: 0, yOffset: -4, tint: false },
  },
};
