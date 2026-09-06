import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DepthZoneCanvasProps {
  zoneId: string;
  color: string;
}

// ── 1. Surface Zone 3D Visualizer ─────────────────────────────────────────────
function SurfaceScene({ color }: { color: string }) {
  const waveGeom = useRef<THREE.PlaneGeometry>(null);
  const buoyGroup = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (waveGeom.current) {
      const pos = waveGeom.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z =
          Math.sin(u * 2 + t * 2.2) * 0.12 +
          Math.cos(v * 1.6 + t * 1.8) * 0.09;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      waveGeom.current.computeVertexNormals();
    }

    if (buoyGroup.current) {
      buoyGroup.current.position.y = Math.sin(t * 2.2) * 0.1 + 0.15;
      buoyGroup.current.rotation.z = Math.sin(t * 2.0) * 0.15;
    }

    if (beamRef.current) {
      beamRef.current.position.x = Math.sin(t * 0.8) * 1.2;
    }
  });

  return (
    <group rotation={[-Math.PI / 3.2, 0, 0]}>
      {/* Dynamic Sea Surface */}
      <mesh receiveShadow>
        <planeGeometry ref={waveGeom} args={[4.2, 3.2, 32, 28]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Surface Wireframe */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[4.2, 3.2, 16, 14]} />
        <meshBasicMaterial color="#fff" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Rocking ARGO Surface Buoy */}
      <group ref={buoyGroup} position={[0, 0.1, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.1, 0.12, 16]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {/* Sonar Beacon Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.2, 0.32, 20]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Sweeping Satellite Laser Scan */}
      <mesh ref={beamRef} position={[0, 1.2, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.35, 2.4, 16, 1, true]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ── 2. Mixed Layer Zone 3D Visualizer (Wind-driven Vortex & Eddies) ───────────
function MixedLayerScene({ color }: { color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 350;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 0.3 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 1.2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      let x = arr[i * 3];
      let z = arr[i * 3 + 2];
      const radius = Math.sqrt(x * x + z * z);
      const angle = Math.atan2(z, x) + (delta * (1.8 / Math.max(radius, 0.4)));

      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    posAttr.needsUpdate = true;

    // Gentle global tilt oscillation
    pointsRef.current.rotation.y += delta * 0.2;
  });

  return (
    <group rotation={[0.4, 0, 0]}>
      {/* Vortex Core Helix rings */}
      {[0.4, 0.8, 1.2].map((r, idx) => (
        <mesh key={idx} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.4 + idx * 0.4, 0]}>
          <ringGeometry args={[r - 0.02, r + 0.02, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Swirling Eddy Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          color={color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Center Wind Shear Vector Indicator */}
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.25, 12]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  );
}

// ── 3. Thermocline Zone 3D Visualizer (Sharp Density & Thermal Plunge) ─────────
function ThermoclineScene({ color }: { color: string }) {
  const topLayerRef = useRef<THREE.Mesh>(null);
  const bottomLayerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (topLayerRef.current && bottomLayerRef.current) {
      topLayerRef.current.rotation.z = Math.sin(t * 1.5) * 0.05;
      bottomLayerRef.current.rotation.z = -Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group rotation={[0.2, -0.4, 0]}>
      {/* Warm Epipelagic Top Slab */}
      <mesh ref={topLayerRef} position={[0, 0.45, 0]}>
        <boxGeometry args={[3.0, 0.35, 2.0]} />
        <meshStandardMaterial
          color="#f97316"
          transparent
          opacity={0.55}
          metalness={0.4}
          roughness={0.2}
          emissive="#f97316"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Sharp Thermocline Gradient Interface */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.12, 2.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} wireframe />
      </mesh>

      {/* Cold Deep Ocean Bottom Slab */}
      <mesh ref={bottomLayerRef} position={[0, -0.45, 0]}>
        <boxGeometry args={[3.0, 0.35, 2.0]} />
        <meshStandardMaterial
          color="#0284c7"
          transparent
          opacity={0.55}
          metalness={0.4}
          roughness={0.2}
          emissive="#0284c7"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Internal Wave Oscillation Ribbons */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.015, 0.015, 0.9, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ── 4. Mesopelagic / Twilight Zone 3D Visualizer (Bioluminescence) ─────────────
function MesopelagicScene({ color }: { color: string }) {
  const swarmRef = useRef<THREE.Points>(null);
  const count = 280;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

      // Bioluminescent palette (cyan, emerald, deep blue)
      const choice = Math.random();
      if (choice < 0.6) {
        cols[i * 3] = 0.04; cols[i * 3 + 1] = 0.85; cols[i * 3 + 2] = 0.95; // cyan
      } else if (choice < 0.85) {
        cols[i * 3] = 0.1; cols[i * 3 + 1] = 0.95; cols[i * 3 + 2] = 0.55; // emerald
      } else {
        cols[i * 3] = 0.4; cols[i * 3 + 1] = 0.4; cols[i * 3 + 2] = 1.0; // blue
      }
    }
    return [pos, cols];
  }, []);

  useFrame((state, delta) => {
    if (!swarmRef.current) return;
    const posAttr = swarmRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const t = state.clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * 1.5 + i) * 0.003;
      arr[i * 3 + 1] += Math.cos(t * 1.2 + i * 2) * 0.003;
    }
    posAttr.needsUpdate = true;
    swarmRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group>
      <points ref={swarmRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Floating Deep Sea Creature Silhouette */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.22, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ── 5. Deep Ocean Zone 3D Visualizer (Abyssal Bathymetry & Sonar) ──────────────
function DeepOceanScene({ color }: { color: string }) {
  const sonarRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (sonarRingRef.current) {
      const scale = (t % 2.5) / 2.5; // 0 to 1
      sonarRingRef.current.scale.set(scale * 2.8, scale * 2.8, 1);
      (sonarRingRef.current.material as THREE.Material).opacity = (1 - scale) * 0.6;
    }
  });

  return (
    <group rotation={[-Math.PI / 3.4, 0, 0.1]}>
      {/* Abyssal Trenches Bathymetry Terrain */}
      <mesh receiveShadow position={[0, 0, -0.4]}>
        <planeGeometry args={[4.0, 3.0, 20, 16]} />
        <meshStandardMaterial
          color="#0f172a"
          wireframe
          roughness={0.8}
          metalness={0.2}
          emissive="#0284c7"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Sonar Acoustic Ping Ring */}
      <mesh ref={sonarRingRef} position={[0, 0, -0.1]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Deep-Sea Lander Sensor Node */}
      <group position={[0, 0, 0]}>
        <mesh>
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.25]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
}

// ── Main DepthZoneCanvas Export ────────────────────────────────────────────────
export default function DepthZoneCanvas({ zoneId, color }: DepthZoneCanvasProps) {
  return (
    <div className="relative w-full h-[260px] sm:h-[300px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#020b17] via-[#021327] to-[#010814] shadow-xl">
      {/* Backdrop Ambient Light */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}15, transparent 70%)`,
        }}
      />

      <Canvas
        camera={{ position: [0, 0.4, 3.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 5, 3]} intensity={1.2} color="#fff" />
        <directionalLight position={[-4, -3, -2]} intensity={0.4} color={color} />

        {zoneId === 'surface' && <SurfaceScene color={color} />}
        {zoneId === 'mixed' && <MixedLayerScene color={color} />}
        {zoneId === 'thermocline' && <ThermoclineScene color={color} />}
        {zoneId === 'meso' && <MesopelagicScene color={color} />}
        {zoneId === 'deep' && <DeepOceanScene color={color} />}
      </Canvas>

      {/* Interactive Floating Badge */}
      <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/50 pointer-events-none flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: color }} />
        <span>3D SIMULATION</span>
      </div>
    </div>
  );
}
