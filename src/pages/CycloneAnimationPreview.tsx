import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';

import PageLayout, {
  SectionHeader,
} from '../components/PageLayout';

/* ============================================================
   WATER VORTEX SHADER
============================================================ */

const waterVertexShader = `
  uniform float uTime;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float distanceFromCenter =
      length(pos.xz);

    float wave1 =
      sin(
        distanceFromCenter * 0.055 -
        uTime * 1.25
      );

    float wave2 =
      sin(
        distanceFromCenter * 0.095 +
        uTime * 0.85
      );

    float wave3 =
      sin(
        pos.x * 0.045 +
        pos.z * 0.035 +
        uTime * 1.1
      );

    float vortex =
      sin(
        atan(pos.z, pos.x) * 6.0 +
        distanceFromCenter * 0.025 -
        uTime * 1.4
      );

    float elevation =
      wave1 * 2.8 +
      wave2 * 1.6 +
      wave3 * 1.2 +
      vortex * 1.4;

    float outerFactor =
      smoothstep(
        40.0,
        340.0,
        distanceFromCenter
      );

    elevation *=
      0.65 +
      outerFactor * 0.9;

    pos.y += elevation;

    vElevation = elevation;

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(pos, 1.0);
  }
`;

/* ============================================================
   WATER FRAGMENT SHADER
============================================================ */

const waterFragmentShader = `
  uniform float uTime;

  varying vec2 vUv;
  varying float vElevation;

  float hash(vec2 p) {
    p = fract(
      p * vec2(
        123.34,
        456.21
      )
    );

    p += dot(
      p,
      p + 45.32
    );

    return fract(
      p.x * p.y
    );
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f =
      f *
      f *
      (3.0 - 2.0 * f);

    float a =
      hash(i);

    float b =
      hash(i + vec2(1.0, 0.0));

    float c =
      hash(i + vec2(0.0, 1.0));

    float d =
      hash(i + vec2(1.0, 1.0));

    return mix(
      mix(a, b, f.x),
      mix(c, d, f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for(int i = 0; i < 5; i++) {
      value +=
        noise(p) *
        amplitude;

      p *= 2.0;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {

    vec2 uv =
      vUv * 2.0 - 1.0;

    float radius =
      length(uv);

    float angle =
      atan(
        uv.y,
        uv.x
      );

    float swirl =
      1.75 /
      (radius + 0.22);

    float rotatedAngle =
      angle +
      swirl +
      uTime * 0.22;

    vec2 rotated =
      vec2(
        cos(rotatedAngle),
        sin(rotatedAngle)
      ) *
      radius;

    vec2 flowUV =
      rotated * 3.2;

    flowUV.x +=
      uTime * 0.10;

    flowUV.y -=
      uTime * 0.045;

    float largeNoise =
      fbm(flowUV);

    float mediumNoise =
      fbm(
        rotated * 7.0 -
        vec2(
          uTime * 0.16,
          uTime * 0.08
        )
      );

    float fineNoise =
      fbm(
        rotated * 15.0 +
        uTime * 0.12
      );

    float waterPattern =
      largeNoise * 0.58 +
      mediumNoise * 0.30 +
      fineNoise * 0.12;

    float outerDensity =
      smoothstep(
        0.04,
        0.92,
        radius
      );

    /*
     * Organic flowing water.
     * No geometric spiral lines.
     */
    float flow =
      sin(
        waterPattern * 13.0 +
        radius * 8.0 -
        uTime * 1.15
      );

    flow =
      smoothstep(
        0.10,
        0.82,
        flow
      );

    /*
     * Foam regions.
     */
    float foam =
      smoothstep(
        0.57,
        0.78,
        waterPattern
      );

    foam *=
      0.55 +
      outerDensity * 0.7;

    float highlights =
      smoothstep(
        0.62,
        0.88,
        mediumNoise
      );

    /* Ocean palette */

    vec3 deepBlue =
      vec3(
        0.008,
        0.055,
        0.095
      );

    vec3 oceanBlue =
      vec3(
        0.015,
        0.20,
        0.31
      );

    vec3 cyanWater =
      vec3(
        0.055,
        0.43,
        0.58
      );

    vec3 lightWater =
      vec3(
        0.40,
        0.72,
        0.78
      );

    vec3 foamColor =
      vec3(
        0.88,
        0.95,
        0.94
      );

    vec3 color =
      mix(
        deepBlue,
        oceanBlue,
        waterPattern
      );

    color =
      mix(
        color,
        cyanWater,
        highlights * 0.52
      );

    color =
      mix(
        color,
        lightWater,
        flow * 0.22
      );

    color =
      mix(
        color,
        foamColor,
        foam * 0.70
      );

    /*
     * Dark cyclone eye.
     */
    float eye =
      smoothstep(
        0.0,
        0.16,
        radius
      );

    color *=
      0.38 +
      eye * 0.62;

    /*
     * Edge fade.
     */
    float edge =
      1.0 -
      smoothstep(
        0.82,
        1.0,
        radius
      );

    color *=
      0.72 +
      edge * 0.28;

    float alpha =
      edge * 0.96;

    gl_FragColor =
      vec4(
        color,
        alpha
      );
  }
`;

