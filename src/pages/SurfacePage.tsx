import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Thermometer,
  Droplets,
  Waves,
  Wind,
  MapPin,
  Info,
  Eye,
  Layers,
  X as XIcon,
} from 'lucide-react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

import PageLayout, { SectionHeader } from '../components/PageLayout';
import {
  fetchSurface,
  type SurfaceResponse,
} from '../api/oceanApi';

type VarMode = 'sst' | 'sss' | 'ssh' | 'uwind' | 'vwind';

type BackendVariable =
  | 'sst'
  | 'sss'
  | 'ssh'
  | 'u_wind'
  | 'v_wind';

interface HoverInfo {
  lat: number;
  lon: number;
  val: number;
  x: number;
  y: number;
}

interface ClickedPointData {
  lat: number;
  lon: number;
  sst: number | null;
  sss: number | null;
  ssh: number | null;
  uwind: number | null;
  vwind: number | null;
  date: string;
}

const LAT_MIN = 5;
const LAT_MAX = 30;
const LON_MIN = 45;
const LON_MAX = 105;

const VAR_CONFIG: Record<
  VarMode,
  {
    label: string;
    unit: string;
    min: number;
    max: number;
    gradStart: string;
    gradEnd: string;
    backendVar: BackendVariable;
  }
> = {
  sst: {
    label: 'Sea Surface Temperature',
    unit: '°C',
    min: 24,
    max: 32,
    gradStart: '#1e3a8a',
    gradEnd: '#ef4444',
    backendVar: 'sst',
  },

  sss: {
    label: 'Sea Surface Salinity',
    unit: 'PSU',
    min: 30,
    max: 38,
    gradStart: '#1e3a8a',
    gradEnd: '#a855f7',
    backendVar: 'sss',
  },

  ssh: {
    label: 'Sea Surface Height',
    unit: 'cm',
    min: -30,
    max: 30,
    gradStart: '#1e3a8a',
    gradEnd: '#06b6d4',
    backendVar: 'ssh',
  },

  uwind: {
    label: 'Surface Wind U',
    unit: 'm/s',
    min: -15,
    max: 15,
    gradStart: '#1e3a8a',
    gradEnd: '#10b981',
    backendVar: 'u_wind',
  },

  vwind: {
    label: 'Surface Wind V',
    unit: 'm/s',
    min: -15,
    max: 15,
    gradStart: '#1e3a8a',
    gradEnd: '#10b981',
    backendVar: 'v_wind',
  },
};

const VAR_TABS = [
  { id: 'sst' as VarMode, label: 'SST', icon: Thermometer },
  { id: 'sss' as VarMode, label: 'SSS', icon: Droplets },
  { id: 'ssh' as VarMode, label: 'SSH', icon: Waves },
  { id: 'uwind' as VarMode, label: 'U-Wind', icon: Wind },
  { id: 'vwind' as VarMode, label: 'V-Wind', icon: Wind },
];

/*
 * Backend validation dataset:
 * 2023-01-01 -> 2023-12-31
 */
const BACKEND_DATES = eachDayOfInterval({
  start: new Date('2023-01-01T00:00:00'),
  end: new Date('2023-12-31T00:00:00'),
}).map((d) => format(d, 'yyyy-MM-dd'));

function valueToColor(
  val: number,
  min: number,
  max: number,
  gradStart: string,
  gradEnd: string
): string {
  const n = Math.max(
    0,
    Math.min(1, (val - min) / (max - min))
  );

  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  const [r1, g1, b1] = parse(gradStart);
  const [r2, g2, b2] = parse(gradEnd);

  const r = Math.round(r1 + (r2 - r1) * n);
  const g = Math.round(g1 + (g2 - g1) * n);
  const b = Math.round(b1 + (b2 - b1) * n);

  return `rgba(${r},${g},${b},0.88)`;
}

function normalizeGrid(value: unknown): number[][] | null {
  if (!Array.isArray(value)) return null;

  const result: number[][] = [];

  for (const row of value) {
    if (!Array.isArray(row)) continue;

    const numericRow = row.map((v) => {
      if (typeof v === 'number') return v;

      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    });

    result.push(numericRow);
  }

  return result.length ? result : null;
}

