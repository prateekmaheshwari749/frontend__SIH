import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const DEPTH_LEVELS = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000];

// Depth profile metadata
interface DepthInfo {
  depth: number;
  temp: number; // °C
  salinity: number; // PSU
  pressure: number; // dbar
  zone: string;
  color: string;
  desc: string;
}

const DEPTH_DATA: Record<number, DepthInfo> = {
  0: { depth: 0, temp: 29.8, salinity: 34.2, pressure: 0, zone: 'Sea Surface (Epipelagic)', color: '#ef4444', desc: 'Direct satellite infrared SST observation' },
  5: { depth: 5, temp: 29.7, salinity: 34.3, pressure: 5, zone: 'Near-surface Layer', color: '#f87171', desc: 'Solar heating absorption zone' },
  10: { depth: 10, temp: 29.5, salinity: 34.4, pressure: 10, zone: 'Upper Mixed Layer', color: '#fb923c', desc: 'Wind stress turbulence mixing' },
  20: { depth: 20, temp: 29.1, salinity: 34.5, pressure: 20, zone: 'Upper Mixed Layer', color: '#f97316', desc: 'Uniform thermal layer' },
  30: { depth: 30, temp: 28.6, salinity: 34.8, pressure: 30, zone: 'Base of Mixed Layer', color: '#ea580c', desc: 'Cyclone fuel energy reservoir' },
  50: { depth: 50, temp: 26.8, salinity: 35.1, pressure: 50, zone: 'Upper Thermocline', color: '#fbbf24', desc: 'Inception of thermal gradient' },
  75: { depth: 75, temp: 23.4, salinity: 35.4, pressure: 75, zone: 'Thermocline Core', color: '#eab308', desc: 'Steepest temperature drop' },
  100: { depth: 100, temp: 20.1, salinity: 35.6, pressure: 100, zone: 'Thermocline Core', color: '#14b8a6', desc: 'Internal wave oscillation zone' },
  125: { depth: 125, temp: 17.5, salinity: 35.5, pressure: 125, zone: 'Lower Thermocline', color: '#06b6d4', desc: 'Eddy displacement boundary' },
  150: { depth: 150, temp: 15.2, salinity: 35.3, pressure: 150, zone: 'Lower Thermocline', color: '#0ea5e9', desc: 'Transition to twilight zone' },
  200: { depth: 200, temp: 13.0, salinity: 35.2, pressure: 200, zone: 'Mesopelagic (Twilight)', color: '#0284c7', desc: 'Sunlight extinction limit (<1%)' },
  300: { depth: 300, temp: 10.8, salinity: 35.0, pressure: 300, zone: 'Mesopelagic (Twilight)', color: '#2563eb', desc: 'Diel vertical migration depth' },
  500: { depth: 500, temp: 8.2, salinity: 34.9, pressure: 500, zone: 'Oxygen Minimum Zone', color: '#3b82f6', desc: 'High biological nutrient density' },
  700: { depth: 700, temp: 6.1, salinity: 34.8, pressure: 700, zone: 'Deep Ocean Transition', color: '#6366f1', desc: 'Subantarctic mode water influence' },
  1000: { depth: 1000, temp: 4.8, salinity: 34.7, pressure: 1000, zone: 'Bathypelagic (Abyss)', color: '#4338ca', desc: 'Centuries-old deep abyssal water' },
};

// Map depth to Y coordinate: 0m -> +1.8, 1000m -> -1.8
function depthToY(depth: number): number {
  return 1.8 - (depth / 1000) * 3.6;
}

