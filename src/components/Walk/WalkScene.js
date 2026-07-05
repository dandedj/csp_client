import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import createTextureLRU from '../../utils/textureLru';
import { nearestPointOnPath } from '../../utils/geo3d';

// ---- Scene tuning (metres / radians / seconds) --------------------------
const EYE_HEIGHT = 1.6;
const MANUAL_SPEED = 1.8; // m/s while a walk button / key is held
const AUTO_SPEED = 1.2; // m/s while auto-walk is on
const LOOK_SENS = 0.0026; // radians per pixel of drag
const PITCH_MAX = (55 * Math.PI) / 180;
const DRAG_THRESHOLD = 6; // px of travel before a press stops counting as a tap
const WHEEL_STEP = 0.01; // fraction of the path per wheel notch
const QUAD_WIDTH = 0.35;
const DEFAULT_HEIGHT = 0.22;
const MOUNT_Y = 1.05; // centre height of the plaque quad on its post
const HOVER_LIFT = 0.05;
const LOAD_RADIUS = 45; // start texturing within this distance
const UNLOAD_RADIUS = 55; // drop the texture past this distance (hysteresis)
const TEXTURE_INTERVAL = 12; // frames between texture passes
const MAX_LOADS_PER_TICK = 4;
const TEXTURE_BUDGET = 64;
const RIBBON_WIDTH = 1.8;
const CURVE_SAMPLES = 200;

// ---- Palette (harmonised with brand.css) --------------------------------
const SKY = 0xe9e4f2; // pale lavender-white, also the fog colour
const GROUND_GREEN = 0x7d9468; // desaturated moss
const RIBBON_TAN = 0xcdb891;
const POST_DARK = 0x2b2b2b;
const PLAQUE_PURPLE = 0x542989;
const HOVER_LAVENDER = 0xa67bda;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Build a flat ribbon mesh following the curve, a fixed width, laid on the
 * ground plane. Two vertices per sample (left/right of the tangent) stitched
 * into a triangle strip.
 */
function buildRibbonGeometry(curve, width, segments) {
  const half = width / 2;
  const points = curve.getSpacedPoints(segments);
  const positions = [];
  const tangent = new THREE.Vector3();
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    tangent.set(after.x - before.x, 0, after.z - before.z).normalize();
    // Perpendicular to the tangent within the ground plane.
    const px = tangent.z;
    const pz = -tangent.x;
    positions.push(point.x + px * half, 0, point.z + pz * half);
    positions.push(point.x - px * half, 0, point.z - pz * half);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const indices = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={[SKY, GROUND_GREEN, 2.2]} />
      <directionalLight position={[40, 60, 20]} intensity={2.4} color={0xfff4e0} />
      <ambientLight intensity={0.35} />
    </>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
      <planeGeometry args={[2000, 2000]} />
      <meshLambertMaterial color={GROUND_GREEN} />
    </mesh>
  );
}

function PathRibbon({ curve }) {
  const geometry = useMemo(
    () => buildRibbonGeometry(curve, RIBBON_WIDTH, CURVE_SAMPLES),
    [curve]
  );
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ color: RIBBON_TAN, side: THREE.DoubleSide }),
    []
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  // Sit a hair above the ground plane to avoid z-fighting.
  return <mesh geometry={geometry} material={material} position={[0, 0.02, 0]} />;
}

/**
 * The field of standing plaques. Each is a shared post + a thin quad that
 * starts as a shared brand-purple placeholder and swaps to a cloned,
 * textured material once the camera comes within LOAD_RADIUS. Textures are
 * bounded by an LRU that disposes on eviction. Everything is driven
 * imperatively from a single throttled frame loop — no per-plaque React state
 * and no per-frame allocation.
 */
