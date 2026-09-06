import { useEffect, useMemo, useState } from 'react';

import {
  Wind,
  Thermometer,
  Layers,
  Calendar,
  Activity,
  Droplets,
  Waves,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

import {
  format,
  parseISO,
} from 'date-fns';

import PageLayout, {
  SectionHeader,
} from '../components/PageLayout';

import {
  fetchSurface,
  fetchHeatmapAvailable,
  fetchHeatmapJson,
  getHeatmapUrl,
} from '../api/oceanApi';

// ─────────────────────────────────────────────────────────────────────────────
// Fallback values only when backend metadata does not provide these
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DATES = [
  '2024-12-26',
  '2024-12-27',
  '2024-12-28',
  '2024-12-29',
  '2024-12-30',
  '2024-12-31',
  '2025-01-01',
];

const DEFAULT_DEPTHS = [
  0,
  10,
  20,
  30,
  50,
  75,
  100,
  150,
  200,
  300,
  400,
  500,
  700,
  800,
  1000,
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

interface BackendHeatmapResponse {
  date?: string;
  depth_m?: number;
  depth_index?: number;

  // Normal expected field
  prediction_C?: unknown;

  // Possible backend alternatives
  prediction?: unknown;
  data?: unknown;

  // Backend may already provide a scalar summary
  mean_C?: number | null;
  min_C?: number | null;
  max_C?: number | null;

  shape?: number[];
}

interface ForecastDay {
  date: string;
  surface: SurfaceData;
}

interface ProfilePoint {
  depth: number;
  temperature: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function flattenNumeric(
  value: unknown,
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: number[] = [];

  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }

    if (
      typeof item === 'number' &&
      Number.isFinite(item)
    ) {
      result.push(item);
    }
  };

  value.forEach(visit);

  return result;
}

function average(
  values: number[],
): number {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

function averageGrid(
  values?: number[][],
): number {
  return average(
    flattenNumeric(values),
  );
}

function vectorMagnitude(
  u: number,
  v: number,
): number {
  return Math.sqrt(
    u * u + v * v,
  );
}

function tempColor(
  temperature: number,
): string {
  const n = Math.max(
    0,
    Math.min(
      1,
      (temperature - 2) / 27,
    ),
  );

  if (n < 0.25) return '#1e40af';
  if (n < 0.5) return '#06b6d4';
  if (n < 0.75) return '#fbbf24';

  return '#ef4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// Safely extract model temperature from backend JSON
// ─────────────────────────────────────────────────────────────────────────────

function extractTemperature(
  response: unknown,
): number {
  if (
    !response ||
    typeof response !== 'object'
  ) {
    throw new Error(
      'Backend returned an invalid heatmap JSON response.',
    );
  }

  const data =
    response as BackendHeatmapResponse;

  /*
   * Best case:
   * backend already sends mean_C
   */
  if (
    typeof data.mean_C === 'number' &&
    Number.isFinite(data.mean_C)
  ) {
    return data.mean_C;
  }

  /*
   * Otherwise try prediction_C.
   * It may be a 2D grid, 1D array, or scalar.
   */
  const candidates = [
    data.prediction_C,
    data.prediction,
    data.data,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'number' &&
      Number.isFinite(candidate)
    ) {
      return candidate;
    }

    const numericValues =
      flattenNumeric(candidate);

    if (numericValues.length > 0) {
      return average(
        numericValues,
      );
    }
  }

  throw new Error(
    `Backend heatmap JSON does not contain a usable temperature value. Received keys: ${Object.keys(
      data,
    ).join(', ')}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart tooltip
// ─────────────────────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: any) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div className="glass rounded-xl border border-white/15 p-3 text-xs shadow-xl space-y-1">

      <p className="text-white/50 mb-1">
        {label}
      </p>

      {payload.map(
        (item: any) => (
          <p
            key={item.dataKey}
            style={{
              color: item.color,
            }}
          >
            {item.name}:{' '}
            {typeof item.value === 'number'
              ? item.value.toFixed(2)
              : item.value}
          </p>
        ),
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini temperature column
// ─────────────────────────────────────────────────────────────────────────────

function DepthColumn({
  values,
}: {
  values: ProfilePoint[];
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-cyan-400/40">

      {values.map(
        item => (
          <div
            key={item.depth}
            title={`${item.depth}m: ${item.temperature.toFixed(2)}°C`}
            style={{
              background:
                tempColor(
                  item.temperature,
                ),
              height: '16px',
            }}
          />
        ),
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [
    predictionDates,
    setPredictionDates,
  ] = useState<string[]>(
    DEFAULT_DATES,
  );

  const [
    depths,
    setDepths,
  ] = useState<number[]>(
    DEFAULT_DEPTHS,
  );

  const [
    days,
    setDays,
  ] = useState<ForecastDay[]>([]);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(0);

  const [
    selectedDepth,
    setSelectedDepth,
  ] = useState(100);

  const [
    profileData,
    setProfileData,
  ] = useState<ProfilePoint[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    profileError,
    setProfileError,
  ] = useState<string | null>(
    null,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Load real backend data
  // ───────────────────────────────────────────────────────────────────────────

  async function loadBackendData() {
    try {
      setLoading(true);
      setError(null);

      console.log(
        '[ForecastPage] Loading backend metadata...',
      );

      let backendDates =
        DEFAULT_DATES;

      let backendDepths =
        DEFAULT_DEPTHS;

      // Get backend heatmap metadata
      try {
        const metadata =
          await fetchHeatmapAvailable();

        console.log(
          '[ForecastPage] Heatmap metadata:',
          metadata,
        );

        if (
          Array.isArray(
            metadata.available_dates,
          ) &&
          metadata.available_dates.length
        ) {
          const validDates =
            metadata.available_dates.filter(
              date =>
                typeof date ===
                  'string' &&
                date.length >= 10,
            );

          if (validDates.length) {
            backendDates =
              validDates.slice(-7);
          }
        }

        if (
          Array.isArray(
            metadata.depths_m,
          ) &&
          metadata.depths_m.length
        ) {
          backendDepths =
            metadata.depths_m;
        }
      } catch (metadataError) {
        console.warn(
          '[ForecastPage] Heatmap metadata unavailable. Using defaults.',
          metadataError,
        );
      }

      setPredictionDates(
        backendDates,
      );

      setDepths(
        backendDepths,
      );

      setSelectedDepth(
        currentDepth => {
          if (
            backendDepths.includes(
              currentDepth,
            )
          ) {
            return currentDepth;
          }

          return (
            backendDepths[
              Math.floor(
                backendDepths.length /
                  2,
              )
            ] ?? 100
          );
        },
      );

      // Get REAL surface data
      console.log(
        '[ForecastPage] Loading surface data...',
      );

      const backendDays =
        await Promise.all(
          backendDates.map(
            async date => {
              console.log(
                `[ForecastPage] GET /api/surface/${date}`,
              );

              const surface =
                await fetchSurface(
                  date,
                );

              return {
                date,
                surface:
                  surface as SurfaceData,
              };
            },
          ),
        );

      console.log(
        '[ForecastPage] Backend surface data:',
        backendDays,
      );

      setDays(
        backendDays,
      );

      setSelectedDay(
        currentDay =>
          Math.min(
            currentDay,
            Math.max(
              0,
              backendDays.length -
                1,
            ),
          ),
      );

    } catch (err) {
      console.error(
        '[ForecastPage] Backend request failed:',
        err,
      );

      setDays([]);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load forecast data from backend.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBackendData();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Active backend data
  // ───────────────────────────────────────────────────────────────────────────

  const safeSelectedDay =
    Math.min(
      selectedDay,
      Math.max(
        0,
        days.length - 1,
      ),
    );

  const activeDay =
    days[safeSelectedDay] ??
    null;

  const activeSurface =
    activeDay?.surface ??
    null;

  // ───────────────────────────────────────────────────────────────────────────
  // Real surface variables
  // ───────────────────────────────────────────────────────────────────────────

  const activeSst =
    averageGrid(
      activeSurface?.variables.sst,
    );

  const activeSss =
    averageGrid(
      activeSurface?.variables.sss,
    );

  const activeSsh =
    averageGrid(
      activeSurface?.variables.ssh,
    );

  const activeUWind =
    averageGrid(
      activeSurface?.variables.u_wind,
    );

  const activeVWind =
    averageGrid(
      activeSurface?.variables.v_wind,
    );

  const activeCurrentU =
    averageGrid(
      activeSurface?.variables.current_u,
    );

  const activeCurrentV =
    averageGrid(
      activeSurface?.variables.current_v,
    );

  const activeWindSpeed =
    vectorMagnitude(
      activeUWind,
      activeVWind,
    );

  const activeCurrentSpeed =
    vectorMagnitude(
      activeCurrentU,
      activeCurrentV,
    );

  const activeLatitude =
    activeSurface?.lat?.length
      ? average(
          activeSurface.lat,
        )
      : 0;

  // ───────────────────────────────────────────────────────────────────────────
  // REAL backend model depth profile
  // ───────────────────────────────────────────────────────────────────────────

  async function loadProfile(
    date: string,
  ) {
    try {
      setProfileLoading(true);
      setProfileError(null);
      setProfileData([]);

      console.log(
        `[ForecastPage] Loading model profile for ${date}`,
      );

      const result =
        await Promise.all(
          depths.map(
            async depth => {
              console.log(
                `[ForecastPage] GET /api/heatmap/${date}/${depth}/json`,
              );

              const response =
                await fetchHeatmapJson(
                  date,
                  depth,
                );

              console.log(
                `[ForecastPage] JSON response ${date}/${depth}:`,
                response,
              );

              const temperature =
                extractTemperature(
                  response,
                );

              return {
                depth,
                temperature,
              };
            },
          ),
        );

      setProfileData(
        result,
      );

    } catch (err) {
      console.error(
        '[ForecastPage] Profile request failed:',
        err,
      );

      setProfileData([]);

      setProfileError(
        err instanceof Error
          ? err.message
          : 'Failed to load the backend model depth profile.',
      );
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (!activeDay) {
      return;
    }

    loadProfile(
      activeDay.date,
    );
  }, [
    activeDay?.date,
    depths,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Current production heatmap URL
  // ───────────────────────────────────────────────────────────────────────────

  const heatmapUrl =
    activeDay
      ? getHeatmapUrl(
          activeDay.date,
          selectedDepth,
        )
      : '';

  // ───────────────────────────────────────────────────────────────────────────
  // REAL backend surface trend
  // ───────────────────────────────────────────────────────────────────────────

  const trendData =
    useMemo(
      () =>
        days.map(day => {
          const surface =
            day.surface;

          const sst =
            averageGrid(
              surface.variables.sst,
            );

          const ssh =
            averageGrid(
              surface.variables.ssh,
            );

          const wind =
            vectorMagnitude(
              averageGrid(
                surface.variables
                  .u_wind,
              ),
              averageGrid(
                surface.variables
                  .v_wind,
              ),
            );

          const current =
            vectorMagnitude(
              averageGrid(
                surface.variables
                  .current_u,
              ),
              averageGrid(
                surface.variables
                  .current_v,
              ),
            );

          return {
            date: format(
              parseISO(
                day.date,
              ),
              'MMM d',
            ),
            SST: +sst.toFixed(2),
            SSH: +ssh.toFixed(2),
            Wind: +wind.toFixed(2),
            Current:
              +current.toFixed(2),
          };
        }),
      [days],
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Loading state
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageLayout>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          <SectionHeader
            title="7-Day Subsurface Temperature Forecast"
            subtitle="Loading real OceanBed backend data..."
            icon={
              <Calendar
                size={16}
                className="text-cyan-400"
              />
            }
          />

          <div className="glass rounded-2xl border border-white/10 p-12 flex flex-col items-center justify-center">

            <Loader2
              size={32}
              className="text-cyan-400 animate-spin mb-4"
            />

            <p className="text-white font-medium">
              Connecting to production backend...
            </p>

            <p className="text-white/40 text-xs mt-2">
              Loading backend surface data and model metadata
            </p>

          </div>

        </div>

      </PageLayout>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Error state
  // ───────────────────────────────────────────────────────────────────────────

  if (
    error ||
    !activeDay ||
    !activeSurface
  ) {
    return (
      <PageLayout>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          <SectionHeader
            title="7-Day Subsurface Temperature Forecast"
            subtitle="Backend connection error"
            icon={
              <Calendar
                size={16}
                className="text-cyan-400"
              />
            }
          />

          <div className="glass rounded-2xl border border-red-500/20 p-8">

            <div className="flex items-center gap-3 mb-4">

              <AlertTriangle
                size={22}
                className="text-red-400"
              />

              <h2 className="text-lg font-semibold text-white">
                Could not load forecast data
              </h2>

            </div>

            <p className="text-sm text-red-300 mb-4">
              {error ||
                'The backend did not return the required data.'}
            </p>

            <p className="text-xs text-white/40 mb-5">
              Backend:
              {' '}
              http://127.0.0.1:8000
            </p>

            <button
              onClick={
                loadBackendData
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              <RefreshCw size={14} />
              Retry
            </button>

          </div>

        </div>

      </PageLayout>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Main UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <PageLayout>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <SectionHeader
          title="7-Day Subsurface Temperature Forecast"
          subtitle={`Production model output · ${
            format(
              parseISO(
                predictionDates[0],
              ),
              'MMM d',
            )
          } → ${
            format(
              parseISO(
                predictionDates[
                  predictionDates.length -
                    1
                ],
              ),
              'MMM d, yyyy',
            )
          }`}
          icon={
            <Calendar
              size={16}
              className="text-cyan-400"
            />
          }
        />

        {/* Backend status */}

        <div className="glass rounded-2xl p-4 border border-white/10 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <div className="flex items-center gap-2 mb-1">

                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

                <span className="text-xs uppercase tracking-wider text-green-400">
                  Backend Connected
                </span>

              </div>

              <p className="text-sm text-white/70">
                Source:{' '}
                <span className="text-cyan-400">
                  {activeSurface.source}
                </span>
              </p>

              <p className="text-xs text-white/30 mt-1">
                http://127.0.0.1:8000
              </p>

            </div>

            <button
              onClick={
                loadBackendData
              }
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              <RefreshCw size={14} />
              Refresh Backend Data
            </button>

          </div>

        </div>

        {/* Info badges */}

        <div className="flex flex-wrap gap-3 mb-8">

          {[
            {
              label: 'Dates',
              value: `${predictionDates.length} backend dates`,
            },
            {
              label: 'Depth Range',
              value: `${Math.min(...depths)}–${Math.max(...depths)} m`,
            },
            {
              label: 'Depth Levels',
              value: `${depths.length}`,
            },
            {
              label: 'Model',
              value: 'CNN + Swin + ConvGRU',
            },
            {
              label: 'Backend',
              value: '127.0.0.1:8000',
            },
          ].map(
            ({
              label,
              value,
            }) => (
              <div
                key={label}
                className="glass rounded-xl px-3 py-1.5 border border-cyan-500/20 text-xs"
              >
                <span className="text-white/40">
                  {label}:{' '}
                </span>

                <span className="text-cyan-400 font-medium">
                  {value}
                </span>
              </div>
            ),
          )}

        </div>

        {/* Date selector */}

        <div className="glass rounded-2xl p-4 border border-white/10 mb-6">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">

              <Calendar
                size={14}
                className="text-cyan-400"
              />

              Select Prediction Date

            </h2>

            <div className="flex items-center gap-2 text-xs text-white/40">

              <Clock size={11} />

              Real backend data

            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">

            {days.map(
              (
                day,
                index,
              ) => {

                const daySst =
                  averageGrid(
                    day.surface
                      .variables.sst,
                  );

                return (
                  <button
                    key={day.date}
                    onClick={() =>
                      setSelectedDay(
                        index,
                      )
                    }
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      safeSelectedDay ===
                      index
                        ? 'border-cyan-400/60 bg-cyan-500/15 scale-[1.03]'
                        : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >

                    <span className="text-[10px] text-white/40 uppercase tracking-wide">
                      Day {index + 1}
                    </span>

                    <span className="text-sm font-bold text-white">
                      {format(
                        parseISO(
                          day.date,
                        ),
                        'MMM d',
                      )}
                    </span>

                    <span
                      className="text-[11px] font-mono"
                      style={{
                        color:
                          tempColor(
                            daySst,
                          ),
                      }}
                    >
                      {daySst.toFixed(
                        2,
                      )}°C
                    </span>

                  </button>
                );
              },
            )}

          </div>

        </div>

        {/* Main data grid */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Heatmap */}

          <div className="glass rounded-2xl p-6 border border-white/10 depth-shadow">

            <div className="flex items-start justify-between gap-3 mb-3">

              <div>

                <h2 className="font-semibold text-white mb-1 flex items-center gap-2">

                  <Layers
                    size={15}
                    className="text-cyan-400"
                  />

                  Production Temperature Heatmap

                </h2>

                <p className="text-xs text-white/40">
                  Real backend model output
                </p>

              </div>

              <select
                value={selectedDepth}
                onChange={event =>
                  setSelectedDepth(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="bg-slate-900 border border-white/15 text-white text-xs rounded-lg px-2 py-1.5"
              >

                {depths.map(
                  depth => (
                    <option
                      key={depth}
                      value={depth}
                    >
                      {depth} m
                    </option>
                  ),
                )}

              </select>

            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">

              <img
                key={heatmapUrl}
                src={heatmapUrl}
                alt={`${selectedDepth}m production temperature heatmap`}
                className="w-full h-auto min-h-[320px] object-contain"
                loading="eager"
                onError={event => {

                  event.currentTarget.style.display =
                    'none';

                  const errorBox =
                    event.currentTarget
                      .parentElement
                      ?.querySelector(
                        '.heatmap-error',
                      ) as HTMLElement | null;

                  if (errorBox) {
                    errorBox.style.display =
                      'flex';
                  }

                }}
              />

              <div className="heatmap-error hidden min-h-[320px] items-center justify-center text-center p-6">

                <div>

                  <p className="text-red-400 text-sm font-semibold mb-2">
                    Heatmap could not be loaded
                  </p>

                  <p className="text-white/40 text-xs">
                    Backend:
                  </p>

                  <p className="text-cyan-400 text-xs font-mono mt-1 break-all">
                    {heatmapUrl}
                  </p>

                </div>

              </div>

            </div>

            <div className="flex justify-between mt-3 text-[10px] text-white/35">

              <span>
                {activeDay.date}
              </span>

              <span>
                {selectedDepth} m
              </span>

              <span>
                Production model
              </span>

            </div>

          </div>

          {/* Depth profile */}

          <div className="glass rounded-2xl p-6 border border-white/10 depth-shadow">

            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">

              <Layers
                size={15}
                className="text-cyan-400"
              />

              Model Depth Profile

            </h2>

            <p className="text-xs text-white/40 mb-4">

              Real backend JSON predictions

            </p>

            {profileLoading ? (

              <div className="h-[320px] flex flex-col items-center justify-center">

                <Loader2
                  size={28}
                  className="text-cyan-400 animate-spin mb-3"
                />

                <p className="text-xs text-white/50">
                  Loading model profile...
                </p>

              </div>

            ) : profileError ? (

              <div className="h-[320px] flex flex-col items-center justify-center text-center px-4">

                <AlertTriangle
                  size={26}
                  className="text-red-400 mb-3"
                />

                <p className="text-xs text-red-300">
                  {profileError}
                </p>

              </div>

            ) : profileData.length ===
              0 ? (

              <div className="h-[320px] flex items-center justify-center">

                <p className="text-xs text-white/30">
                  No model profile data returned
                </p>

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart
                  data={profileData}
                  layout="vertical"
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />

                  <XAxis
                    type="number"
                    domain={[
                      'auto',
                      'auto',
                    ]}
                    tick={{
                      fill:
                        'rgba(255,255,255,0.4)',
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value:
                        'Temperature (°C)',
                      fill:
                        'rgba(255,255,255,0.3)',
                      fontSize: 9,
                      position:
                        'insideBottom',
                    }}
                  />

                  <YAxis
                    type="number"
                    dataKey="depth"
                    reversed
                    tick={{
                      fill:
                        'rgba(255,255,255,0.4)',
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{
                      fill: '#06b6d4',
                      r: 3,
                    }}
                    name="Model Temperature (°C)"
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

          {/* Backend surface data */}

          <div className="space-y-4">

            <div className="glass rounded-2xl p-5 border border-white/10 depth-shadow">

              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">

                <Activity
                  size={15}
                  className="text-cyan-400"
                />

                Backend Surface Data

              </h2>

              <div className="grid grid-cols-2 gap-3">

                {[
                  {
                    label: 'SST',
                    value: `${activeSst.toFixed(2)} °C`,
                    icon: Thermometer,
                    className:
                      'text-red-400',
                  },
                  {
                    label: 'SSS',
                    value: `${activeSss.toFixed(2)} PSU`,
                    icon: Droplets,
                    className:
                      'text-blue-400',
                  },
                  {
                    label: 'SSH',
                    value: activeSsh.toFixed(
                      2,
                    ),
                    icon: Waves,
                    className:
                      'text-cyan-400',
                  },
                  {
                    label: 'Wind',
                    value: `${activeWindSpeed.toFixed(2)} m/s`,
                    icon: Wind,
                    className:
                      'text-green-400',
                  },
                  {
                    label: 'Current',
                    value: `${activeCurrentSpeed.toFixed(2)} m/s`,
                    icon: Activity,
                    className:
                      'text-purple-400',
                  },
                  {
                    label: 'Latitude',
                    value: `${activeLatitude.toFixed(2)}°N`,
                    icon: MapPin,
                    className:
                      'text-cyan-400',
                  },
                ].map(
                  ({
                    label,
                    value,
                    icon: Icon,
                    className,
                  }) => (
                    <div
                      key={label}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/8"
                    >

                      <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">

                        <Icon size={10} />

                        {label}

                      </div>

                      <p
                        className={`font-mono font-bold text-xs ${className}`}
                      >
                        {value}
                      </p>

                    </div>
                  ),
                )}

              </div>

              <div className="mt-4 pt-3 border-t border-white/10">

                <p className="text-[10px] text-white/30">
                  Backend source
                </p>

                <p className="text-xs text-cyan-400 mt-1 break-all">
                  {activeSurface.source}
                </p>

              </div>

            </div>

            {/* Mini profile */}

            <div className="glass rounded-2xl p-5 border border-white/10 depth-shadow">

              <h3 className="text-sm font-semibold text-white/80 mb-3">

                Model Temperature Column

              </h3>

              {profileData.length > 0 ? (

                <div className="grid grid-cols-[70px_1fr] gap-4 items-center">

                  <DepthColumn
                    values={
                      profileData
                    }
                  />

                  <div className="space-y-1 max-h-[250px] overflow-y-auto">

                    {profileData.map(
                      item => (
                        <div
                          key={
                            item.depth
                          }
                          className="flex justify-between text-[9px]"
                        >

                          <span className="text-white/30">
                            {
                              item.depth
                            }m
                          </span>

                          <span
                            className="font-mono"
                            style={{
                              color:
                                tempColor(
                                  item.temperature,
                                ),
                            }}
                          >
                            {item.temperature.toFixed(
                              1,
                            )}
                          </span>

                        </div>
                      ),
                    )}

                  </div>

                </div>

              ) : (

                <div className="text-xs text-white/30 py-8 text-center">
                  Profile unavailable
                </div>

              )}

            </div>

          </div>

        </div>

        {/* Backend surface trend */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          <div className="glass rounded-2xl p-6 border border-white/10 depth-shadow">

            <h3 className="font-semibold text-white mb-1">
              Backend SST / SSH Trend
            </h3>

            <p className="text-xs text-white/40 mb-4">
              Actual values returned by the backend
            </p>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <AreaChart
                data={trendData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fill:
                      'rgba(255,255,255,0.4)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill:
                      'rgba(255,255,255,0.4)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Area
                  type="monotone"
                  dataKey="SST"
                  stroke="#ef4444"
                  fill="rgba(239,68,68,0.12)"
                  strokeWidth={2.5}
                  name="SST (°C)"
                />

                <Area
                  type="monotone"
                  dataKey="SSH"
                  stroke="#06b6d4"
                  fill="rgba(6,182,212,0.10)"
                  strokeWidth={2}
                  name="SSH"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

          <div className="glass rounded-2xl p-6 border border-white/10 depth-shadow">

            <h3 className="font-semibold text-white mb-1">
              Backend Wind / Current Trend
            </h3>

            <p className="text-xs text-white/40 mb-4">
              Actual U/V derived magnitude from the backend
            </p>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <LineChart
                data={trendData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fill:
                      'rgba(255,255,255,0.4)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill:
                      'rgba(255,255,255,0.4)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="Wind"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{
                    fill: '#22c55e',
                    r: 3,
                  }}
                  name="Wind (m/s)"
                />

                <Line
                  type="monotone"
                  dataKey="Current"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{
                    fill: '#8b5cf6',
                    r: 3,
                  }}
                  name="Current (m/s)"
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

        {/* 7-day backend heatmaps */}

        <div className="glass rounded-2xl p-6 border border-white/10 depth-shadow mb-6">

          <h2 className="font-semibold text-white flex items-center gap-2 mb-1">

            <Layers
              size={15}
              className="text-cyan-400"
            />

            7-Day Production Heatmaps

          </h2>

          <p className="text-xs text-white/40 mb-5">
            Real backend model output at{' '}
            {selectedDepth} m
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">

            {days.map(
              (
                day,
                index,
              ) => {

                const imageUrl =
                  getHeatmapUrl(
                    day.date,
                    selectedDepth,
                  );

                return (
                  <button
                    key={`${day.date}-${selectedDepth}`}
                    onClick={() =>
                      setSelectedDay(
                        index,
                      )
                    }
                    className={`overflow-hidden rounded-xl border transition-all ${
                      safeSelectedDay ===
                      index
                        ? 'border-cyan-400/70 shadow-lg shadow-cyan-500/20'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >

                    <div className="bg-black/30 aspect-[1.8/1]">

                      <img
                        src={imageUrl}
                        alt={`${selectedDepth}m model heatmap ${day.date}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                    </div>

                    <div className="px-2 py-2 bg-white/5">

                      <p className="text-[10px] text-white/40">
                        Day {index + 1}
                      </p>

                      <p className="text-xs text-white font-medium">
                        {format(
                          parseISO(
                            day.date,
                          ),
                          'MMM d',
                        )}
                      </p>

                    </div>

                  </button>
                );
              },
            )}

          </div>

          <div className="mt-5 flex flex-wrap gap-2">

            {depths.map(
              depth => (
                <button
                  key={depth}
                  onClick={() =>
                    setSelectedDepth(
                      depth,
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${
                    selectedDepth ===
                    depth
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/10 text-white/40 hover:border-white/25'
                  }`}
                >
                  {depth}m
                </button>
              ),
            )}

          </div>

        </div>

        {/* Backend summary */}

        <div className="glass rounded-2xl border border-white/10 depth-shadow overflow-hidden">

          <div className="px-6 py-4 border-b border-white/10">

            <h3 className="font-semibold text-white flex items-center gap-2">

              <Calendar
                size={14}
                className="text-cyan-400"
              />

              Backend Forecast Summary

            </h3>

            <p className="text-xs text-white/40 mt-1">
              Surface data is read directly from the OceanBed API.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-xs">

              <thead>

                <tr className="border-b border-white/10">

                  {[
                    'Date',
                    'SST',
                    'SSS',
                    'SSH',
                    'Wind',
                    'Current',
                    'Source',
                  ].map(
                    heading => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-white/40 font-medium whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ),
                  )}

                </tr>

              </thead>

              <tbody>

                {days.map(
                  (
                    day,
                    index,
                  ) => {

                    const surface =
                      day.surface;

                    const sst =
                      averageGrid(
                        surface
                          .variables
                          .sst,
                      );

                    const sss =
                      averageGrid(
                        surface
                          .variables
                          .sss,
                      );

                    const ssh =
                      averageGrid(
                        surface
                          .variables
                          .ssh,
                      );

                    const wind =
                      vectorMagnitude(
                        averageGrid(
                          surface
                            .variables
                            .u_wind,
                        ),
                        averageGrid(
                          surface
                            .variables
                            .v_wind,
                        ),
                      );

                    const current =
                      vectorMagnitude(
                        averageGrid(
                          surface
                            .variables
                            .current_u,
                        ),
                        averageGrid(
                          surface
                            .variables
                            .current_v,
                        ),
                      );

                    return (
                      <tr
                        key={day.date}
                        onClick={() =>
                          setSelectedDay(
                            index,
                          )
                        }
                        className={`border-b border-white/5 cursor-pointer ${
                          safeSelectedDay ===
                          index
                            ? 'bg-cyan-500/10'
                            : 'hover:bg-white/5'
                        }`}
                      >

                        <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                          {format(
                            parseISO(
                              day.date,
                            ),
                            'MMM d, yyyy',
                          )}
                        </td>

                        <td
                          className="px-4 py-3 font-mono"
                          style={{
                            color:
                              tempColor(
                                sst,
                              ),
                          }}
                        >
                          {sst.toFixed(
                            2,
                          )}°C
                        </td>

                        <td className="px-4 py-3 font-mono text-blue-400">
                          {sss.toFixed(
                            2,
                          )} PSU
                        </td>

                        <td className="px-4 py-3 font-mono text-cyan-400">
                          {ssh.toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono text-green-400">
                          {wind.toFixed(
                            2,
                          )} m/s
                        </td>

                        <td className="px-4 py-3 font-mono text-purple-400">
                          {current.toFixed(
                            2,
                          )} m/s
                        </td>

                        <td className="px-4 py-3 text-white/40">
                          {surface.source}
                        </td>

                      </tr>
                    );
                  },
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </PageLayout>
  );
}