export default function SubsurfaceColumn3D({
  onSelectDepth,
}: {
  onSelectDepth?: (depth: number | null) => void;
}) {
  const [hoveredDepth, setHoveredDepth] = useState<number | null>(100);
  const floatRef = useRef<THREE.Group>(null);
  const surfaceWaveRef = useRef<THREE.Mesh>(null);

  // Animate surface waves and drifting ARGO CTD float
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Surface wave displacement
    if (surfaceWaveRef.current) {
      surfaceWaveRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    }

    // ARGO profiling float ascending & descending cycle
    if (floatRef.current) {
      // Periodic cycle: ~24s full cycle between 0m (y=1.8) and 1000m (y=-1.8)
      const cycle = (Math.sin(t * 0.26) + 1) / 2; // 0 to 1
      const y = -1.8 + cycle * 3.6;
      floatRef.current.position.y = y;
      floatRef.current.rotation.y += 0.015;
    }
  });

  return (
    <group rotation={[0.15, -0.35, 0]}>
      {/* ── Top Sea Surface Wave Mesh ── */}
      <group position={[0, 1.95, 0]}>
        <mesh ref={surfaceWaveRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 2.6, 24, 24]} />
          <meshStandardMaterial
            color="#0ea5e9"
            roughness={0.1}
            metalness={0.8}
            transparent
            opacity={0.65}
            wireframe={false}
          />
        </mesh>

        {/* Sea Surface Wireframe Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[3.6, 2.6, 12, 8]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.25} />
        </mesh>
      </group>

      {/* ── Depth Column Backbone Guide Rails ── */}
      {[-1.8, 1.8].map((x) =>
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0, z]}>
            <cylinderGeometry args={[0.008, 0.008, 3.8, 8]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} />
          </mesh>
        ))
      )}

      {/* ── 15 Depth Level Slabs ── */}
      {DEPTH_LEVELS.map((depth, idx) => {
        const info = DEPTH_DATA[depth];
        const y = depthToY(depth);
        const isHovered = hoveredDepth === depth;
        const dz = idx < DEPTH_LEVELS.length - 1 ? DEPTH_LEVELS[idx + 1] - depth : 50;
        const slabThickness = Math.max(0.04, Math.min((dz / 1000) * 3.6 * 0.75, 0.22));

        return (
          <group key={depth} position={[0, y, 0]}>
            {/* Slab mesh */}
            <mesh
              scale={isHovered ? [1.06, 1.25, 1.06] : [1, 1, 1]}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredDepth(depth);
                onSelectDepth?.(depth);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredDepth(depth);
                onSelectDepth?.(depth);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <boxGeometry args={[3.4, slabThickness, 2.4]} />
              <meshStandardMaterial
                color={info.color}
                roughness={0.2}
                metalness={0.4}
                transparent
                opacity={isHovered ? 0.75 : 0.32}
                emissive={info.color}
                emissiveIntensity={isHovered ? 0.6 : 0.15}
              />
            </mesh>

            {/* Glowing boundary line */}
            <mesh scale={isHovered ? [1.07, 1, 1.07] : [1.01, 1, 1.01]}>
              <boxGeometry args={[3.42, slabThickness + 0.01, 2.42]} />
              <meshBasicMaterial
                color={info.color}
                wireframe
                transparent
                opacity={isHovered ? 0.9 : 0.2}
              />
            </mesh>

            {/* Depth tag on the right side */}
            <Html distanceFactor={5.5} position={[2.1, 0, 0]} center>
              <button
                onClick={() => {
                  setHoveredDepth(depth);
                  onSelectDepth?.(depth);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  background: isHovered ? info.color : 'rgba(2, 12, 24, 0.75)',
                  color: isHovered ? '#000' : info.color,
                  border: `1px solid ${info.color}66`,
                  boxShadow: isHovered ? `0 0 14px ${info.color}` : 'none',
                }}
              >
                {depth}m
              </button>
            </Html>

            {/* Detailed hover card for active slab */}
            {isHovered && (
              <Html distanceFactor={5.5} position={[-2.4, 0, 0]} center>
                <div
                  className="p-3.5 rounded-xl text-left pointer-events-auto backdrop-blur-md whitespace-nowrap shadow-2xl"
                  style={{
                    background: 'rgba(2, 15, 30, 0.92)',
                    border: `1px solid ${info.color}`,
                    boxShadow: `0 0 25px ${info.color}44`,
                    color: '#e2e8f0',
                    fontSize: '11px',
                    minWidth: '230px',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                    <span className="font-mono font-bold text-sm" style={{ color: info.color }}>
                      Depth {depth} m
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono">
                      {info.pressure} dbar
                    </span>
                  </div>

                  <p className="text-[10px] text-white/70 mb-2 font-medium">{info.zone}</p>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] mb-2">
                    <div className="bg-black/30 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">TEMPERATURE</span>
                      <span className="text-base font-black" style={{ color: info.color }}>
                        {info.temp.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="bg-black/30 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">SALINITY</span>
                      <span className="text-base font-black text-cyan-300">
                        {info.salinity.toFixed(1)} PSU
                      </span>
                    </div>
                  </div>

                  <p className="text-[9px] text-white/50 border-t border-white/10 pt-1.5 italic">
                    {info.desc}
                  </p>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* ── Thermocline Barrier Plane (at 100m) ── */}
      <group position={[0, depthToY(100), 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 2.8]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── Autonomous Robotic ARGO CTD Profiling Float ── */}
      <group ref={floatRef} position={[0, 0, 0]}>
        {/* Float body cylinder */}
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.35, 16]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* CTD Sensor Ring Cap */}
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>

        {/* Satellite Antenna */}
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Pulsing Sonar Pings */}
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.22, 24]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>

        {/* Float Label */}
        <Html distanceFactor={5.5} position={[0, -0.32, 0]} center>
          <div className="px-2 py-0.5 rounded bg-amber-500/90 text-black font-black text-[9px] whitespace-nowrap shadow-lg">
            ARGO PROFILER (0–1000m)
          </div>
        </Html>
      </group>

      {/* ── Ambient Volumetric Current Particles (Marine Snow / Eddies) ── */}
      <VolumetricCurrentParticles />
    </group>
  );
}

// Particle field flowing down through the water column
function VolumetricCurrentParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 180;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;

      // Color from warm surface (y > 0) to cold deep (y < 0)
      const normY = (pos[i * 3 + 1] + 1.8) / 3.6; // 0 to 1
      cols[i * 3] = THREE.MathUtils.lerp(0.1, 0.95, normY);
      cols[i * 3 + 1] = THREE.MathUtils.lerp(0.4, 0.6, normY);
      cols[i * 3 + 2] = THREE.MathUtils.lerp(0.95, 0.2, normY);
    }

    return [pos, cols];
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Gentle eddy swirl
      array[i * 3] += Math.sin(array[i * 3 + 1] * 2 + delta) * 0.003;
      array[i * 3 + 1] -= delta * 0.12; // slow downward current
      if (array[i * 3 + 1] < -1.8) {
        array[i * 3 + 1] = 1.8;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
