import { useEffect, useMemo, useState } from 'react';
import {
  Wind,
  Activity,
  Target,
  RefreshCw,
  Database,
  AlertTriangle,
  MapPin,
  Thermometer,
  Loader2,
  TrendingUp,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';

import PageLayout, {
  SectionHeader,
} from '../components/PageLayout';

import { fetchSurface } from '../api/oceanApi';

type RiskLabel =
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'Severe';

interface SurfaceData {
  date: string;
  lat: number[];
  lon: number[];
  source: string;
  variables: {
    sst: number[][];
    sss: number[][];
    ssh: number[][];
    u_wind: number[][];
    v_wind: number[][];
    current_u: number[][];
    current_v: number[][];
  };
}

interface RiskResult {
  score: number;
  label: RiskLabel;
  intensity: string;
}

interface TrackPoint {
  hour: string;
  lat: number;
  lon: number;
  probability: number;
  windSpeed: number;
  pressure: number;
}

function getValidValues(data?: number[][]): number[] {
  if (!data) return [];

  return data
    .flat()
    .filter(
      (value): value is number =>
        typeof value === 'number' &&
        Number.isFinite(value),
    );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

function averageGrid(data?: number[][]): number {
  return average(getValidValues(data));
}

function calculateWindSpeed(
  u: number,
  v: number,
): number {
  return Math.sqrt(u * u + v * v);
}

/*
 * IMPORTANT:
 *
 * This page gets the ocean variables from the REAL backend.
 *
 * Your current oceanApi.ts does NOT expose a cyclone-model
 * prediction endpoint, so this risk score is only a derived
 * frontend calculation from the backend surface data.
 */
function calculateRisk(
  sst: number,
  ssh: number,
  windSpeed: number,
): RiskResult {
  let score = 0;

  if (sst >= 30) {
    score += 35;
  } else if (sst >= 28) {
    score += 25;
  } else if (sst >= 26) {
    score += 15;
  }

  if (ssh >= 15) {
    score += 20;
  } else if (ssh >= 5) {
    score += 10;
  } else if (ssh <= -10) {
    score -= 5;
  }

  if (windSpeed < 5) {
    score += 15;
  } else if (windSpeed < 8) {
    score += 8;
  } else if (windSpeed > 12) {
    score -= 10;
  }

  score = Math.max(
    5,
    Math.min(95, Math.round(score)),
  );

  let label: RiskLabel;
  let intensity: string;

  if (score >= 75) {
    label = 'Severe';
    intensity = 'Severe Cyclonic Storm';
  } else if (score >= 55) {
    label = 'High';
    intensity = 'Cyclonic Storm';
  } else if (score >= 30) {
    label = 'Moderate';
    intensity = 'Deep Depression';
  } else {
    label = 'Low';
    intensity = 'Low Pressure Area';
  }

  return {
    score,
    label,
    intensity,
  };
}

function buildTrack(
  score: number,
  lat: number,
  lon: number,
): TrackPoint[] {
  return Array.from(
    { length: 7 },
    (_, index) => {
      const hours = index * 12;

      const decay = Math.max(
        0.2,
        1 - index * 0.08,
      );

      return {
        hour:
          hours === 0
            ? 'Now'
            : `+${hours}h`,

        lat: +(
          lat +
          index * 0.75 +
          Math.sin(index * 0.5) * 0.25
        ).toFixed(2),

        lon: +(
          lon -
          index * 0.9 +
          Math.cos(index * 0.4) * 0.2
        ).toFixed(2),

        probability: Math.round(
          score * decay,
        ),

        windSpeed: Math.round(
          30 +
          score * 0.55 * decay,
        ),

        pressure: Math.round(
          1005 -
          score * 0.15 * decay,
        ),
      };
    },
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: any) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/90 p-3 shadow-xl">
      <p className="mb-2 text-xs text-white/40">
        {label}
      </p>

      {payload.map((item: any) => (
        <p
          key={item.dataKey}
          className="text-xs text-white/80"
        >
          {item.name}:{' '}
          {typeof item.value === 'number'
            ? item.value.toFixed(2)
            : item.value}
        </p>
      ))}
    </div>
  );
}

export default function CyclonePage() {
  const [
    selectedDate,
    setSelectedDate,
  ] = useState('2025-01-01');

  const [
    surface,
    setSurface,
  ] = useState<SurfaceData | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    'prediction' | 'track' | 'factors'
  >('prediction');

  /*
   * REAL BACKEND REQUEST
   *
   * fetchSurface() from src/api/oceanApi.ts calls:
   *
   * GET http://127.0.0.1:8000/api/surface/{date}
   */
  async function loadSurfaceData(
    date: string,
  ) {
    try {
      setLoading(true);
      setError(null);

      console.log(
        '[CyclonePage] Requesting backend data:',
        date,
      );

      const result =
        await fetchSurface(date);

      console.log(
        '[CyclonePage] Backend response:',
        result,
      );

      setSurface(
        result as SurfaceData,
      );
    } catch (err) {
      console.error(
        '[CyclonePage] Backend error:',
        err,
      );

      setSurface(null);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load backend data.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSurfaceData(selectedDate);
  }, [selectedDate]);

  /*
   * These values come directly from:
   *
   * surface.variables.*
   *
   * returned by the backend.
   */

  const sst = useMemo(
    () =>
      averageGrid(
        surface?.variables?.sst,
      ),
    [surface],
  );

  const sss = useMemo(
    () =>
      averageGrid(
        surface?.variables?.sss,
      ),
    [surface],
  );

  const ssh = useMemo(
    () =>
      averageGrid(
        surface?.variables?.ssh,
      ),
    [surface],
  );

  const uWind = useMemo(
    () =>
      averageGrid(
        surface?.variables?.u_wind,
      ),
    [surface],
  );

  const vWind = useMemo(
    () =>
      averageGrid(
        surface?.variables?.v_wind,
      ),
    [surface],
  );

  const currentU = useMemo(
    () =>
      averageGrid(
        surface?.variables?.current_u,
      ),
    [surface],
  );

  const currentV = useMemo(
    () =>
      averageGrid(
        surface?.variables?.current_v,
      ),
    [surface],
  );

  const windSpeed =
    calculateWindSpeed(
      uWind,
      vWind,
    );

  const currentSpeed =
    calculateWindSpeed(
      currentU,
      currentV,
    );

  const latitude = useMemo(() => {
    if (
      !surface?.lat?.length
    ) {
      return 0;
    }

    return average(
      surface.lat.filter(
        value => Number.isFinite(value),
      ),
    );
  }, [surface]);

  const longitude = useMemo(() => {
    if (
      !surface?.lon?.length
    ) {
      return 0;
    }

    return average(
      surface.lon.filter(
        value => Number.isFinite(value),
      ),
    );
  }, [surface]);

  const risk = useMemo(
    () =>
      calculateRisk(
        sst,
        ssh,
        windSpeed,
      ),
    [
      sst,
      ssh,
      windSpeed,
    ],
  );

  const track = useMemo(
    () =>
      buildTrack(
        risk.score,
        latitude,
        longitude,
      ),
    [
      risk.score,
      latitude,
      longitude,
    ],
  );

  const riskColor =
    risk.label === 'Severe'
      ? '#ef4444'
      : risk.label === 'High'
        ? '#f97316'
        : risk.label === 'Moderate'
          ? '#eab308'
          : '#22c55e';

  const radarData = [
    {
      feature: 'SST',
      value: Math.min(
        100,
        Math.max(
          0,
          ((sst - 24) / 8) * 100,
        ),
      ),
    },
    {
      feature: 'SSH',
      value: Math.min(
        100,
        Math.max(
          0,
          ((ssh + 30) / 60) * 100,
        ),
      ),
    },
    {
      feature: 'Wind',
      value: Math.min(
        100,
        Math.max(
          0,
          ((15 - windSpeed) / 15) * 100,
        ),
      ),
    },
    {
      feature: 'SSS',
      value: Math.min(
        100,
        Math.max(
          0,
          ((sss - 30) / 8) * 100,
        ),
      ),
    },
    {
      feature: 'Current',
      value: Math.min(
        100,
        currentSpeed * 10,
      ),
    },
  ];

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

          <SectionHeader
            title="Cyclone Prediction"
            subtitle="Loading OceanBed backend data"
            icon={
              <Wind
                size={16}
                className="text-cyan-400"
              />
            }
          />

          <div className="glass flex flex-col items-center justify-center rounded-2xl border border-white/10 p-12">

            <Loader2
              size={32}
              className="mb-4 animate-spin text-cyan-400"
            />

            <p className="font-medium text-white">
              Connecting to backend...
            </p>

            <p className="mt-2 text-xs text-white/40">
              GET /api/surface/{selectedDate}
            </p>

          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !surface) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

          <SectionHeader
            title="Cyclone Prediction"
            subtitle="Backend connection error"
            icon={
              <Wind
                size={16}
                className="text-cyan-400"
              />
            }
          />

          <div className="glass rounded-2xl border border-red-500/20 p-8">

            <div className="mb-4 flex items-center gap-3">

              <AlertTriangle
                size={22}
                className="text-red-400"
              />

              <h2 className="font-semibold text-white">
                Could not load backend data
              </h2>

            </div>

            <p className="mb-4 text-sm text-red-300">
              {error ||
                'Backend returned no data.'}
            </p>

            <p className="mb-5 text-xs text-white/40">
              Backend:
              {' '}
              http://127.0.0.1:8000
            </p>

            <button
              onClick={() =>
                loadSurfaceData(
                  selectedDate,
                )
              }
              className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <RefreshCw size={14} />
              Retry
            </button>

          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        <SectionHeader
          title="Cyclone Prediction"
          subtitle="OceanBed backend · Real surface ocean conditions"
          icon={
            <Wind
              size={16}
              className="text-cyan-400"
            />
          }
        />

        {/* Backend status */}

        <div className="glass mb-6 rounded-2xl border border-white/10 p-4">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="mb-1 flex items-center gap-2">

                <Database
                  size={14}
                  className="text-cyan-400"
                />

                <span className="text-xs uppercase tracking-wider text-white/40">
                  Backend Connected
                </span>

              </div>

              <p className="text-sm text-white/70">
                Source:{' '}
                <span className="text-cyan-400">
                  {surface.source}
                </span>
              </p>

              <p className="mt-1 text-xs text-white/30">
                GET /api/surface/{surface.date}
              </p>

            </div>

            <div className="flex items-center gap-3">

              <input
                type="date"
                min="2018-01-01"
                max="2025-12-31"
                value={selectedDate}
                onChange={event =>
                  setSelectedDate(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />

              <button
                onClick={() =>
                  loadSurfaceData(
                    selectedDate,
                  )
                }
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <RefreshCw size={14} />
                Refresh
              </button>

            </div>
          </div>
        </div>

        {/* Main card */}

        <div
          className="glass mb-8 rounded-2xl border p-6"
          style={{
            borderColor:
              `${riskColor}55`,
          }}
        >

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

            {/* Risk */}

            <div className="flex flex-col items-center justify-center">

              <div className="relative h-40 w-40">

                <svg
                  className="-rotate-90"
                  viewBox="0 0 120 120"
                >

                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="10"
                  />

                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={riskColor}
                    strokeWidth="10"
                    strokeDasharray={`${risk.score * 3.14} 314`}
                    strokeLinecap="round"
                  />

                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">

                  <span className="text-4xl font-black text-white">
                    {risk.score}%
                  </span>

                  <span className="text-xs text-white/40">
                    risk
                  </span>

                </div>

              </div>

              <span
                className="mt-3 rounded-full border px-4 py-1.5 text-sm font-bold"
                style={{
                  color: riskColor,
                  borderColor:
                    `${riskColor}66`,
                  backgroundColor:
                    `${riskColor}18`,
                }}
              >
                {risk.label} Risk
              </span>

            </div>

            {/* Details */}

            <div className="space-y-5">

              <div>

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Predicted System
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {risk.intensity}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Backend Grid Center
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">

                  <MapPin
                    size={13}
                    className="text-cyan-400"
                  />

                  {latitude.toFixed(2)}°N,{' '}
                  {longitude.toFixed(2)}°E

                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Data Date
                </p>

                <p className="mt-1 text-sm text-white/70">
                  {surface.date}
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-green-400">

                <Database size={11} />

                Data loaded from backend

              </div>

            </div>

            {/* Conditions */}

            <div>

              <p className="mb-4 text-xs uppercase tracking-wider text-white/40">
                Backend Conditions
              </p>

              <div className="space-y-4">

                <div className="flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm text-white/50">

                    <Thermometer size={13} />

                    SST

                  </span>

                  <span className="font-mono text-sm text-white">
                    {sst.toFixed(2)} °C
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm text-white/50">

                    <Activity size={13} />

                    SSS

                  </span>

                  <span className="font-mono text-sm text-white">
                    {sss.toFixed(2)}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm text-white/50">

                    <TrendingUp size={13} />

                    SSH

                  </span>

                  <span className="font-mono text-sm text-white">
                    {ssh.toFixed(2)}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm text-white/50">

                    <Wind size={13} />

                    Wind

                  </span>

                  <span className="font-mono text-sm text-white">
                    {windSpeed.toFixed(2)} m/s
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm text-white/50">

                    <Activity size={13} />

                    Current

                  </span>

                  <span className="font-mono text-sm text-white">
                    {currentSpeed.toFixed(2)} m/s
                  </span>

                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Tabs */}

        <div className="glass mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 p-1">

          <button
            onClick={() =>
              setActiveTab('prediction')
            }
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm ${
              activeTab === 'prediction'
                ? 'border border-cyan-500/30 bg-cyan-500/10 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Target size={14} />
              Prediction
            </span>
          </button>

          <button
            onClick={() =>
              setActiveTab('track')
            }
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm ${
              activeTab === 'track'
                ? 'border border-cyan-500/30 bg-cyan-500/10 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Wind size={14} />
              72h Track
            </span>
          </button>

          <button
            onClick={() =>
              setActiveTab('factors')
            }
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm ${
              activeTab === 'factors'
                ? 'border border-cyan-500/30 bg-cyan-500/10 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Activity size={14} />
              Risk Factors
            </span>
          </button>

        </div>

        {/* Prediction */}

        {activeTab === 'prediction' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div className="glass rounded-2xl border border-white/10 p-6">

              <h3 className="mb-1 font-semibold text-white">
                Backend Ocean Data
              </h3>

              <p className="mb-5 text-xs text-white/40">
                Values returned by:
                {' '}
                /api/surface/{surface.date}
              </p>

              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <LineChart
                  data={[
                    {
                      variable: 'SST',
                      value: sst,
                    },
                    {
                      variable: 'SSS',
                      value: sss,
                    },
                    {
                      variable: 'SSH',
                      value: ssh,
                    },
                  ]}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />

                  <XAxis
                    dataKey="variable"
                    tick={{
                      fill:
                        'rgba(255,255,255,0.45)',
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    tick={{
                      fill:
                        'rgba(255,255,255,0.45)',
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    content={
                      <ChartTooltip />
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Backend value"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

            <div className="glass rounded-2xl border border-white/10 p-6">

              <h3 className="mb-1 font-semibold text-white">
                Wind Conditions
              </h3>

              <p className="mb-5 text-xs text-white/40">
                Real U/V wind values from backend
              </p>

              <div className="space-y-5">

                <div>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="text-white/50">
                      U Wind
                    </span>

                    <span className="font-mono text-white">
                      {uWind.toFixed(3)} m/s
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/5">

                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.abs(uWind) *
                            10,
                        )}%`,
                      }}
                    />

                  </div>

                </div>

                <div>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="text-white/50">
                      V Wind
                    </span>

                    <span className="font-mono text-white">
                      {vWind.toFixed(3)} m/s
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/5">

                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.abs(vWind) *
                            10,
                        )}%`,
                      }}
                    />

                  </div>

                </div>

                <div className="border-t border-white/10 pt-5">

                  <div className="flex justify-between">

                    <span className="text-sm text-white/50">
                      Wind magnitude
                    </span>

                    <span className="font-mono font-bold text-orange-400">
                      {windSpeed.toFixed(2)} m/s
                    </span>

                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* Track */}

        {activeTab === 'track' && (
          <div className="glass rounded-2xl border border-white/10 p-6">

            <h3 className="mb-1 font-semibold text-white">
              72-Hour Track
            </h3>

            <p className="mb-6 text-xs text-white/40">
              Derived from current backend ocean conditions.
            </p>

            <div className="overflow-x-auto">

              <table className="w-full text-xs">

                <thead>

                  <tr className="border-b border-white/10">

                    <th className="px-3 py-3 text-left text-white/40">
                      Time
                    </th>

                    <th className="px-3 py-3 text-left text-white/40">
                      Latitude
                    </th>

                    <th className="px-3 py-3 text-left text-white/40">
                      Longitude
                    </th>

                    <th className="px-3 py-3 text-left text-white/40">
                      Wind
                    </th>

                    <th className="px-3 py-3 text-left text-white/40">
                      Pressure
                    </th>

                    <th className="px-3 py-3 text-left text-white/40">
                      Probability
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {track.map(
                    point => (
                      <tr
                        key={point.hour}
                        className="border-b border-white/5"
                      >

                        <td className="px-3 py-3 text-white/70">
                          {point.hour}
                        </td>

                        <td className="px-3 py-3 font-mono text-white/60">
                          {point.lat}°N
                        </td>

                        <td className="px-3 py-3 font-mono text-white/60">
                          {point.lon}°E
                        </td>

                        <td className="px-3 py-3 font-mono text-orange-400">
                          {point.windSpeed} km/h
                        </td>

                        <td className="px-3 py-3 font-mono text-purple-400">
                          {point.pressure} hPa
                        </td>

                        <td
                          className="px-3 py-3 font-mono"
                          style={{
                            color:
                              riskColor,
                          }}
                        >
                          {point.probability}%
                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>
          </div>
        )}

        {/* Factors */}

        {activeTab === 'factors' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div className="glass rounded-2xl border border-white/10 p-6">

              <h3 className="mb-1 font-semibold text-white">
                Ocean Risk Factors
              </h3>

              <p className="mb-4 text-xs text-white/40">
                Based on real backend surface data.
              </p>

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <RadarChart
                  data={radarData}
                >

                  <PolarGrid
                    stroke="rgba(255,255,255,0.08)"
                  />

                  <PolarAngleAxis
                    dataKey="feature"
                    tick={{
                      fill:
                        'rgba(255,255,255,0.55)',
                      fontSize: 11,
                    }}
                  />

                  <Radar
                    name="Risk factor"
                    dataKey="value"
                    stroke={riskColor}
                    fill={riskColor}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />

                </RadarChart>

              </ResponsiveContainer>

            </div>

            <div className="glass rounded-2xl border border-white/10 p-6">

              <h3 className="mb-5 font-semibold text-white">
                Backend Variables
              </h3>

              <div className="space-y-4">

                {[
                  [
                    'Sea Surface Temperature',
                    `${sst.toFixed(3)} °C`,
                  ],
                  [
                    'Sea Surface Salinity',
                    sss.toFixed(3),
                  ],
                  [
                    'Sea Surface Height',
                    ssh.toFixed(3),
                  ],
                  [
                    'U Wind',
                    `${uWind.toFixed(3)} m/s`,
                  ],
                  [
                    'V Wind',
                    `${vWind.toFixed(3)} m/s`,
                  ],
                  [
                    'Current U',
                    `${currentU.toFixed(3)} m/s`,
                  ],
                  [
                    'Current V',
                    `${currentV.toFixed(3)} m/s`,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-white/5 pb-3"
                    >

                      <span className="text-sm text-white/50">
                        {label}
                      </span>

                      <span className="font-mono text-sm font-medium text-white/80">
                        {value}
                      </span>

                    </div>
                  ),
                )}

              </div>

              <div className="mt-5 border-t border-white/10 pt-4">

                <p className="text-xs text-white/30">
                  Backend endpoint
                </p>

                <p className="mt-1 font-mono text-xs text-cyan-400">
                  GET
                  {' '}
                  /api/surface/{surface.date}
                </p>

              </div>

            </div>

          </div>
        )}

      </div>

    </PageLayout>
  );
}