/* ============================================================
   MAIN WATER VORTEX
============================================================ */

function WaterVortex() {
  const materialRef =
    useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value =
      state.clock.elapsedTime;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -12, 0]}
    >
      <planeGeometry
        args={[720, 720, 256, 256]}
      />

      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: {
            value: 0,
          },
        }}
      />
    </mesh>
  );
}

/* ============================================================
   SECONDARY WATER LAYER
============================================================ */

function SecondaryWater() {
  const materialRef =
    useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value =
      state.clock.elapsedTime * 0.72;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -8, 0]}
    >
      <planeGeometry
        args={[560, 560, 180, 180]}
      />

      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.28}
        uniforms={{
          uTime: {
            value: 0,
          },
        }}
      />
    </mesh>
  );
}

/* ============================================================
   CYCLONE EYE
============================================================ */

function CycloneEye() {
  return (
    <group>

      {/* Deep open eye */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -15, 0]}
      >
        <circleGeometry
          args={[43, 128]}
        />

        <meshBasicMaterial
          color="#01070c"
          transparent
          opacity={0.96}
          depthWrite={false}
        />
      </mesh>

      {/* Inner blue water */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -14.5, 0]}
      >
        <circleGeometry
          args={[32, 128]}
        />

        <meshBasicMaterial
          color="#062c40"
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>

      {/* Center reflection */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -14, 0]}
      >
        <circleGeometry
          args={[18, 96]}
        />

        <meshBasicMaterial
          color="#0a5067"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

    </group>
  );
}

/* ============================================================
   OCEAN BASE
============================================================ */

function OceanBase() {
  return (
    <group>

      {/* Deep ocean */}
      <mesh
        position={[0, -25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry
          args={[520, 160]}
        />

        <meshStandardMaterial
          color="#031522"
          roughness={0.42}
          metalness={0.25}
        />
      </mesh>

      {/* Blue atmospheric region */}
      <mesh
        position={[0, -23, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry
          args={[410, 160]}
        />

        <meshBasicMaterial
          color="#075985"
          transparent
          opacity={0.20}
          depthWrite={false}
        />
      </mesh>

    </group>
  );
}

/* ============================================================
   ATMOSPHERIC LIGHTING
============================================================ */

function AtmosphericLighting() {
  return (
    <>
      <ambientLight
        intensity={0.65}
      />

      <directionalLight
        position={[
          180,
          320,
          220,
        ]}
        intensity={1.25}
      />

      <directionalLight
        position={[
          -220,
          180,
          -180,
        ]}
        intensity={0.45}
      />

      <pointLight
        position={[
          -180,
          120,
          180,
        ]}
        color="#22b8df"
        intensity={1.1}
        distance={600}
      />

      <pointLight
        position={[
          180,
          220,
          -100,
        ]}
        color="#dffaff"
        intensity={0.55}
        distance={500}
      />
    </>
  );
}

/* ============================================================
   3D CYCLONE SCENE
============================================================ */

function CycloneScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
      }}
    >

      <PerspectiveCamera
        makeDefault
        position={[
          0,
          360,
          500,
        ]}
        fov={46}
      />

      <AtmosphericLighting />

      <OceanBase />

      <WaterVortex />

      <SecondaryWater />

      <CycloneEye />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.045}
        autoRotate={false}
        minDistance={300}
        maxDistance={720}
        minPolarAngle={0.35}
        maxPolarAngle={1.48}
      />

      <fog
        attach="fog"
        args={[
          '#020a13',
          460,
          1050,
        ]}
      />

    </Canvas>
  );
}

/* ============================================================
   LOADING
============================================================ */

