import { useState } from 'react';
import PageLayout, { SectionHeader } from '../components/PageLayout';

// ============================================================================
// STATIC MODEL COMPARISON PAGE
// No backend/API calls. No random values.
// All graph values below are illustrative UI/demo values only.
// ============================================================================

type ModelKey = 'CNN' | 'Swin' | 'Fused' | 'ConvGRU' | 'GNN' | 'Autoencoder';

const models: Array<{
  name: ModelKey;
  short: string;
  dimension: number;
  role: string;
  color: string;
}> = [
  { name: 'CNN', short: 'CNN', dimension: 48, role: 'Local spatial features', color: '#22d3ee' },
  { name: 'Swin', short: 'Swin', dimension: 13, role: 'Global contextual features', color: '#a78bfa' },
  { name: 'Fused', short: 'Fused', dimension: 61, role: 'CNN + Swin representation', color: '#34d399' },
  { name: 'ConvGRU', short: 'GRU', dimension: 64, role: 'Temporal representation', color: '#fb923c' },
  { name: 'GNN', short: 'GNN', dimension: 32, role: 'Graph representation (demo)', color: '#f87171' },
  { name: 'Autoencoder', short: 'AE', dimension: 16, role: 'Latent representation (demo)', color: '#facc15' },
];

const pcaPoints: Record<ModelKey, Array<{ x: number; y: number; label: string }>> = {
  CNN: [
    { x: -2.7, y: 1.7, label: 'T1' },
    { x: -1.8, y: 1.1, label: 'T2' },
    { x: -1.0, y: 0.5, label: 'T3' },
    { x: -0.2, y: -0.1, label: 'T4' },
    { x: 0.6, y: -0.7, label: 'T5' },
    { x: 1.3, y: 0.0, label: 'T6' },
    { x: 2.0, y: 0.7, label: 'T7' },
  ],
  Swin: [
    { x: -2.2, y: 2.1, label: 'T1' },
    { x: -1.3, y: 1.5, label: 'T2' },
    { x: -0.6, y: 0.9, label: 'T3' },
    { x: 0.2, y: 0.3, label: 'T4' },
    { x: 0.9, y: -0.4, label: 'T5' },
    { x: 1.6, y: 0.3, label: 'T6' },
    { x: 2.3, y: 1.0, label: 'T7' },
  ],
  Fused: [
    { x: -2.4, y: 1.5, label: 'T1' },
    { x: -1.5, y: 0.9, label: 'T2' },
    { x: -0.7, y: 0.2, label: 'T3' },
    { x: 0.0, y: -0.5, label: 'T4' },
    { x: 0.7, y: -0.9, label: 'T5' },
    { x: 1.5, y: -0.2, label: 'T6' },
    { x: 2.1, y: 0.8, label: 'T7' },
  ],
  ConvGRU: [
    { x: -1.7, y: 1.1, label: 'T1' },
    { x: -0.9, y: 0.8, label: 'T2' },
    { x: -0.2, y: 0.1, label: 'T3' },
    { x: 0.5, y: -0.5, label: 'T4' },
    { x: 1.2, y: -0.8, label: 'T5' },
    { x: 1.8, y: 0.0, label: 'T6' },
    { x: 2.4, y: 0.9, label: 'T7' },
  ],
  GNN: [
    { x: -2.1, y: -0.4, label: 'T1' },
    { x: -1.4, y: 0.4, label: 'T2' },
    { x: -0.7, y: 1.0, label: 'T3' },
    { x: 0.0, y: 0.6, label: 'T4' },
    { x: 0.7, y: -0.1, label: 'T5' },
    { x: 1.3, y: -0.7, label: 'T6' },
    { x: 1.9, y: -1.1, label: 'T7' },
  ],
  Autoencoder: [
    { x: -2.5, y: -0.7, label: 'T1' },
    { x: -1.6, y: -0.1, label: 'T2' },
    { x: -0.9, y: 0.4, label: 'T3' },
    { x: -0.1, y: 0.8, label: 'T4' },
    { x: 0.6, y: 0.2, label: 'T5' },
    { x: 1.2, y: -0.4, label: 'T6' },
    { x: 2.0, y: -1.0, label: 'T7' },
  ],
};

const variance = [
  { name: 'CNN', pc1: 47, pc2: 22 },
  { name: 'Swin', pc1: 51, pc2: 19 },
  { name: 'Fused', pc1: 58, pc2: 17 },
  { name: 'ConvGRU', pc1: 63, pc2: 14 },
  { name: 'GNN', pc1: 54, pc2: 18 },
  { name: 'Autoencoder', pc1: 61, pc2: 15 },
];

