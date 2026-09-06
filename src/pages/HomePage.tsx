import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waves,
  MessageSquare,
  LayoutDashboard,
  Globe,
  Wind,
  Thermometer,
  BarChart2,
  ArrowRight,
  Activity,
  Layers,
  Database,
  Calendar,
  GitCompare,
  Fish,
  Anchor,
  Zap,
  TrendingDown,
  Eye,
  Navigation,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { DEPTH_LEVELS } from '../contexts/DataContext';
import { motion } from 'framer-motion';
import OceanHeroCanvas from '../components/3d/OceanHeroCanvas';
import DepthZoneCanvas from '../components/3d/DepthZoneCanvas';

/* ============================================================
   DEPTH ZONES
============================================================ */

const DEPTH_ZONES = [
  {
    id: 'surface',
    depth: 0,
    label: 'Surface (0 m)',
    color: '#ef4444',
    bg: 'from-red-950/40 via-[#020917] to-[#020917]',
    icon: Waves,
    title: 'Sea Surface — Where Satellites Watch',
    desc: 'The ocean surface is our window into the deep. Satellites measure SST, SSS, SSH and currents every day at 0.25° resolution across the entire North Indian Ocean.',
    facts: [
      { label: 'SST Range', value: '24°C – 32°C', icon: Thermometer },
      { label: 'Satellite Obs', value: '8 per day', icon: Eye },
      { label: 'Resolution', value: '0.25° × 0.25°', icon: Navigation },
      { label: 'Sources', value: 'MODIS · VIIRS · AVHRR', icon: Globe },
    ],
    feature: {
      label: 'Surface Obs',
      to: '/surface',
      desc: 'View live SST, SSS, SSH heatmaps',
    },
  },
  {
    id: 'mixed',
    depth: 30,
    label: 'Mixed Layer (30 m)',
    color: '#f97316',
    bg: 'from-orange-950/40 via-[#020917] to-[#020917]',
    icon: Layers,
    title: 'Mixed Layer — Wind-Driven Uniformity',
    desc: 'Wind-driven turbulence keeps the upper 20–80 m nearly uniform in temperature. MLD determines how much thermal energy is available to fuel tropical cyclones.',
    facts: [
      { label: 'Typical MLD', value: '30 – 80 m', icon: TrendingDown },
      { label: 'Effect', value: 'Cyclone fuel', icon: Wind },
      { label: 'Driver', value: 'Wind stress', icon: Wind },
      { label: 'Season', value: 'Deeper in winter', icon: Calendar },
    ],
    feature: {
      label: '7-Day Forecast',
      to: '/forecast',
      desc: 'Predict MLD evolution over next week',
    },
  },
  {
    id: 'thermocline',
    depth: 100,
    label: 'Thermocline (75–200 m)',
    color: '#fbbf24',
    bg: 'from-yellow-950/30 via-[#020917] to-[#020917]',
    icon: TrendingDown,
    title: 'Thermocline — The Great Divider',
    desc: 'Temperature drops sharply — 10–15°C within just 100 m. SSH anomalies from mesoscale eddies displace this layer up or down, directly controlling Ocean Heat Content.',
    facts: [
      { label: 'Temp Drop', value: '~15°C per 100 m', icon: Thermometer },
      { label: 'Depth', value: '75 – 200 m', icon: Layers },
      { label: 'SSH Link', value: 'Eddy coupling', icon: Waves },
      { label: 'OHC Driver', value: 'Critical zone', icon: Zap },
    ],
    feature: {
      label: '3D Profile View',
      to: '/map',
      desc: 'Visualise thermocline in 3D depth slabs',
    },
  },
  {
    id: 'meso',
    depth: 300,
    label: 'Mesopelagic (200–1000 m)',
    color: '#06b6d4',
    bg: 'from-cyan-950/30 via-[#020917] to-[#020917]',
    icon: Fish,
    title: 'Twilight Zone — Life Without Light',
    desc: 'From 200 m to 1000 m, sunlight barely penetrates. Temperature stabilises at 5–15°C. The largest animal migration on Earth happens here nightly.',
    facts: [
      { label: 'Temp Range', value: '5°C – 15°C', icon: Thermometer },
      { label: 'Light', value: '< 1% of surface', icon: Eye },
      { label: 'Biomass', value: 'Highest density', icon: Activity },
      { label: 'Key depths', value: '200 · 300 · 500m', icon: Layers },
    ],
    feature: {
      label: 'Input Data',
      to: '/input',
      desc: 'Upload .nc files for reconstruction',
    },
  },
  {
    id: 'deep',
    depth: 700,
    label: 'Deep Ocean (700–1000 m)',
    color: '#3b82f6',
    bg: 'from-blue-950/40 via-[#020917] to-[#020917]',
    icon: Anchor,
    title: 'The Deep — Cold, Dark, Stable',
    desc: 'Near-freezing, pitch black, enormous pressure. Temperature changes are fractions of a degree. These waters hold centuries of climate memory.',
    facts: [
      { label: 'Temp', value: '2°C – 6°C', icon: Thermometer },
      { label: 'Pressure', value: '> 70 atm', icon: Waves },
      { label: 'Timescale', value: 'Centuries', icon: Calendar },
      { label: 'ARGO', value: 'Floats to 2000 m', icon: Database },
    ],
    feature: {
      label: 'Model vs GLORYS',
      to: '/compare',
      desc: 'Compare DL model vs reanalysis',
    },
  },
];