function getBackendGrid(
  surfaceData: SurfaceResponse | null,
  variable: BackendVariable
): number[][] | null {
  if (!surfaceData?.variables) return null;

  return normalizeGrid(
    surfaceData.variables[variable]
  );
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function getGridValue(
  grid: number[][] | null,
  row: number,
  col: number
): number | null {
  if (!grid) return null;

  return safeNumber(grid[row]?.[col]);
}

export default function SurfacePage() {
  const [searchParams] = useSearchParams();

  const [dateIndex, setDateIndex] = useState(
    BACKEND_DATES.length - 1
  );

  const selectedDate =
    BACKEND_DATES[dateIndex];

  const [surfaceData, setSurfaceData] =
    useState<SurfaceResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mode, setMode] =
    useState<VarMode>('sst');

  const [showGrid, setShowGrid] =
    useState(true);

  const [hover, setHover] =
    useState<HoverInfo | null>(null);

  const [clickedPoint, setClickedPoint] =
    useState<ClickedPointData | null>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const paramLat = searchParams.get('lat')
    ? parseFloat(searchParams.get('lat')!)
    : null;

  const paramLon = searchParams.get('lon')
    ? parseFloat(searchParams.get('lon')!)
    : null;

  const hasPin =
    Number.isFinite(paramLat) &&
    Number.isFinite(paramLon);

  /*
   * REAL BACKEND REQUEST
   *
   * GET /api/surface/{date}
   */
  useEffect(() => {
    if (!selectedDate) return;

    abortRef.current?.abort();

    const controller =
      new AbortController();

    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setClickedPoint(null);

    console.log(
      '[SurfacePage] Fetching backend surface data:',
      selectedDate
    );

    fetchSurface(selectedDate)
      .then((data) => {
        if (controller.signal.aborted) return;

        console.log(
          '[SurfacePage] Backend surface response:',
          data
        );

        setSurfaceData(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;

        console.error(
          '[SurfacePage] Backend surface error:',
          err
        );

        setSurfaceData(null);
        setError(
          err?.message ||
            'Failed to fetch surface data from backend.'
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate]);

  const cfg = VAR_CONFIG[mode];

  /*
   * IMPORTANT:
   * This is the actual grid returned by backend.
   * No IDW.
   * No generated values.
   */
  const backendGrid = useMemo(
    () =>
      getBackendGrid(
        surfaceData,
        cfg.backendVar
      ),
    [surfaceData, cfg.backendVar]
  );

  const rows =
    backendGrid?.length ?? 0;

  const cols =
    backendGrid && backendGrid.length
      ? Math.max(
          ...backendGrid.map(
            (row) => row.length
          )
        )
      : 0;

  const flatValues = useMemo(() => {
    if (!backendGrid) return [];

    return backendGrid
      .flat()
      .filter(
        (v) =>
          typeof v === 'number' &&
          Number.isFinite(v)
      );
  }, [backendGrid]);

  const minValue =
    flatValues.length
      ? Math.min(...flatValues)
      : 0;

  const maxValue =
    flatValues.length
      ? Math.max(...flatValues)
      : 0;

  const meanValue =
    flatValues.length
      ? flatValues.reduce(
          (a, b) => a + b,
          0
        ) / flatValues.length
      : 0;

  /*
   * Click on the REAL backend grid.
   */
  const handleCellClick = (
    rowIndex: number,
    colIndex: number
  ) => {
    if (!surfaceData || !backendGrid) {
      return;
    }

    const sst =
      getBackendGrid(
        surfaceData,
        'sst'
      );

    const sss =
      getBackendGrid(
        surfaceData,
        'sss'
      );

    const ssh =
      getBackendGrid(
        surfaceData,
        'ssh'
      );

    const uwind =
      getBackendGrid(
        surfaceData,
        'u_wind'
      );

    const vwind =
      getBackendGrid(
        surfaceData,
        'v_wind'
      );

    const lat =
      rows <= 1
        ? (LAT_MIN + LAT_MAX) / 2
        : LAT_MAX -
          (rowIndex / (rows - 1)) *
            (LAT_MAX - LAT_MIN);

    const lon =
      cols <= 1
        ? (LON_MIN + LON_MAX) / 2
        : LON_MIN +
          (colIndex / (cols - 1)) *
            (LON_MAX - LON_MIN);

    setClickedPoint({
      lat: Number(lat.toFixed(3)),
      lon: Number(lon.toFixed(3)),

      sst: getGridValue(
        sst,
        rowIndex,
        colIndex
      ),

      sss: getGridValue(
        sss,
        rowIndex,
        colIndex
      ),

      ssh: getGridValue(
        ssh,
        rowIndex,
        colIndex
      ),

      uwind: getGridValue(
        uwind,
        rowIndex,
        colIndex
      ),

      vwind: getGridValue(
        vwind,
        rowIndex,
        colIndex
      ),

      date: selectedDate,
    });
  };

  const pinX =
    hasPin
      ? ((paramLon! - LON_MIN) /
          (LON_MAX - LON_MIN)) *
        100
      : null;

  const pinY =
    hasPin
      ? ((LAT_MAX - paramLat!) /
          (LAT_MAX - LAT_MIN)) *
        100
      : null;

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <SectionHeader
          title="Surface Observations"
          subtitle="Real backend surface observations · North Indian Ocean"
          icon={
            <Eye
              size={16}
              className="text-cyan-400"
            />
          }
        />

        {/* BACKEND STATUS */}
        {loading && (
          <div className="mb-4 flex items-center gap-2 glass rounded-xl border border-white/10 p-3">
            <div className="w-3 h-3 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />

            <span className="text-xs text-white/50">
              Fetching real surface data from
              backend for {selectedDate}...
            </span>
          </div>
        )}

        {!loading &&
          surfaceData && (
            <div className="mb-4 flex items-center gap-2 glass rounded-xl border border-green-500/20 p-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

              <span className="text-xs text-white/50">
                Backend connected ·{' '}
                {surfaceData.date} ·{' '}
                Source:{' '}
                {surfaceData.source}
              </span>
            </div>
          )}

        {error && (
          <div className="mb-4 glass rounded-xl border border-red-500/30 p-3">
            <span className="text-xs text-red-400">
              Backend request failed:{' '}
              {error}
            </span>
          </div>
        )}

        {/* PIN */}
        {hasPin && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl glass border border-red-500/30">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <MapPin
                size={16}
                className="text-red-400"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Selected location
              </p>

              <p className="text-xs text-white/40">
                {paramLat!.toFixed(2)}°N ·{' '}
                {paramLon!.toFixed(2)}°E
              </p>
            </div>
          </div>
        )}

        {/* INFO */}
        <div className="flex flex-wrap gap-2 mb-6">

          <div className="glass rounded-lg px-3 py-1.5 border border-white/10 text-xs">
            <span className="text-white/40">
              Domain:{' '}
            </span>

            <span className="text-cyan-400">
              {LAT_MIN}°N–{LAT_MAX}°N,{' '}
              {LON_MIN}°E–{LON_MAX}°E
            </span>
          </div>

          <div className="glass rounded-lg px-3 py-1.5 border border-white/10 text-xs">
            <span className="text-white/40">
              Grid:{' '}
            </span>

            <span className="text-cyan-400">
              {rows && cols
                ? `${rows}×${cols}`
                : 'Loading'}
            </span>
          </div>

          <div className="glass rounded-lg px-3 py-1.5 border border-white/10 text-xs">
            <span className="text-white/40">
              Date:{' '}
            </span>

            <span className="text-cyan-400">
              {selectedDate}
            </span>
          </div>

          <div className="glass rounded-lg px-3 py-1.5 border border-white/10 text-xs">
            <span className="text-white/40">
              Source:{' '}
            </span>

            <span className="text-cyan-400">
              {surfaceData?.source ??
                'Backend'}
            </span>
          </div>

        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1 glass rounded-xl border border-white/10 mb-6 w-fit overflow-x-auto">

          {VAR_TABS.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setClickedPoint(
                    null
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  mode === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          )}

          <button
            onClick={() =>
              setShowGrid((v) => !v)
            }
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs ml-1 ${
              showGrid
                ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Layers size={12} />
            Grid
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* HEATMAP */}
          <div className="lg:col-span-3">

            <div className="glass rounded-2xl border border-white/10 depth-shadow overflow-hidden">

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <span className="text-sm font-medium text-white/70">
                  {cfg.label} ({cfg.unit})
                </span>

                <span className="text-xs text-white/40">
                  Backend grid
                </span>
              </div>

              <div
                className="relative select-none bg-slate-950"
                style={{
                  aspectRatio:
                    cols && rows
                      ? `${cols}/${rows}`
                      : '2 / 1',
                }}
                onMouseLeave={() =>
                  setHover(null)
                }
              >

                {backendGrid &&
                  rows > 0 &&
                  cols > 0 &&
                  backendGrid.map(
                    (row, ri) =>
                      row.map(
                        (val, ci) => {
                          if (
                            !Number.isFinite(
                              val
                            )
                          ) {
                            return null;
                          }

                          const lat =
                            rows <= 1
                              ? (LAT_MIN +
                                  LAT_MAX) /
                                2
                              : LAT_MAX -
                                (ri /
                                  (rows -
                                    1)) *
                                  (LAT_MAX -
                                    LAT_MIN);

                          const lon =
                            cols <= 1
                              ? (LON_MIN +
                                  LON_MAX) /
                                2
                              : LON_MIN +
                                (ci /
                                  (cols -
                                    1)) *
                                  (LON_MAX -
                                    LON_MIN);

                          const width =
                            100 / cols;

                          const height =
                            100 / rows;

                          return (
                            <div
                              key={`${ri}-${ci}`}
                              className="absolute cursor-crosshair"
                              style={{
                                left: `${ci * width}%`,
                                top: `${ri * height}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                background:
                                  valueToColor(
                                    val,
                                    cfg.min,
                                    cfg.max,
                                    cfg.gradStart,
                                    cfg.gradEnd
                                  ),
                                border:
                                  showGrid
                                    ? '1px solid rgba(255,255,255,0.025)'
                                    : 'none',
                              }}
                              onMouseEnter={(
                                e
                              ) => {
                                const parent =
                                  e.currentTarget.parentElement;

                                const rect =
                                  parent?.getBoundingClientRect();

                                setHover({
                                  lat,
                                  lon,
                                  val,
                                  x: rect
                                    ? e.clientX -
                                      rect.left
                                    : 0,
                                  y: rect
                                    ? e.clientY -
                                      rect.top
                                    : 0,
                                });
                              }}
                              onClick={() =>
                                handleCellClick(
                                  ri,
                                  ci
                                )
                              }
                            />
                          );
                        }
                      )
                  )}

                {!loading &&
                  (!backendGrid ||
                    flatValues.length ===
                      0) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-white/40">
                        No backend data
                        available for{' '}
                        {selectedDate}
                      </p>
                    </div>
                  )}

                {hover && (
                  <div
                    className="absolute z-20 pointer-events-none glass rounded-xl px-3 py-2 border border-white/20 text-xs shadow-2xl"
                    style={{
                      left: hover.x + 12,
                      top: hover.y - 10,
                    }}
                  >
                    <p className="text-white/50 mb-1">
                      {hover.lat.toFixed(2)}
                      °N ·{' '}
                      {hover.lon.toFixed(2)}
                      °E
                    </p>

                    <p className="font-bold text-white">
                      {cfg.label}:{' '}
                      {hover.val.toFixed(3)}{' '}
                      {cfg.unit}
                    </p>
                  </div>
                )}

                {hasPin &&
                  pinX !== null &&
                  pinY !== null &&
                  pinX >= 0 &&
                  pinX <= 100 &&
                  pinY >= 0 &&
                  pinY <= 100 && (
                    <div
                      className="absolute z-30 pointer-events-none"
                      style={{
                        left: `${pinX}%`,
                        top: `${pinY}%`,
                        transform:
                          'translate(-50%, -100%)',
                      }}
                    >
                      <div className="flex flex-col items-center">

                        <div className="glass rounded-lg px-2 py-1 border border-red-500/50 bg-red-500/20 text-[10px] text-red-300 whitespace-nowrap mb-1">
                          {paramLat!.toFixed(2)}
                          °N,{' '}
                          {paramLon!.toFixed(2)}
                          °E
                        </div>

                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />

                        <div className="w-0.5 h-3 bg-red-400/70" />

                      </div>
                    </div>
                  )}

              </div>

              {/* DATE SLIDER */}
              <div className="px-4 py-3 border-t border-white/8">

                <input
                  type="range"
                  min={0}
                  max={
                    BACKEND_DATES.length -
                    1
                  }
                  value={dateIndex}
                  onChange={(e) =>
                    setDateIndex(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full accent-cyan-400"
                />

                <div className="flex justify-between text-xs text-white/25 mt-1">

                  <span>
                    {format(
                      parseISO(
                        BACKEND_DATES[0]
                      ),
                      'MMM d, yyyy'
                    )}
                  </span>

                  <span className="text-cyan-400">
                    {format(
                      parseISO(
                        selectedDate
                      ),
                      'MMM d, yyyy'
                    )}
                  </span>

                  <span>
                    {format(
                      parseISO(
                        BACKEND_DATES[
                          BACKEND_DATES.length -
                            1
                        ]
                      ),
                      'MMM d, yyyy'
                    )}
                  </span>

                </div>
              </div>

            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-5">

            {/* COLOR SCALE */}
            <div className="glass rounded-2xl p-5 border border-white/10 depth-shadow">

              <h3 className="text-sm font-semibold text-white/80 mb-4">
                {cfg.label} ({cfg.unit})
              </h3>

              <div
                className="h-40 w-6 rounded-full mx-auto mb-3"
                style={{
                  background:
                    `linear-gradient(to bottom, ${cfg.gradEnd}, ${cfg.gradStart})`,
                }}
              />

              <div className="flex justify-between text-xs text-white/40">
                <span>
                  {cfg.max} {cfg.unit}
                </span>

                <span>
                  {cfg.min} {cfg.unit}
                </span>
              </div>

              <p className="text-[10px] text-white/30 mt-2 text-center">
                Backend source
              </p>

            </div>

            {/* STATS */}
            <div className="glass rounded-2xl p-5 border border-white/10 depth-shadow space-y-3">

              <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Info
                  size={14}
                  className="text-cyan-400"
                />
                Backend Statistics
              </h3>

              {[
                {
                  label: 'Min',
                  value: `${minValue.toFixed(
                    3
                  )} ${cfg.unit}`,
                },
                {
                  label: 'Max',
                  value: `${maxValue.toFixed(
                    3
                  )} ${cfg.unit}`,
                },
                {
                  label: 'Mean',
                  value: `${meanValue.toFixed(
                    3
                  )} ${cfg.unit}`,
                },
                {
                  label: 'Range',
                  value: `${(
                    maxValue -
                    minValue
                  ).toFixed(3)} ${
                    cfg.unit
                  }`,
                },
                {
                  label: 'Grid',
                  value:
                    rows && cols
                      ? `${rows} × ${cols}`
                      : '—',
                },
              ].map(
                ({
                  label,
                  value,
                }) => (
                  <div
                    key={label}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-white/50">
                      {label}
                    </span>

                    <span className="text-white font-medium">
                      {value}
                    </span>
                  </div>
                )
              )}

            </div>

            {/* CLICKED POINT */}
            {clickedPoint && (
              <div className="glass rounded-2xl p-5 border border-cyan-500/25 depth-shadow space-y-3">

                <div className="flex items-center justify-between">

                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MapPin
                      size={14}
                      className="text-cyan-400"
                    />
                    Backend Grid Point
                  </h3>

                  <button
                    onClick={() =>
                      setClickedPoint(
                        null
                      )
                    }
                    className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <XIcon
                      size={10}
                      className="text-white/60"
                    />
                  </button>

                </div>

                <p className="text-xs text-white/40 font-mono">
                  {clickedPoint.lat}°N ·{' '}
                  {clickedPoint.lon}°E
                </p>

                <p className="text-xs text-white/30">
                  {clickedPoint.date}
                </p>

                <div className="space-y-2">

                  {[
                    {
                      label: 'SST',
                      value:
                        clickedPoint.sst,
                      unit: '°C',
                    },
                    {
                      label: 'SSS',
                      value:
                        clickedPoint.sss,
                      unit: 'PSU',
                    },
                    {
                      label: 'SSH',
                      value:
                        clickedPoint.ssh,
                      unit: 'cm',
                    },
                    {
                      label: 'U-Wind',
                      value:
                        clickedPoint.uwind,
                      unit: 'm/s',
                    },
                    {
                      label: 'V-Wind',
                      value:
                        clickedPoint.vwind,
                      unit: 'm/s',
                    },
                  ].map(
                    ({
                      label,
                      value,
                      unit,
                    }) => (
                      <div
                        key={label}
                        className="flex justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/8"
                      >
                        <span className="text-white/50 text-xs">
                          {label}
                        </span>

                        <span className="font-mono font-bold text-xs text-cyan-400">
                          {value !== null
                            ? `${value.toFixed(
                                3
                              )} ${unit}`
                            : 'N/A'}
                        </span>
                      </div>
                    )
                  )}

                </div>

                <p className="text-[10px] text-white/25 pt-1 border-t border-white/8">
                  Values are read directly
                  from the backend grid.
                </p>

              </div>
            )}

          </div>
        </div>
      </div>
    </PageLayout>
  );
}