const performance = [
  { name: 'CNN', rmse: 0.61, corr: 0.89 },
  { name: 'Swin', rmse: 0.55, corr: 0.91 },
  { name: 'Fused', rmse: 0.48, corr: 0.94 },
  { name: 'ConvGRU', rmse: 0.43, corr: 0.96 },
  { name: 'GNN', rmse: 0.57, corr: 0.90 },
  { name: 'Autoencoder', rmse: 0.60, corr: 0.88 },
];

const similarity = [
  [1.00, 0.86, 0.93, 0.89, 0.74, 0.70],
  [0.86, 1.00, 0.91, 0.90, 0.76, 0.72],
  [0.93, 0.91, 1.00, 0.95, 0.79, 0.76],
  [0.89, 0.90, 0.95, 1.00, 0.81, 0.78],
  [0.74, 0.76, 0.79, 0.81, 1.00, 0.83],
  [0.70, 0.72, 0.76, 0.78, 0.83, 1.00],
];

const scatterBox = { x: 60, y: 25, w: 720, h: 340 };

function sx(x: number) {
  return scatterBox.x + ((x + 3) / 6) * scatterBox.w;
}

function sy(y: number) {
  return scatterBox.y + ((2.5 - y) / 5) * scatterBox.h;
}

function heatColor(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const light = 88 - clamped * 48;
  return `hsl(190 90% ${light}%)`;
}

