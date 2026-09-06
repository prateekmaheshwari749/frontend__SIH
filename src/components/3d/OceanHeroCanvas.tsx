import { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
  Globe,
  Layers,
  Waves,
  RotateCcw,
  Compass,
  Radio,
  Maximize2,
} from 'lucide-react';
import HolographicGlobe, { type ArgoFloat } from './HolographicGlobe';
import SubsurfaceColumn3D from './SubsurfaceColumn3D';

type ViewMode = 'globe' | 'subsurface' | 'waves';

// ── 3D Dynamic Ocean Fluid Waves Mode ──────────────────────────────────────────
function OceanWaveFluid() {
  const meshRef = useRef<THREE.Mesh>(null);
  const buoyRef = useRef<THREE.Group>(null);

  // Procedural wave mesh vertex animation
  const geom = useRef<THREE.PlaneGeometry>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (geom.current) {
      const pos = geom.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z =
          Math.sin(u * 1.5 + t * 1.8) * 0.16 +
          Math.cos(v * 1.2 + t * 1.4) * 0.12 +
          Math.sin((u + v) * 0.8 + t * 2.2) * 0.08;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      geom.current.computeVertexNormals();
    }

    // Rocking buoy calculation
    if (buoyRef.current) {
      const buoyZ = Math.sin(t * 1.8) * 0.16 + Math.cos(t * 1.4) * 0.12;
      buoyRef.current.position.y = buoyZ + 0.1;
      buoyRef.current.rotation.z = Math.sin(t * 1.6) * 0.12;
      buoyRef.current.rotation.x = Math.cos(t * 1.3) * 0.1;
    }
  });

  return (
    <group rotation={[-Math.PI / 3, 0, 0.2]}>
      {/* ── Surface Water Mesh ── */}
      <mesh ref={meshRef} receiveShadow>
        <planeGeometry ref={geom} args={[5.5, 4.5, 48, 48]} />
        <meshStandardMaterial
          color="#0369a1"
          roughness={0.15}
          metalness={0.7}
          transparent
          opacity={0.82}
          wireframe={false}
          emissive="#083344"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* ── Surface Wireframe Caustics Grid ── */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[5.5, 4.5, 24, 20]} />
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.18} />
      </mesh>

      {/* ── Floating Oceanographic Buoy ── */}
      <group ref={buoyRef} position={[0.4, 0.2, 0]}>
        {/* Yellow Float Hull */}
        <mesh>
          <cylinderGeometry args={[0.22, 0.15, 0.14, 16]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* Mast */}
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.35, 8]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        {/* Radar & Weather Sensors */}
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        {/* Pulsing Sonar Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.25, 0.38, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── Subsurface Bathymetric Grid Bed ── */}
      <mesh position={[0, 0, -1.2]}>
        <planeGeometry args={[6.0, 5.0, 16, 16]} />
        <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