function PlaqueField({ placements, curveSamples, selectablesRef }) {
  const { camera, gl } = useThree();

  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const postGeometry = useMemo(() => new THREE.CylinderGeometry(0.02, 0.02, 1, 6), []);
  const placeholderMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PLAQUE_PURPLE }),
    []
  );
  const postMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: POST_DARK, roughness: 0.85, metalness: 0.1 }),
    []
  );
  const texturedBase = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffffff }), []);

  const loader = useMemo(() => {
    const instance = new THREE.TextureLoader();
    instance.crossOrigin = 'anonymous';
    return instance;
  }, []);
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  // Orient every plaque toward the nearest point on the walking path.
  const built = useMemo(
    () =>
      placements.map((placement) => {
        const near = nearestPointOnPath(curveSamples, placement.x, placement.z);
        const facing = Math.atan2(near.x - placement.x, near.z - placement.z);
        return { ...placement, facing };
      }),
    [placements, curveSamples]
  );

  const quadRefs = useRef([]);
  const runtime = useRef([]);
  if (runtime.current.length !== built.length) {
    runtime.current = built.map(() => ({ textured: false, loading: false }));
  }

  const lru = useMemo(
    () =>
      createTextureLRU(TEXTURE_BUDGET, (entry) => {
        if (entry && entry.revert) {
          entry.revert();
        }
      }),
    []
  );

  const loadTexture = (placement, index) => {
    loader.load(
      placement.url,
      (texture) => {
        const state = runtime.current[index];
        const mesh = quadRefs.current[index];
        if (state) {
          state.loading = false;
        }
        if (!mesh || !state) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        const material = texturedBase.clone();
        material.map = texture;
        material.needsUpdate = true;
        mesh.material = material;
        const image = texture.image;
        const aspect = image && image.width ? image.height / image.width : DEFAULT_HEIGHT / QUAD_WIDTH;
        mesh.scale.set(QUAD_WIDTH, QUAD_WIDTH * aspect, 1);
        state.textured = true;
        lru.set(placement.id, {
          revert: () => {
            const revertMesh = quadRefs.current[index];
            const revertState = runtime.current[index];
            if (revertMesh) {
              revertMesh.material = placeholderMaterial;
              revertMesh.scale.set(QUAD_WIDTH, DEFAULT_HEIGHT, 1);
              revertMesh.position.y = revertMesh.userData.baseY;
            }
            if (revertState) {
              revertState.textured = false;
            }
            material.dispose();
            texture.dispose();
          }
        });
      },
      undefined,
      (error) => {
        const state = runtime.current[index];
        if (state) {
          state.loading = false;
          state.failed = true;
        }
        console.error('Failed to load plaque texture', placement.id, error);
      }
    );
  };

  const frame = useRef(0);
  useFrame(() => {
    frame.current += 1;
    if (frame.current % TEXTURE_INTERVAL !== 0) {
      return;
    }
    let loadsThisTick = 0;
    for (let i = 0; i < built.length; i += 1) {
      const placement = built[i];
      const state = runtime.current[i];
      if (!state) {
        continue;
      }
      const dx = camera.position.x - placement.x;
      const dz = camera.position.z - placement.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= LOAD_RADIUS) {
        if (state.textured) {
          lru.get(placement.id); // refresh recency
        } else if (
          !state.loading &&
          !state.failed &&
          placement.url &&
          loadsThisTick < MAX_LOADS_PER_TICK
        ) {
          state.loading = true;
          loadsThisTick += 1;
          loadTexture(placement, i);
        }
      } else if (distance > UNLOAD_RADIUS && state.textured) {
        lru.delete(placement.id); // → revert() via eviction hook
      }
    }
  });

  // Publish the selectable quad meshes for the raycaster once they mount.
  useEffect(() => {
    selectablesRef.current = quadRefs.current.filter(Boolean);
  }, [built, selectablesRef]);

  useEffect(
    () => () => {
      lru.clear();
      planeGeometry.dispose();
      postGeometry.dispose();
      placeholderMaterial.dispose();
      postMaterial.dispose();
      texturedBase.dispose();
    },
    [lru, planeGeometry, postGeometry, placeholderMaterial, postMaterial, texturedBase]
  );

  return (
    <group>
      {built.map((placement, index) => (
        <group key={placement.id} position={[placement.x, 0, placement.z]} rotation={[0, placement.facing, 0]}>
          <mesh
            geometry={postGeometry}
            material={postMaterial}
            position={[0, MOUNT_Y / 2, 0]}
            scale={[1, MOUNT_Y, 1]}
          />
          <mesh
            ref={(mesh) => {
              quadRefs.current[index] = mesh;
              if (mesh) {
                mesh.userData = { placement, baseY: MOUNT_Y };
              }
            }}
            geometry={planeGeometry}
            material={placeholderMaterial}
            position={[0, MOUNT_Y, 0]}
            scale={[QUAD_WIDTH, DEFAULT_HEIGHT, 1]}
          />
        </group>
      ))}
    </group>
  );
}