function StaticScatter() {
  return (
    <svg viewBox="0 0 820 420" className="w-full h-[430px]">
      <rect x="0" y="0" width="820" height="420" fill="transparent" />
      {[0, 1, 2, 3, 4, 5].map(i => {
        const x = scatterBox.x + (i / 5) * scatterBox.w;
        return <line key={`gx-${i}`} x1={x} y1={scatterBox.y} x2={x} y2={scatterBox.y + scatterBox.h} stroke="rgba(255,255,255,0.06)" />;
      })}
      {[0, 1, 2, 3, 4].map(i => {
        const y = scatterBox.y + (i / 4) * scatterBox.h;
        return <line key={`gy-${i}`} x1={scatterBox.x} y1={y} x2={scatterBox.x + scatterBox.w} y2={y} stroke="rgba(255,255,255,0.06)" />;
      })}

      <line x1={sx(0)} y1={scatterBox.y} x2={sx(0)} y2={scatterBox.y + scatterBox.h} stroke="rgba(255,255,255,0.12)" />
      <line x1={scatterBox.x} y1={sy(0)} x2={scatterBox.x + scatterBox.w} y2={sy(0)} stroke="rgba(255,255,255,0.12)" />

      <text x="410" y="410" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="12">PC1</text>
      <text x="18" y="205" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="12" transform="rotate(-90 18 205)">PC2</text>

      {models.map(model => {
        const points = pcaPoints[model.name];
        const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
        return (
          <g key={model.name}>
            <path d={path} fill="none" stroke={model.color} strokeWidth="1.3" opacity="0.45" />
            {points.map((p, index) => (
              <circle
                key={`${model.name}-${index}`}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r="6"
                fill={model.color}
                stroke="rgba(10,15,30,0.95)"
                strokeWidth="2"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({
  values,
  max,
  suffix = '',
}: {
  values: Array<{ name: string; value: number; color: string }>;
  max: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-4">
      {values.map(item => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/65">{item.name}</span>
            <span className="font-mono text-white/80">{item.value}{suffix}</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ModelComparisonPage() {
  const [activeModel, setActiveModel] = useState<ModelKey>('Fused');

  const active = models.find(m => m.name === activeModel) ?? models[2];

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <SectionHeader
          title="Model Comparison"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {models.map(model => (
            <button
              key={model.name}
              onClick={() => setActiveModel(model.name)}
              className={`text-left rounded-2xl border p-4 transition ${
                activeModel === model.name
                  ? 'border-cyan-400/40 bg-cyan-400/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: model.color }} />
                <span className="text-xs font-bold text-white">{model.name}</span>
              </div>
              <p className="text-[10px] text-white/35 mt-2">{model.role}</p>
              <p className="text-xl font-black text-cyan-300 mt-3">{model.dimension}</p>
              <p className="text-[10px] text-white/30">embedding channels</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Embedding Space — PCA</h2>
                <p className="text-xs text-white/35 mt-1">Static 2D illustration of temporal embeddings</p>
              </div>
              <span className="text-[10px] rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 px-2 py-1">6 models</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#080d1a] p-2">
              <StaticScatter />
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {models.map(model => (
                <div key={model.name} className="flex items-center gap-1.5 text-[10px] text-white/50">
                  <span className="h-2 w-2 rounded-full" style={{ background: model.color }} />
                  {model.name}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-base font-semibold text-white">Selected Representation</h2>
            <p className="text-xs text-white/35 mt-1">Click any model card above</p>

            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Active model</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="h-3 w-3 rounded-full" style={{ background: active.color }} />
                <h3 className="text-2xl font-black text-white">{active.name}</h3>
              </div>
              <p className="text-sm text-white/55 mt-2">{active.role}</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                  <p className="text-[10px] text-white/30">Dimension</p>
                  <p className="text-2xl font-black text-cyan-300 mt-1">{active.dimension}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                  <p className="text-[10px] text-white/30">Samples</p>
                  <p className="text-2xl font-black text-cyan-300 mt-1">7</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ['Input', '[1, 7, 7, 101, 241]'],
                ['CNN', '[1, 7, 48, 101, 241]'],
                ['Swin', '[1, 7, 13, 101, 241]'],
                ['Fusion', '[1, 7, 61, 101, 241]'],
                ['ConvGRU', '[1, 15, 101, 241]'],
              ].map(([label, shape]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                  <span className="text-xs text-white/55">{label}</span>
                  <span className="text-[10px] font-mono text-cyan-300/80">{shape}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-base font-semibold text-white">Embedding Dimensions</h2>
            <p className="text-xs text-white/35 mt-1 mb-5">Static architecture-size comparison</p>
            <BarChart
              max={64}
              values={models.map(model => ({ name: model.name, value: model.dimension, color: model.color }))}
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-base font-semibold text-white">PCA Explained Variance</h2>
            <p className="text-xs text-white/35 mt-1 mb-5">Illustrative PC1 + PC2 coverage</p>
            <div className="space-y-4">
              {variance.map(row => {
                const model = models.find(m => m.name === row.name)!;
                return (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="text-white/65">{row.name}</span>
                      <span className="font-mono text-white/65">PC1 {row.pc1}% · PC2 {row.pc2}%</span>
                    </div>
                    <div className="flex gap-1 h-3">
                      <div className="rounded-l-full" style={{ width: `${row.pc1}%`, background: model.color, opacity: 0.9 }} />
                      <div className="rounded-r-full" style={{ width: `${row.pc2}%`, background: model.color, opacity: 0.35 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <h2 className="text-base font-semibold text-white">Static Performance Comparison</h2>
            <p className="text-xs text-white/35 mt-1 mb-5">Illustrative comparison only — not measured backend results</p>

            <div className="space-y-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">RMSE — lower is better</div>
                {performance.map(row => {
                  const model = models.find(m => m.name === row.name)!;
                  return (
                    <div key={row.name} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/65">{row.name}</span>
                        <span className="font-mono text-white/70">{row.rmse.toFixed(2)} °C</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(row.rmse / 0.7) * 100}%`, background: model.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/8">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Correlation — higher is better</div>
                {performance.map(row => {
                  const model = models.find(m => m.name === row.name)!;
                  return (
                    <div key={row.name} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/65">{row.name}</span>
                        <span className="font-mono text-white/70">{row.corr.toFixed(2)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${row.corr * 100}%`, background: model.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 overflow-auto">
            <h2 className="text-base font-semibold text-white">Pairwise Similarity Matrix</h2>
            <p className="text-xs text-white/35 mt-1 mb-5">Illustrative embedding-space similarity</p>
            <table className="w-full text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="p-2 text-left text-white/30">Model</th>
                  {models.map(model => (
                    <th key={model.name} className="p-2 text-center text-white/35">{model.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((model, r) => (
                  <tr key={model.name}>
                    <td className="p-2 font-medium text-white/60 whitespace-nowrap">{model.name}</td>
                    {similarity[r].map((value, c) => (
                      <td key={`${r}-${c}`} className="p-0.5">
                        <div
                          className="rounded-lg px-2 py-3 text-center font-mono"
                          style={{ background: heatColor(value), color: value > 0.82 ? '#082f49' : '#e0f2fe' }}
                        >
                          {value.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.035] p-5">
          <h2 className="text-sm font-semibold text-cyan-300">Production representation reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
            {[
              ['1', '7-day surface input'],
              ['2', 'CNN 48 ch'],
              ['3', 'Swin 13 ch'],
              ['4', 'Fusion 61 ch'],
              ['5', 'ConvGRU → 15 depths'],
            ].map(([n, label]) => (
              <div key={n} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-center">
                <div className="mx-auto h-7 w-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-[10px] text-cyan-300 font-bold">{n}</div>
                <p className="text-[10px] text-white/50 mt-2">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-4">
            Demo note: GNN and Autoencoder values on this static page are visual placeholders only and must not be reported as trained-model measurements.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