// ── Master Hero Canvas Component ───────────────────────────────────────────────
export default function OceanHeroCanvas() {
  const [mode, setMode] = useState<ViewMode>('globe');
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<number | null>(null);
  const controlsRef = useRef<any>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[620px] lg:h-[680px] rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-b from-[#020d1c]/90 via-[#010915] to-[#01060f] shadow-[0_0_50px_rgba(6,182,212,0.12)]">
      {/* ── Canvas Background Nebula Glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.14), rgba(3, 105, 161, 0.05) 50%, transparent 75%)',
        }}
      />

      {/* ── Top Bar HUD: Mode Switcher & Status ── */}
      <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mode Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#021327]/80 backdrop-blur-xl border border-cyan-500/25 pointer-events-auto shadow-xl">
          <button
            onClick={() => setMode('globe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'globe'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe size={14} className={mode === 'globe' ? 'animate-spin-slow' : ''} />
            <span>Satellite & Globe</span>
          </button>

          <button
            onClick={() => setMode('subsurface')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'subsurface'
                ? 'bg-gradient-to-r from-amber-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>15 Depth Layers</span>
          </button>

          <button
            onClick={() => setMode('waves')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              mode === 'waves'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Waves size={14} />
            <span>Ocean Fluid</span>
          </button>
        </div>

        {/* Right: Telemetry pill & controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live Ping Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#021429]/70 backdrop-blur-md border border-cyan-500/20 text-[11px] font-mono text-cyan-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>LIVE 3D TWIN</span>
          </div>

          {/* Auto-rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Rotation' : 'Enable Auto-Rotation'}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
              autoRotate
                ? 'bg-cyan-950/60 border-cyan-400/40 text-cyan-300'
                : 'bg-black/40 border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Compass size={14} className={autoRotate ? 'animate-spin-slow' : ''} />
          </button>

          {/* Reset Camera */}
          <button
            onClick={resetCamera}
            title="Reset Camera View"
            className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Bottom HUD Status Bar ── */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mode context info */}
        <div className="p-2.5 px-3.5 rounded-2xl bg-[#021327]/85 backdrop-blur-md border border-cyan-500/20 pointer-events-auto max-w-sm text-left shadow-xl">
          {mode === 'globe' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Radio size={12} className="text-cyan-400 animate-pulse" />
                <span>North Indian Ocean Constellation</span>
              </div>
              <p className="text-[10px] text-white/60 leading-tight">
                4 Satellites beaming IR SST & SSH altimetry. Click glowing ARGO buoys to inspect subsurface profiles.
              </p>
            </div>
          )}

          {mode === 'subsurface' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Layers size={12} className="text-amber-400" />
                <span>15 Depth Levels (0m → 1000m)</span>
              </div>
              <p className="text-[10px] text-white/60 leading-tight">
                Hover or click depth slabs to examine thermocline stratification and CTD profiler telemetry.
              </p>
            </div>
          )}

          {mode === 'waves' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                <Waves size={12} className="text-blue-400" />
                <span>Dynamic Ocean Fluid Simulation</span>
              </div>
              <p className="text-[10px] text-white/60 leading-tight">
                Procedural surface wave mesh with mooring buoy telemetry and bottom bathymetry contouring.
              </p>
            </div>
          )}
        </div>

        {/* Right: Quick Telemetry Stats */}
        <div className="hidden md:flex items-center gap-3 p-2 px-3 rounded-2xl bg-[#021327]/85 backdrop-blur-md border border-cyan-500/20 pointer-events-auto text-[10px] font-mono text-white/70 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">SATELLITES:</span>
            <span className="text-cyan-400 font-bold">4 ACTIVE</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">ARGO:</span>
            <span className="text-emerald-400 font-bold">
              {selectedFloat ? selectedFloat.id : '8 TRANSMITTING'}
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">DEPTH:</span>
            <span className="text-amber-300 font-bold">
              {selectedDepth !== null ? `${selectedDepth}m SELECTED` : '0–1000m'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Interactive Hint Pill ── */}
      <div className="absolute bottom-16 right-4 z-10 hidden sm:flex items-center gap-1.5 text-[10px] text-white/35 font-mono pointer-events-none">
        <Maximize2 size={11} />
        <span>Drag to rotate · Scroll to zoom</span>
      </div>

      {/* ── Three.js WebGL Canvas ── */}
      <Canvas
        camera={{ position: [0, 0.8, 5.0], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 4]} intensity={1.4} color="#f0f9ff" />
        <directionalLight position={[-6, -4, -4]} intensity={0.5} color="#0284c7" />
        <pointLight position={[0, 4, 2]} intensity={0.8} color="#38bdf8" />

        {/* Starfield backdrop */}
        <Stars radius={40} depth={30} count={1200} factor={3} saturation={0.5} fade speed={1} />

        <Suspense fallback={null}>
          {mode === 'globe' && (
            <HolographicGlobe onSelectFloat={(f) => setSelectedFloat(f)} />
          )}

          {mode === 'subsurface' && (
            <SubsurfaceColumn3D onSelectDepth={(d) => setSelectedDepth(d)} />
          )}

          {mode === 'waves' && <OceanWaveFluid />}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          minDistance={3.2}
          maxDistance={8.5}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