/** Rides the curve, blending the path tangent with user yaw/pitch. */
function CameraRig({ curve, pathLength, controlsRef, progressRef }) {
  const { camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const point = useRef(new THREE.Vector3());
  const tangent = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const dt = Math.min(delta, 0.1); // guard against tab-switch spikes
    let velocity = (controls.forward - controls.back) * MANUAL_SPEED;
    if (controls.autoWalk) {
      velocity += AUTO_SPEED;
    }
    if (velocity !== 0 && pathLength > 0) {
      controls.t = clamp(controls.t + (velocity * dt) / pathLength, 0, 1);
    }

    curve.getPointAt(controls.t, point.current);
    camera.position.set(point.current.x, EYE_HEIGHT, point.current.z);

    curve.getTangentAt(controls.t, tangent.current);
    const yaw = Math.atan2(tangent.current.x, tangent.current.z) + controls.yaw;
    const cosPitch = Math.cos(controls.pitch);
    forward.current.set(
      Math.sin(yaw) * cosPitch,
      Math.sin(controls.pitch),
      Math.cos(yaw) * cosPitch
    );
    target.current.copy(camera.position).add(forward.current);
    camera.lookAt(target.current);

    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${controls.t})`;
    }
  });

  return null;
}

/**
 * All pointer / wheel / keyboard input in one place so look-drag and
 * tap-to-select never fight over the same events. Hover and selection raycast
 * against the plaque quads; look-drag writes yaw/pitch; wheel and keys drive
 * movement.
 */
function WalkControls({ controlsRef, selectablesRef, onSelect }) {
  const { gl, camera } = useThree();

  useEffect(() => {
    const element = gl.domElement;
    const controls = controlsRef.current;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let hovered = null;

    const applyHover = (mesh, on) => {
      if (!mesh) {
        return;
      }
      const baseY = mesh.userData.baseY ?? mesh.position.y;
      mesh.position.y = baseY + (on ? HOVER_LIFT : 0);
      const material = mesh.material;
      if (material && material.emissive) {
        material.emissive.setHex(on ? HOVER_LAVENDER : 0x000000);
        material.emissiveIntensity = on ? 0.35 : 0;
      }
    };

    const setHover = (mesh) => {
      if (hovered === mesh) {
        return;
      }
      applyHover(hovered, false);
      hovered = mesh;
      applyHover(hovered, true);
      element.style.cursor = hovered ? 'pointer' : dragging ? 'grabbing' : 'grab';
    };

    const pick = (clientX, clientY) => {
      const rect = element.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(selectablesRef.current, false);
      return hits.length ? hits[0].object : null;
    };

    const onPointerDown = (event) => {
      dragging = true;
      moved = false;
      lastX = downX = event.clientX;
      lastY = downY = event.clientY;
      if (element.setPointerCapture) {
        element.setPointerCapture(event.pointerId);
      }
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (event) => {
      if (!dragging) {
        if (event.pointerType === 'mouse') {
          setHover(pick(event.clientX, event.clientY));
        }
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      controls.yaw -= dx * LOOK_SENS;
      controls.pitch = clamp(controls.pitch - dy * LOOK_SENS, -PITCH_MAX, PITCH_MAX);
      if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > DRAG_THRESHOLD) {
        moved = true;
      }
    };

    const onPointerUp = (event) => {
      if (element.releasePointerCapture) {
        element.releasePointerCapture(event.pointerId);
      }
      const wasDragging = dragging;
      dragging = false;
      element.style.cursor = hovered ? 'pointer' : 'grab';
      if (wasDragging && !moved) {
        const mesh = pick(event.clientX, event.clientY);
        if (mesh && mesh.userData.placement) {
          onSelect(mesh.userData.placement);
        }
      }
    };

    const onPointerLeave = () => setHover(null);

    const onWheel = (event) => {
      event.preventDefault();
      const step = event.deltaY > 0 ? -WHEEL_STEP : WHEEL_STEP;
      controls.t = clamp(controls.t + step, 0, 1);
    };

    const setKey = (event, down) => {
      switch (event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
          controls.forward = down ? 1 : 0;
          break;
        case 's':
        case 'S':
        case 'ArrowDown':
          controls.back = down ? 1 : 0;
          break;
        default:
          return;
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
      }
    };

    const onKeyDown = (event) => setKey(event, true);
    const onKeyUp = (event) => setKey(event, false);

    element.style.cursor = 'grab';
    element.style.touchAction = 'none';
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointerleave', onPointerLeave);
    element.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointerleave', onPointerLeave);
      element.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl, camera, controlsRef, selectablesRef, onSelect]);

  return null;
}

function SceneContents({ pathLocal, placements, controlsRef, progressRef, onSelect }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        pathLocal.map((p) => new THREE.Vector3(p.x, 0, p.z)),
        false,
        'catmullrom',
        0.5
      ),
    [pathLocal]
  );
  const curveSamples = useMemo(() => curve.getSpacedPoints(CURVE_SAMPLES), [curve]);
  const pathLength = useMemo(() => curve.getLength(), [curve]);
  const selectablesRef = useRef([]);

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 35, 90]} />
      <Lights />
      <Ground />
      <PathRibbon curve={curve} />
      <PlaqueField placements={placements} curveSamples={curveSamples} selectablesRef={selectablesRef} />
      <CameraRig curve={curve} pathLength={pathLength} controlsRef={controlsRef} progressRef={progressRef} />
      <WalkControls controlsRef={controlsRef} selectablesRef={selectablesRef} onSelect={onSelect} />
    </>
  );
}

/**
 * The WebGL canvas for the walk. Receives already-projected local coordinates
 * (see geo3d.js) plus shared mutable refs the DOM HUD writes into.
 */
export default function WalkScene({ pathLocal, placements, controlsRef, progressRef, onSelect, onCanvasReady }) {
  return (
    <Canvas
      className="walk__canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.1, far: 200, position: [0, EYE_HEIGHT, 0] }}
      onCreated={onCanvasReady}
    >
      <SceneContents
        pathLocal={pathLocal}
        placements={placements}
        controlsRef={controlsRef}
        progressRef={progressRef}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