function SceneLoader() {
  return (
    <div
      className="
        absolute
        inset-0
        flex
        items-center
        justify-center
        bg-[#020a13]
      "
    >
      <div
        className="
          flex
          flex-col
          items-center
          gap-4
        "
      >

        <div
          className="
            h-10
            w-10
            rounded-full
            border-2
            border-cyan-300/20
            border-t-cyan-300
            animate-spin
          "
        />

        <p
          className="
            text-xs
            text-white/40
          "
        >
          Initializing ocean model...
        </p>

      </div>
    </div>
  );
}

/* ============================================================
   SUBTLE GLASS DATA CARD
============================================================ */

function GlassCard({
  title,
  value,
  detail,
  accent = 'cyan',
}: {
  title: string;
  value: string;
  detail: string;
  accent?: 'cyan' | 'blue' | 'white';
}) {

  const accentClass =
    accent === 'blue'
      ? 'text-blue-200'
      : accent === 'white'
      ? 'text-white'
      : 'text-cyan-200';

  return (
    <div
      className="
        rounded-2xl
        border
        border-white/[0.10]
        bg-[#061522]/80
        backdrop-blur-md
        shadow-[0_10px_30px_rgba(0,0,0,0.25)]
        px-4
        py-3
      "
    >

      <p
        className="
          text-[8px]
          uppercase
          tracking-[0.22em]
          text-white/35
        "
      >
        {title}
      </p>

      <p
        className={`
          mt-1
          text-sm
          font-semibold
          ${accentClass}
        `}
      >
        {value}
      </p>

      <p
        className="
          mt-0.5
          text-[9px]
          text-white/30
        "
      >
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function CycloneAnimationPreview() {
  return (
    <PageLayout>

      <div
        className="
          max-w-7xl
          mx-auto
          px-4
          sm:px-6
          py-8
          space-y-6
        "
      >

        <SectionHeader
          title="Cyclone Prediction"
        />

        {/* ======================================================
            MAIN 3D VIEW
        ====================================================== */}

        <section
          className="
            relative
            w-full
            h-[700px]
            overflow-hidden
            rounded-[32px]
            border
            border-white/[0.09]
            bg-[#020a13]
            shadow-[0_25px_70px_rgba(0,0,0,0.40)]
          "
        >

          {/* ====================================================
              BACKGROUND
          ==================================================== */}

          <div
            className="
              absolute
              inset-0
              pointer-events-none
              bg-[radial-gradient(
                circle_at_50%_48%,
                rgba(8,100,135,0.20),
                transparent 45%
              )]
            "
          />

          <div
            className="
              absolute
              inset-0
              pointer-events-none
              bg-[radial-gradient(
                circle_at_50%_85%,
                rgba(6,78,100,0.15),
                transparent 55%
              )]
            "
          />

          {/* ====================================================
              TOP LEFT PANEL
          ==================================================== */}

          <div
            className="
              absolute
              top-6
              left-6
              md:top-8
              md:left-8
              z-20
            "
          >

            <div
              className="
                rounded-2xl
                border
                border-white/[0.09]
                bg-[#061522]/88
                backdrop-blur-md
                px-5
                py-4
                shadow-[0_10px_35px_rgba(0,0,0,0.25)]
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-cyan-400
                    shadow-[0_0_9px_rgba(34,211,238,0.65)]
                    animate-pulse
                  "
                />

                <span
                  className="
                    text-[9px]
                    uppercase
                    tracking-[0.3em]
                    text-cyan-100/60
                  "
                >
                  OceanEmbed
                </span>

              </div>

              <h2
                className="
                  mt-2
                  text-xl
                  md:text-2xl
                  font-semibold
                  text-white
                "
              >
                Tropical Cyclone
              </h2>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-white/35
                "
              >
                3D ocean-atmosphere visualization
              </p>

            </div>

          </div>

          {/* ====================================================
              STATUS
          ==================================================== */}

          <div
            className="
              absolute
              top-6
              right-6
              md:top-8
              md:right-8
              z-20
            "
          >

            <div
              className="
                flex
                items-center
                gap-2.5
                rounded-full
                border
                border-emerald-300/15
                bg-[#071a18]/88
                backdrop-blur-md
                px-4
                py-2.5
                shadow-[0_8px_25px_rgba(0,0,0,0.22)]
              "
            >

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-emerald-400
                  shadow-[0_0_7px_rgba(52,211,153,0.65)]
                  animate-pulse
                "
              />

              <span
                className="
                  text-[9px]
                  uppercase
                  tracking-[0.2em]
                  text-emerald-200/70
                "
              >
                Model Active
              </span>

            </div>

          </div>

          {/* ====================================================
              3D WATER
          ==================================================== */}

          <div
            className="
              absolute
              inset-0
            "
          >

            <Suspense
              fallback={
                <SceneLoader />
              }
            >
              <CycloneScene />
            </Suspense>

          </div>

          {/* ====================================================
              LEFT DATA CARDS
          ==================================================== */}

          <div
            className="
              absolute
              left-6
              bottom-24
              z-20
              hidden
              lg:flex
              flex-col
              gap-3
            "
          >

            <GlassCard
              title="Surface Flow"
              value="Rotational"
              detail="Ocean circulation"
              accent="cyan"
            />

            <GlassCard
              title="Eye Structure"
              value="Defined"
              detail="Central pressure zone"
              accent="white"
            />

          </div>

          {/* ====================================================
              RIGHT DATA CARDS
          ==================================================== */}

          <div
            className="
              absolute
              right-6
              bottom-24
              z-20
              hidden
              lg:flex
              flex-col
              gap-3
              text-right
            "
          >

            <GlassCard
              title="Water State"
              value="Dynamic"
              detail="Animated surface"
              accent="blue"
            />

            <GlassCard
              title="Visualization"
              value="3D"
              detail="Interactive model"
              accent="cyan"
            />

          </div>

          {/* ====================================================
              BOTTOM CONTROL BAR
          ==================================================== */}

          <div
            className="
              absolute
              bottom-6
              left-1/2
              -translate-x-1/2
              z-20
              w-[calc(100%-32px)]
              max-w-xl
            "
          >

            <div
              className="
                rounded-2xl
                border
                border-white/[0.10]
                bg-[#061522]/88
                backdrop-blur-md
                shadow-[0_12px_35px_rgba(0,0,0,0.30)]
                px-5
                py-3.5
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-5
                  md:gap-9
                "
              >

                {/* Structure */}
                <div
                  className="
                    text-center
                    min-w-[70px]
                  "
                >

                  <p
                    className="
                      text-[8px]
                      uppercase
                      tracking-[0.18em]
                      text-white/30
                    "
                  >
                    Structure
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-medium
                      text-cyan-200
                    "
                  >
                    Spiral
                  </p>

                </div>

                <div
                  className="
                    h-8
                    w-px
                    bg-white/10
                  "
                />

                {/* Surface */}
                <div
                  className="
                    text-center
                    min-w-[70px]
                  "
                >

                  <p
                    className="
                      text-[8px]
                      uppercase
                      tracking-[0.18em]
                      text-white/30
                    "
                  >
                    Surface
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-medium
                      text-blue-200
                    "
                  >
                    Flowing
                  </p>

                </div>

                <div
                  className="
                    h-8
                    w-px
                    bg-white/10
                  "
                />

                {/* Eye */}
                <div
                  className="
                    text-center
                    min-w-[70px]
                  "
                >

                  <p
                    className="
                      text-[8px]
                      uppercase
                      tracking-[0.18em]
                      text-white/30
                    "
                  >
                    Eye
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-medium
                      text-white
                    "
                  >
                    Open
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ====================================================
              ROTATION HINT
          ==================================================== */}

          <div
            className="
              absolute
              top-1/2
              right-7
              -translate-y-1/2
              z-20
              hidden
              md:block
            "
          >

            <div
              className="
                rounded-xl
                border
                border-white/[0.07]
                bg-[#061522]/75
                backdrop-blur-sm
                px-3
                py-2
              "
            >

              <p
                className="
                  text-[8px]
                  uppercase
                  tracking-[0.18em]
                  text-white/25
                "
              >
                Drag to rotate
              </p>

            </div>

          </div>

        </section>

        {/* ======================================================
            INFORMATION
        ====================================================== */}

        <section
          className="
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#061522]/55
            backdrop-blur-md
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <span
              className="
                h-2
                w-2
                rounded-full
                bg-cyan-400
                shadow-[0_0_8px_rgba(34,211,238,0.55)]
              "
            />

            <h3
              className="
                text-sm
                font-medium
                text-cyan-100/85
              "
            >
              Dynamic Ocean Cyclone Model
            </h3>

          </div>

          <p
            className="
              mt-2
              max-w-4xl
              text-xs
              leading-6
              text-white/35
            "
          >
            A three-dimensional animated water-field
            visualization representing cyclone circulation.
            The surface uses continuously evolving procedural
            water patterns with deep-ocean shading, cyan
            highlights, white foam regions, and a defined
            central eye.
          </p>

        </section>

      </div>

    </PageLayout>
  );
}