/* ============================================================
   UNDERWATER FISH
============================================================ */

function FishSprite({
  top,
  left,
  scale,
  duration,
  delay,
  direction = 1,
}: {
  top: string;
  left: string;
  scale: number;
  duration: number;
  delay: number;
  direction?: number;
}) {
  return (
    <div
      className="absolute pointer-events-none fish-swim"
      style={{
        top,
        left,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        transform: `scale(${scale * direction}, ${scale})`,
      }}
    >
      <svg
        width="90"
        height="42"
        viewBox="0 0 90 42"
        fill="none"
      >
        <path
          d="M14 21C25 8 43 5 58 12C65 15 70 19 75 21C70 23 65 27 58 30C43 37 25 34 14 21Z"
          fill="rgba(121,210,225,0.22)"
        />

        <path
          d="M14 21L2 10L6 21L2 32L14 21Z"
          fill="rgba(89,190,211,0.20)"
        />

        <path
          d="M38 11C40 4 47 3 51 11"
          stroke="rgba(180,235,240,0.22)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <circle
          cx="61"
          cy="18"
          r="2"
          fill="rgba(220,250,255,0.55)"
        />

        <path
          d="M27 17C36 20 44 21 54 20"
          stroke="rgba(210,245,250,0.16)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M27 26C37 23 45 22 54 22"
          stroke="rgba(210,245,250,0.12)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ============================================================
   SMALL FISH GROUP
============================================================ */

function FishSchool() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <FishSprite
        top="25%"
        left="-12%"
        scale={0.75}
        duration={25}
        delay={0}
      />

      <FishSprite
        top="33%"
        left="-18%"
        scale={0.45}
        duration={32}
        delay={-8}
      />

      <FishSprite
        top="43%"
        left="-10%"
        scale={0.6}
        duration={29}
        delay={-14}
      />

      <FishSprite
        top="58%"
        left="-15%"
        scale={0.38}
        duration={36}
        delay={-4}
      />

      <FishSprite
        top="67%"
        left="-20%"
        scale={0.52}
        duration={31}
        delay={-18}
      />

      <FishSprite
        top="76%"
        left="-13%"
        scale={0.34}
        duration={38}
        delay={-22}
      />
    </div>
  );
}

/* ============================================================
   BUBBLES
============================================================ */

function Bubbles() {
  const bubbles = [
    { left: '8%', size: 4, duration: 12, delay: 0 },
    { left: '17%', size: 7, duration: 16, delay: -6 },
    { left: '29%', size: 3, duration: 11, delay: -2 },
    { left: '42%', size: 5, duration: 14, delay: -9 },
    { left: '55%', size: 3, duration: 10, delay: -4 },
    { left: '64%', size: 8, duration: 18, delay: -12 },
    { left: '73%', size: 4, duration: 13, delay: -7 },
    { left: '84%', size: 6, duration: 17, delay: -14 },
    { left: '93%', size: 3, duration: 11, delay: -3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className="water-bubble"
          style={{
            left: bubble.left,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   KELP / SEA FLORA
============================================================ */

function Kelp({
  left,
  scale,
  delay,
}: {
  left: string;
  scale: number;
  delay: number;
}) {
  return (
    <div
      className="absolute bottom-0 pointer-events-none origin-bottom kelp-sway"
      style={{
        left,
        transform: `scale(${scale})`,
        animationDelay: `${delay}s`,
      }}
    >
      <svg
        width="120"
        height="260"
        viewBox="0 0 120 260"
        fill="none"
      >
        <path
          d="M60 260C55 220 67 190 51 153C37 121 51 94 39 58C31 34 39 15 29 0"
          stroke="rgba(27,126,105,0.52)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M65 260C72 221 56 196 70 164C83 133 69 105 82 74C91 52 82 29 91 8"
          stroke="rgba(33,154,122,0.38)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <path
          d="M47 205C25 188 18 169 21 143"
          stroke="rgba(40,170,138,0.32)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          d="M70 183C95 171 103 151 101 130"
          stroke="rgba(40,170,138,0.30)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          d="M53 119C29 105 22 86 25 66"
          stroke="rgba(56,189,148,0.24)"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <path
          d="M76 95C100 82 106 65 101 47"
          stroke="rgba(56,189,148,0.22)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ============================================================
   SEA FLOOR FLORA
============================================================ */

function SeaFloor() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-64 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            'linear-gradient(to top, rgba(1,18,27,0.92), transparent)',
        }}
      />

      <Kelp left="1%" scale={0.75} delay={-2} />
      <Kelp left="7%" scale={0.55} delay={-5} />
      <Kelp left="14%" scale={0.9} delay={-1} />
      <Kelp left="24%" scale={0.6} delay={-7} />
      <Kelp left="34%" scale={0.8} delay={-3} />
      <Kelp left="48%" scale={0.55} delay={-9} />
      <Kelp left="58%" scale={0.9} delay={-4} />
      <Kelp left="69%" scale={0.65} delay={-8} />
      <Kelp left="78%" scale={0.82} delay={-2} />
      <Kelp left="88%" scale={0.6} delay={-6} />
      <Kelp left="95%" scale={0.8} delay={-10} />
    </div>
  );
}

/* ============================================================
   UNDERWATER LIGHT RAYS
============================================================ */

function LightRays() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="water-ray ray-one" />
      <div className="water-ray ray-two" />
      <div className="water-ray ray-three" />
      <div className="water-ray ray-four" />
    </div>
  );
}

/* ============================================================
   MOVING WATER BACKGROUND
============================================================ */

function WaterBackground() {
  return (
    <>
      <style>{`
        @keyframes waterDriftOne {
          0% {
            transform: translate3d(-3%, 0, 0) scale(1.08);
          }
          50% {
            transform: translate3d(3%, 2%, 0) scale(1.12);
          }
          100% {
            transform: translate3d(-3%, 0, 0) scale(1.08);
          }
        }

        @keyframes waterDriftTwo {
          0% {
            transform: translate3d(4%, -2%, 0) scale(1.15);
          }
          50% {
            transform: translate3d(-4%, 3%, 0) scale(1.08);
          }
          100% {
            transform: translate3d(4%, -2%, 0) scale(1.15);
          }
        }

        @keyframes waterFlow {
          0% {
            transform: translateX(-8%) skewX(-4deg);
          }
          50% {
            transform: translateX(8%) skewX(4deg);
          }
          100% {
            transform: translateX(-8%) skewX(-4deg);
          }
        }

        @keyframes waterFlowReverse {
          0% {
            transform: translateX(8%) skewX(3deg);
          }
          50% {
            transform: translateX(-8%) skewX(-3deg);
          }
          100% {
            transform: translateX(8%) skewX(3deg);
          }
        }

        @keyframes causticMove {
          0% {
            transform: translate3d(-4%, -2%, 0) rotate(-3deg) scale(1.1);
          }
          50% {
            transform: translate3d(5%, 3%, 0) rotate(2deg) scale(1.18);
          }
          100% {
            transform: translate3d(-4%, -2%, 0) rotate(-3deg) scale(1.1);
          }
        }

        @keyframes fishSwim {
          0% {
            transform: translateX(-130px) translateY(0);
          }
          25% {
            transform: translateX(25vw) translateY(-18px);
          }
          50% {
            transform: translateX(55vw) translateY(12px);
          }
          75% {
            transform: translateX(85vw) translateY(-10px);
          }
          100% {
            transform: translateX(115vw) translateY(4px);
          }
        }

        @keyframes bubbleRise {
          0% {
            transform: translateY(110vh) translateX(0) scale(0.7);
            opacity: 0;
          }
          10% {
            opacity: 0.35;
          }
          50% {
            transform: translateY(50vh) translateX(12px) scale(1);
            opacity: 0.24;
          }
          100% {
            transform: translateY(-15vh) translateX(-15px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes kelpSway {
          0% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(3deg);
          }
          100% {
            transform: rotate(-2deg);
          }
        }

        @keyframes rayMove {
          0% {
            opacity: 0.05;
            transform: translateX(-20px) rotate(13deg);
          }
          50% {
            opacity: 0.13;
            transform: translateX(20px) rotate(10deg);
          }
          100% {
            opacity: 0.05;
            transform: translateX(-20px) rotate(13deg);
          }
        }

        @keyframes shimmer {
          0% {
            opacity: 0.12;
            transform: translateX(-10%);
          }
          50% {
            opacity: 0.28;
            transform: translateX(10%);
          }
          100% {
            opacity: 0.12;
            transform: translateX(-10%);
          }
        }

        .water-bubble {
          position: absolute;
          bottom: -20px;
          display: block;
          border-radius: 9999px;
          border: 1px solid rgba(160,235,245,0.22);
          background: radial-gradient(
            circle at 30% 25%,
            rgba(255,255,255,0.35),
            rgba(72,190,215,0.04) 45%,
            transparent 70%
          );
          box-shadow:
            0 0 10px rgba(65,190,220,0.10),
            inset 1px 1px 2px rgba(255,255,255,0.18);
          animation: bubbleRise linear infinite;
        }

        .fish-swim {
          animation-name: fishSwim;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .kelp-sway {
          animation-name: kelpSway;
          animation-duration: 5s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .water-ray {
          position: absolute;
          top: -20%;
          width: 25%;
          height: 150%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(125,225,235,0.10),
            rgba(125,225,235,0.03),
            transparent
          );
          filter: blur(8px);
          transform-origin: top center;
          animation: rayMove 9s ease-in-out infinite;
        }

        .ray-one {
          left: 7%;
          animation-delay: -2s;
        }

        .ray-two {
          left: 28%;
          width: 18%;
          animation-duration: 12s;
          animation-delay: -5s;
        }

        .ray-three {
          right: 25%;
          width: 22%;
          animation-duration: 10s;
          animation-delay: -1s;
        }

        .ray-four {
          right: 3%;
          width: 18%;
          animation-duration: 14s;
          animation-delay: -7s;
        }

        .water-caustic {
          position: absolute;
          inset: -15%;
          background:
            radial-gradient(
              ellipse 18% 5% at 15% 20%,
              rgba(183,239,240,0.18),
              transparent 70%
            ),
            radial-gradient(
              ellipse 22% 6% at 45% 28%,
              rgba(110,215,225,0.14),
              transparent 70%
            ),
            radial-gradient(
              ellipse 20% 5% at 75% 18%,
              rgba(178,238,240,0.15),
              transparent 70%
            ),
            radial-gradient(
              ellipse 30% 7% at 30% 52%,
              rgba(77,192,208,0.12),
              transparent 70%
            ),
            radial-gradient(
              ellipse 25% 5% at 70% 62%,
              rgba(123,224,231,0.12),
              transparent 70%
            ),
            radial-gradient(
              ellipse 35% 8% at 45% 80%,
              rgba(42,160,180,0.10),
              transparent 70%
            );
          filter: blur(7px);
          mix-blend-mode: screen;
          animation: causticMove 18s ease-in-out infinite;
        }

        .water-stream {
          position: absolute;
          left: -10%;
          width: 120%;
          height: 90px;
          border-radius: 50%;
          border-top: 1px solid rgba(138,222,230,0.10);
          border-bottom: 1px solid rgba(67,173,192,0.06);
          filter: blur(4px);
          animation: waterFlow 14s ease-in-out infinite;
        }

        .water-stream-two {
          animation-name: waterFlowReverse;
          animation-duration: 18s;
          opacity: 0.7;
        }

        .water-shimmer {
          position: absolute;
          left: -10%;
          top: 5%;
          width: 120%;
          height: 40%;
          background:
            repeating-linear-gradient(
              175deg,
              transparent 0px,
              transparent 18px,
              rgba(174,238,241,0.035) 20px,
              rgba(174,238,241,0.09) 24px,
              transparent 31px,
              transparent 58px
            );
          filter: blur(5px);
          animation: shimmer 11s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#020b16]">

        {/* Deep ocean gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 60% at 50% 0%,
                rgba(16,100,125,0.30),
                transparent 62%
              ),
              linear-gradient(
                180deg,
                #031421 0%,
                #031b2b 22%,
                #021522 52%,
                #010b15 78%,
                #01070d 100%
              )
            `,
          }}
        />

        {/* Large moving water volume */}
        <div
          className="absolute inset-[-10%]"
          style={{
            background: `
              radial-gradient(
                ellipse 45% 18% at 20% 20%,
                rgba(76,184,198,0.18),
                transparent 70%
              ),
              radial-gradient(
                ellipse 50% 20% at 80% 35%,
                rgba(38,137,165,0.15),
                transparent 70%
              ),
              radial-gradient(
                ellipse 60% 20% at 40% 65%,
                rgba(25,113,145,0.13),
                transparent 70%
              )
            `,
            filter: 'blur(18px)',
            animation: 'waterDriftOne 18s ease-in-out infinite',
          }}
        />

        <div
          className="absolute inset-[-10%]"
          style={{
            background: `
              radial-gradient(
                ellipse 40% 12% at 70% 15%,
                rgba(128,220,224,0.13),
                transparent 70%
              ),
              radial-gradient(
                ellipse 55% 16% at 20% 48%,
                rgba(39,145,166,0.12),
                transparent 70%
              ),
              radial-gradient(
                ellipse 45% 14% at 78% 76%,
                rgba(20,100,130,0.16),
                transparent 70%
              )
            `,
            filter: 'blur(22px)',
            animation: 'waterDriftTwo 23s ease-in-out infinite',
          }}
        />

        {/* Water caustics */}
        <div className="water-caustic" />

        {/* Moving water streams */}
        <div
          className="water-stream"
          style={{ top: '18%' }}
        />

        <div
          className="water-stream water-stream-two"
          style={{ top: '34%' }}
        />

        <div
          className="water-stream"
          style={{ top: '53%', opacity: 0.45 }}
        />

        <div
          className="water-stream water-stream-two"
          style={{ top: '72%', opacity: 0.35 }}
        />

        {/* Surface shimmer */}
        <div className="water-shimmer" />

        {/* Underwater sunlight */}
        <LightRays />

        {/* Fish */}
        <FishSchool />

        {/* Bubbles */}
        <Bubbles />

        {/* Flora */}
        <SeaFloor />

        {/* Deep bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-[30%]"
          style={{
            background:
              'linear-gradient(to top, rgba(0,5,10,0.72), transparent)',
          }}
        />

        {/* Very subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, transparent 35%, rgba(0,5,12,0.40) 100%)',
          }}
        />
      </div>
    </>
  );
}

/* ============================================================
   DEPTH METER
============================================================ */

function DepthMeter({ depth }: { depth: number }) {
  const pct = Math.min((depth / 1000) * 100, 100);

  const markers = [
    { m: 0, label: '0', zone: 'Surface' },
    { m: 100, label: '100', zone: 'Thermo' },
    { m: 300, label: '300', zone: 'Meso' },
    { m: 700, label: '700', zone: 'Deep' },
    { m: 1000, label: '1k', zone: 'Abyss' },
  ];

  const depthColor =
    depth < 30
      ? '#ef4444'
      : depth < 100
        ? '#f97316'
        : depth < 300
          ? '#fbbf24'
          : depth < 700
            ? '#06b6d4'
            : '#3b82f6';

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-40 hidden lg:block"
      style={{ width: '44px' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(1,12,22,0.90), rgba(2,24,39,0.92), rgba(1,8,16,0.94))',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(130,220,230,0.07)',
        }}
      />

      <div className="relative h-full flex flex-col items-center">

        <div className="pt-[72px] pb-4">
          <span
            className="text-[8px] font-bold tracking-[0.3em] uppercase text-white/20"
            style={{
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
            }}
          >
            DEPTH
          </span>
        </div>

        <div
          className="relative flex-1 mb-4"
          style={{ width: '3px' }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.05)',
            }}
          />

          <div
            className="absolute top-0 left-0 right-0 rounded-full transition-all duration-700"
            style={{
              height: `${pct}%`,
              background:
                'linear-gradient(to bottom,#ef4444 0%,#f97316 22%,#fbbf24 42%,#06b6d4 68%,#3b82f6 85%,#7c3aed 100%)',
              boxShadow: `0 0 6px 1px ${depthColor}77`,
            }}
          />

          <div
            className="absolute left-1/2 rounded-full transition-all duration-700"
            style={{
              width: '11px',
              height: '11px',
              top: `calc(${pct}% - 5px)`,
              left: '50%',
              transform: 'translateX(-50%)',
              background: `radial-gradient(circle at 35% 35%, #fff, ${depthColor})`,
              boxShadow: `0 0 14px 5px ${depthColor}88, 0 0 4px 1px #fff4`,
            }}
          />

          {markers.map(({ m, label }) => {
            const tp = (m / 1000) * 100;
            const near = Math.abs(m - depth) < 90;

            return (
              <div
                key={m}
                className="absolute"
                style={{
                  top: `${tp}%`,
                  left: '50%',
                }}
              >
                <div
                  className="absolute h-px transition-all duration-300"
                  style={{
                    left: '6px',
                    width: near ? '10px' : '6px',
                    top: '0px',
                    background: near
                      ? depthColor
                      : 'rgba(255,255,255,0.12)',
                    boxShadow: near
                      ? `0 0 5px ${depthColor}`
                      : 'none',
                  }}
                />

                <span
                  className="absolute text-[8px] font-mono transition-all duration-300"
                  style={{
                    left: '18px',
                    top: '-5px',
                    color: near
                      ? depthColor
                      : 'rgba(255,255,255,0.14)',
                    fontWeight: near ? 800 : 400,
                    textShadow: near
                      ? `0 0 8px ${depthColor}`
                      : 'none',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pb-6 flex flex-col items-center gap-0.5">
          <div
            className="rounded-lg px-1.5 py-1.5 text-center transition-all duration-500"
            style={{
              background: `${depthColor}15`,
              border: `1px solid ${depthColor}35`,
              minWidth: '36px',
              boxShadow: `0 0 12px ${depthColor}33`,
            }}
          >
            <span
              className="text-[11px] font-black font-mono leading-tight block transition-all duration-500"
              style={{
                color: depthColor,
                textShadow: `0 0 8px ${depthColor}`,
              }}
            >
              {Math.round(depth)}
            </span>

            <span className="text-[7px] text-white/20 font-mono">
              m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRISM CARD
   Reduced glass effect
============================================================ */

function PrismCard({
  children,
  className = '',
  glowColor = '#06b6d4',
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(7,25,38,0.72),
            rgba(4,22,34,0.62)
          )
        `,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(135,220,230,0.10)',
        boxShadow: `
          0 10px 35px rgba(0,0,0,0.28),
          0 0 30px ${glowColor}12
        `,
      }}
    >
      {/* Subtle water reflection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              120deg,
              transparent 15%,
              rgba(130,220,230,0.035) 45%,
              transparent 65%
            )
          `,
          animation: 'waterFlow 14s ease-in-out infinite',
        }}
      />

      {/* Thin top water highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(160,235,240,0.18), transparent)',
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   ANIMATED NUMBER
============================================================ */

function AnimNum({
  target,
  suffix = '',
}: {
  target: number;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let v = 0;

    const step = target / 60;

    const t = setInterval(() => {
      v += step;

      if (v >= target) {
        setVal(target);
        clearInterval(t);
      } else {
        setVal(Math.floor(v));
      }
    }, 16);

    return () => clearInterval(t);
  }, [target]);

  return (
    <>
      {val.toLocaleString()}
      {suffix}
    </>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function HomePage() {
  const navigate = useNavigate();

  const [scrollDepth, setScrollDepth] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docH =
        document.body.scrollHeight -
        window.innerHeight;

      setScrollDepth(
        docH > 0
          ? Math.round(
              (window.scrollY / docH) * 1000
            )
          : 0
      );
    };

    window.addEventListener(
      'scroll',
      onScroll,
      { passive: true }
    );

    return () =>
      window.removeEventListener(
        'scroll',
        onScroll
      );
  }, []);

  return (
    <div className="min-h-screen bg-[#020917] text-white overflow-x-hidden">

      {/* ======================================================
          UNDERWATER BACKGROUND
      ====================================================== */}

      <WaterBackground />

      <Navbar />

      <DepthMeter depth={scrollDepth} />

      <div className="lg:pl-11">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section
          className="
            relative
            min-h-screen
            flex
            items-center
            justify-center
            overflow-hidden
            pt-20
            pb-12
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* Hero water depth overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 45% at 50% 10%, rgba(66,190,205,0.13), transparent 70%)',
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Left Column: Hero Text, CTAs, and Animated Stats (5 cols) */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="lg:col-span-5 text-left space-y-6"
              >
                {/* Ocean status badge */}
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-3.5
                    py-1.5
                    rounded-full
                    text-xs
                    font-mono
                  "
                  style={{
                    background: 'rgba(4,40,55,0.7)',
                    border: '1px solid rgba(78,201,215,0.3)',
                    color: '#66dce8',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  0–1000m Subsurface AI Digital Twin Active
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.1] tracking-tight">
                  <span
                    style={{
                      background: 'linear-gradient(135deg,#38d7df 0%,#249bd0 45%,#8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Ocean &amp; Climate
                  </span>
                  <br />
                  <span className="text-white">Intelligence</span>
                </h1>

                {/* Subtitle */}
                <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-xl">
                  Reconstructing the{' '}
                  <span className="text-cyan-300 font-semibold">subsurface ocean</span> from satellite
                  observations using deep learning embeddings — 15 depth levels, 0 to 1000 m, across the North Indian Ocean.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm hover:opacity-95 transition-all hover:scale-105 cursor-pointer shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg,#0891a7,#2563eb)',
                      boxShadow: '0 0 25px rgba(6,182,212,0.35)',
                    }}
                  >
                    Open Dashboard
                    <ArrowRight size={15} />
                  </button>

                  <button
                    onClick={() => navigate('/forecast')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white hover:scale-105 transition-all cursor-pointer"
                    style={{
                      background: 'rgba(4,30,43,0.7)',
                      border: '1px solid rgba(125,220,230,0.2)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Calendar size={15} className="text-cyan-400" />
                    7-Day Forecast
                  </button>

                  <button
                    onClick={() => navigate('/chat')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white hover:scale-105 transition-all cursor-pointer"
                    style={{
                      background: 'rgba(4,30,43,0.7)',
                      border: '1px solid rgba(125,220,230,0.2)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <MessageSquare size={15} className="text-purple-400" />
                    Ask X AI
                  </button>
                </div>

                {/* Stats Grid with 3D cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 pt-4">
                  {[
                    { label: 'Depth Levels', value: 15, suffix: '', glow: '#06b6d4' },
                    { label: 'Max Depth', value: 1000, suffix: 'm', glow: '#3b82f6' },
                    { label: 'Grid Points', value: 20000, suffix: '+', glow: '#8b5cf6' },
                    { label: 'Accuracy', value: 94, suffix: '%', glow: '#10b981' },
                  ].map(({ label, value, suffix, glow }) => (
                    <PrismCard key={label} glowColor={glow} className="p-3 text-center">
                      <p
                        className="text-xl font-black font-mono"
                        style={{
                          background: `linear-gradient(135deg,${glow},#fff)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        <AnimNum target={value} suffix={suffix} />
                      </p>
                      <p className="text-white/40 text-[11px] mt-0.5">{label}</p>
                    </PrismCard>
                  ))}
                </div>
              </motion.div>

              {/* Right Column: 3D Interactive Ocean Digital Twin (7 cols) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className="lg:col-span-7 w-full"
              >
                <OceanHeroCanvas />
              </motion.div>

            </div>

            {/* Dive indicator */}
            <div className="mt-12 flex flex-col items-center gap-2 text-white/30 text-xs animate-bounce">
              <span>Scroll to dive deeper through the depth layers</span>
              <div className="w-px h-8 bg-gradient-to-b from-cyan-400/40 to-transparent" />
            </div>
          </div>
        </section>

        {/* ====================================================
            DEPTH ZONES
        ==================================================== */}

        {DEPTH_ZONES.map(
          (zone, zi) => {
            const Icon = zone.icon;

            return (
              <section
                key={zone.id}
                className={`
                  relative
                  min-h-screen
                  flex
                  items-center
                  py-24
                  overflow-hidden
                  bg-gradient-to-b
                  ${zone.bg}
                `}
              >

                {/* Underwater zone glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `
                      radial-gradient(
                        ellipse 60% 35% at ${
                          zi % 2 === 0
                            ? '25%'
                            : '75%'
                        } 50%,
                        ${zone.color}12,
                        transparent 70%
                      )
                    `,
                  }}
                />

                {/* Pressure lines */}
                {[...Array(5)].map(
                  (_, i) => (
                    <div
                      key={i}
                      className="
                        absolute
                        left-0
                        right-0
                        h-px
                        pointer-events-none
                      "
                      style={{
                        top: `${
                          15 + i * 17
                        }%`,
                        background: `linear-gradient(
                          90deg,
                          transparent 5%,
                          ${zone.color}15,
                          transparent 95%
                        )`,
                      }}
                    />
                  )
                )}

                <div
                  className="
                    relative
                    z-10
                    max-w-6xl
                    mx-auto
                    px-6
                    w-full
                  "
                >
                  <div
                    className="
                      grid
                      grid-cols-1
                      lg:grid-cols-2
                      gap-16
                      items-center
                    "
                  >

                    {/* TEXT */}
                    <div
                      className={
                        zi % 2 === 1
                          ? 'lg:order-2'
                          : ''
                      }
                    >

                      <div
                        className="
                          inline-flex
                          items-center
                          gap-2
                          px-3
                          py-1.5
                          rounded-full
                          text-sm
                          mb-6
                        "
                        style={{
                          background:
                            zone.color + '18',
                          border: `1px solid ${zone.color}35`,
                          color: zone.color,
                          backdropFilter:
                            'blur(8px)',
                        }}
                      >
                        <Icon size={13} />
                        {zone.label}
                      </div>

                      <h2
                        className="
                          text-3xl
                          sm:text-4xl
                          font-black
                          text-white
                          mb-5
                          leading-tight
                        "
                      >
                        {zone.title}
                      </h2>

                      <p
                        className="
                          text-white/55
                          text-base
                          leading-relaxed
                          mb-8
                        "
                      >
                        {zone.desc}
                      </p>

                      {/* Facts */}
                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-3
                          mb-8
                        "
                      >
                        {zone.facts.map(
                          ({
                            label,
                            value,
                            icon: FIcon,
                          }) => (
                            <PrismCard
                              key={label}
                              glowColor={
                                zone.color
                              }
                              className="p-4"
                            >
                              <div className="flex items-start gap-3">

                                <div
                                  className="
                                    w-7
                                    h-7
                                    rounded-lg
                                    flex
                                    items-center
                                    justify-center
                                    shrink-0
                                  "
                                  style={{
                                    background:
                                      zone.color +
                                      '20',
                                    border: `1px solid ${zone.color}35`,
                                  }}
                                >
                                  <FIcon
                                    size={13}
                                    style={{
                                      color:
                                        zone.color,
                                    }}
                                  />
                                </div>

                                <div>
                                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                                    {label}
                                  </p>

                                  <p className="text-sm font-semibold text-white mt-0.5">
                                    {value}
                                  </p>
                                </div>

                              </div>
                            </PrismCard>
                          )
                        )}
                      </div>

                      {/* CTA */}
                      <button
                        onClick={() =>
                          navigate(
                            zone.feature.to
                          )
                        }
                        className="
                          flex
                          items-center
                          gap-2
                          px-5
                          py-2.5
                          rounded-xl
                          font-semibold
                          text-sm
                          text-white
                          hover:opacity-90
                          hover:scale-105
                          transition-all
                        "
                        style={{
                          background: `linear-gradient(
                            135deg,
                            ${zone.color}cc,
                            ${zone.color}70
                          )`,
                          boxShadow: `0 0 20px ${zone.color}28`,
                        }}
                      >
                        <ArrowRight size={14} />
                        {zone.feature.label}
                      </button>

                      <p className="text-white/25 text-xs mt-2">
                        {zone.feature.desc}
                      </p>
                    </div>

                    {/* DEPTH VISUAL WITH 3D SIMULATION CANVAS */}
                    <div
                      className={`
                        ${
                          zi % 2 === 1
                            ? 'lg:order-1'
                            : ''
                        }
                        flex
                        flex-col
                        sm:flex-row
                        items-center
                        justify-center
                        gap-6
                        w-full
                      `}
                    >
                      {/* Interactive 3D Zone Simulation Canvas */}
                      <div className="flex-1 w-full max-w-md">
                        <DepthZoneCanvas zoneId={zone.id} color={zone.color} />
                      </div>

                      {/* Vertical Stratification Depth Strip */}
                      <div className="relative flex gap-3 shrink-0">
                        <div
                          className="
                            flex
                            flex-col-reverse
                            rounded-2xl
                            overflow-hidden
                            border
                            border-white/10
                          "
                          style={{
                            width: '42px',
                            height: '280px',
                            boxShadow: `0 0 30px ${zone.color}22`,
                          }}
                        >
                          {DEPTH_LEVELS.map((d) => {
                            const isActive =
                              d >= zone.depth &&
                              d < (DEPTH_ZONES[zi + 1]?.depth ?? 1001);

                            const temp = 28 - (d / 1000) * 26;
                            const n = Math.max(0, Math.min(1, (temp - 2) / 27));
                            const bg =
                              n < 0.25
                                ? '#1e40af'
                                : n < 0.5
                                ? '#06b6d4'
                                : n < 0.75
                                ? '#fbbf24'
                                : '#ef4444';

                            return (
                              <div
                                key={d}
                                title={`${d}m · ${temp.toFixed(1)}°C`}
                                className="flex-1 transition-all duration-300"
                                style={{
                                  background: bg,
                                  opacity: isActive ? 1 : 0.25,
                                  filter: isActive
                                    ? `brightness(1.3) drop-shadow(0 0 4px ${bg})`
                                    : 'none',
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Labels */}
                        <div
                          className="flex flex-col-reverse justify-between py-0.5"
                          style={{ height: '280px' }}
                        >
                          {DEPTH_LEVELS.filter((_, i) => i % 2 === 0).map((d) => {
                            const isActive =
                              d >= zone.depth &&
                              d < (DEPTH_ZONES[zi + 1]?.depth ?? 1001);

                            return (
                              <span
                                key={d}
                                className="text-[9px] font-mono transition-all duration-300"
                                style={{
                                  color: isActive
                                    ? zone.color
                                    : 'rgba(255,255,255,0.2)',
                                  fontWeight: isActive ? 700 : 400,
                                }}
                              >
                                {d}m
                              </span>
                            );
                          })}
                        </div>

                        {/* Active badge */}
                        <div
                          className="
                            absolute
                            -right-2
                            top-1/2
                            -translate-y-1/2
                            translate-x-full
                          "
                        >
                          <PrismCard
                            glowColor={zone.color}
                            className="px-2.5 py-1"
                          >
                            <span
                              className="text-[10px] font-mono whitespace-nowrap"
                              style={{ color: zone.color }}
                            >
                              ← Active
                            </span>
                          </PrismCard>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            );
          }
        )}

        {/* ====================================================
            PLATFORM MODULES
        ==================================================== */}

        <section
          className="
            relative
            py-28
            overflow-hidden
          "
        >
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-b
              from-[#020c22]
              to-[#020917]
            "
          />

          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 70% 50% at 50% 90%, rgba(30,100,190,0.12), transparent)',
            }}
          />

          <div
            className="
              relative
              z-10
              max-w-6xl
              mx-auto
              px-6
            "
          >

            <div className="text-center mb-16">

              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-3
                  py-1.5
                  rounded-full
                  text-sm
                  mb-6
                "
                style={{
                  background:
                    'rgba(59,130,246,0.12)',
                  border:
                    '1px solid rgba(59,130,246,0.25)',
                  color: '#7db4ff',
                }}
              >
                <Anchor size={13} />

                1000 m · Abyssal Zone · Deepest level monitored
              </div>

              <h2 className="text-4xl font-black text-white mb-4">
                Platform Modules
              </h2>

              <p className="text-white/40 max-w-xl mx-auto">
                From surface satellites to 1000 m deep —
                every tool you need for North Indian Ocean
                intelligence
              </p>
            </div>

            {/* Module cards */}
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                gap-5
              "
            >
              {[
                {
                  icon: LayoutDashboard,
                  label: 'Dashboard',
                  desc: 'Live OHC, MLD, subsurface profile snapshot',
                  to: '/dashboard',
                  glow: '#06b6d4',
                },
                {
                  icon: Calendar,
                  label: '7-Day Forecast',
                  desc: 'Sliding window temp prediction at 15 depths',
                  to: '/forecast',
                  glow: '#3b82f6',
                },
                {
                  icon: GitCompare,
                  label: 'Model vs GLORYS',
                  desc: 'DL model accuracy vs GLORYS12 reanalysis',
                  to: '/compare',
                  glow: '#8b5cf6',
                },
                {
                  icon: BarChart2,
                  label: 'Input Data',
                  desc: 'Upload .nc satellite files',
                  to: '/input',
                  glow: '#f97316',
                },
                {
                  icon: Layers,
                  label: '3D Profile',
                  desc: 'Interactive 3D depth-level slab view',
                  to: '/map',
                  glow: '#14b8a6',
                },
                {
                  icon: Wind,
                  label: 'Cyclone Pred.',
                  desc: 'Physics-based cyclone risk from OHC + SST',
                  to: '/cyclone',
                  glow: '#ef4444',
                },
                {
                  icon: Eye,
                  label: 'Surface Obs',
                  desc: 'SST · SSS · SSH · Wind heatmaps',
                  to: '/surface',
                  glow: '#10b981',
                },
                {
                  icon: Database,
                  label: 'Validation',
                  desc: 'ARGO-based per-depth RMSE · Bias · R²',
                  to: '/validation',
                  glow: '#eab308',
                },
                {
                  icon: MessageSquare,
                  label: 'X AI',
                  desc: 'Natural language Q&A over ocean data',
                  to: '/chat',
                  glow: '#a78bfa',
                },
              ].map(
                ({
                  icon: Icon,
                  label,
                  desc,
                  to,
                  glow,
                }) => (
                  <button
                    key={to}
                    onClick={() =>
                      navigate(to)
                    }
                    className="
                      text-left
                      group
                      card-3d
                      cursor-pointer
                      transition-all
                      duration-200
                    "
                  >
                    <PrismCard
                      glowColor={glow}
                      className="p-5 h-full"
                    >
                      <div
                        className="
                          w-10
                          h-10
                          rounded-xl
                          flex
                          items-center
                          justify-center
                          mb-4
                          transition-transform
                          group-hover:scale-110
                        "
                        style={{
                          background:
                            glow + '18',
                          border: `1px solid ${glow}35`,
                        }}
                      >
                        <Icon
                          size={18}
                          style={{
                            color: glow,
                          }}
                        />
                      </div>

                      <h3
                        className="font-semibold mb-1"
                        style={{
                          color: glow,
                        }}
                      >
                        {label}
                      </h3>

                      <p className="text-white/45 text-sm leading-relaxed">
                        {desc}
                      </p>

                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          mt-3
                          text-xs
                          opacity-0
                          group-hover:opacity-100
                          transition-opacity
                        "
                        style={{
                          color: glow,
                        }}
                      >
                        Open
                        <ArrowRight size={11} />
                      </div>
                    </PrismCard>
                  </button>
                )
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-20 space-y-3">

              <div className="inline-flex items-center gap-2 text-white/20 text-xs">
                <Waves size={12} />

                You've reached 1000 m · North Indian Ocean ·
                5°N–30°N, 45°E–105°E
              </div>

              <div
                className="
                  w-px
                  h-12
                  bg-gradient-to-b
                  from-cyan-500/30
                  to-transparent
                  mx-auto
                "
              />
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}