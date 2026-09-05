/**
 * oceanApi.ts
 * API service layer for the OceanBed production backend.
 *
 * Backend:
 *   http://127.0.0.1:8000
 *
 * Current backend routes:
 *
 *   POST /chat
 *   GET  /health
 *   GET  /models
 *   GET  /metrics/summary
 *   GET  /api/report/{name}
 *   GET  /api/surface/{date}
 *   GET  /api/heatmap/available
 *   GET  /api/heatmap/{date}/{depth_m}
 *   GET  /api/heatmap/{date}/{depth_m}/json
 *   GET  /explain/model
 *   GET  /explain/depth/{depth}
 *
 * Embedding comparison route expected by the frontend:
 *
 *   POST /api/embeddings/compare
 */




// ─────────────────────────────────────────────────────────────────────────────
// Backend base URL
// ─────────────────────────────────────────────────────────────────────────────

const DIRECT =
  'http://127.0.0.1:8000'



// ─────────────────────────────────────────────────────────────────────────────
// Dataset date range
// ─────────────────────────────────────────────────────────────────────────────

const DATASET_START =
  '2018-01-01'

const DATASET_END =
  '2025-12-31'

const DEFAULT_DATE =
  '2024-06-15'



// ─────────────────────────────────────────────────────────────────────────────
// Date helper
// ─────────────────────────────────────────────────────────────────────────────

function clampDate(
  date: string,
): string {
  if (
    !date ||
    date.length < 10
  ) {
    return DEFAULT_DATE
  }

  const safeDate =
    date.slice(0, 10)

  if (
    safeDate <
    DATASET_START
  ) {
    return DATASET_START
  }

  if (
    safeDate >
    DATASET_END
  ) {
    return DATASET_END
  }

  return safeDate
}



// ─────────────────────────────────────────────────────────────────────────────
// Depth helper
// ─────────────────────────────────────────────────────────────────────────────

function normalizeDepth(
  depth: number,
): number {
  if (
    !Number.isFinite(depth)
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.round(depth),
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Shared fetch helper
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const controller =
    new AbortController()

  const timer =
    setTimeout(() => {
      controller.abort()
    }, 30_000)

  try {
    let response: Response

    try {
      response = await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal,
        },
      )
    } catch (error) {
      if (
        error instanceof
        DOMException &&
        error.name ===
          'AbortError'
      ) {
        throw new Error(
          `Request timed out after 30 seconds: ${url}`,
        )
      }

      if (
        error instanceof Error
      ) {
        throw new Error(
          `Network error while contacting backend: ${error.message}`,
        )
      }

      throw new Error(
        `Network error while contacting backend: ${url}`,
      )
    }

    const contentType =
      response.headers.get(
        'content-type',
      ) ?? ''

    const bodyText =
      await response
        .text()
        .catch(() => '')

    if (
      !response.ok
    ) {
      throw new Error(
        `Backend HTTP ${response.status} ${
          response.statusText
        }: ${bodyText.slice(
          0,
          500,
        )}`,
      )
    }

    if (
      !bodyText
    ) {
      return undefined as T
    }

    if (
      contentType.includes(
        'application/json',
      ) ||
      bodyText.trimStart().startsWith(
        '{',
      ) ||
      bodyText.trimStart().startsWith(
        '[',
      )
    ) {
      try {
        return JSON.parse(
          bodyText,
        ) as T
      } catch {
        throw new Error(
          `Backend returned invalid JSON from ${url}`,
        )
      }
    }

    /*
     * Some endpoints, especially image routes,
     * are not JSON. Those should not normally use
     * apiFetch(), but returning the text here makes
     * diagnostics much clearer.
     */
    return bodyText as T
  } finally {
    clearTimeout(timer)
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  reply: string
  source: string
  model: string
}


export interface MetricsBlock {
  rmse_C: number | null
  mae_C: number | null
  bias_C: number | null
  correlation: number | null
}


export interface MetricsSummary {
  validation_2023: MetricsBlock

  final_test_2024_2025: MetricsBlock
}


export interface DepthwiseMetric {
  depth_m: number
  rmse_C: number
  mae_C: number
  bias_C: number
  correlation: number
  n: number
}


export interface ReportResponse {
  overall_metrics?: {
    rmse_C: number
    mae_C: number
    bias_C: number
    correlation: number
    n_valid: number
  }

  depthwise_metrics?: DepthwiseMetric[]

  [key: string]: unknown
}


export interface SurfaceResponse {
  date: string

  lat: number[]

  lon: number[]

  source: string

  variables: {
    sst: number[][]
    sss: number[][]
    ssh: number[][]
    u_wind: number[][]
    v_wind: number[][]
    current_u: number[][]
    current_v: number[][]
  }
}


export interface HealthResponse {
  status: string
  device: string
  cnn_loaded: boolean
  swin_loaded: boolean
  convgru_loaded: boolean

  /*
   * Optional fields because your newer
   * backend /health response may include them.
   */
  ocean_mask_exists?: boolean
  backend_checks_pass?: boolean

  torch?: {
    installed?: boolean
    version?: string
    cuda_available?: boolean
    cuda_version?: string | null
    gpu_name?: string | null

    [key: string]: unknown
  }

  [key: string]: unknown
}


export interface HeatmapAvailableResponse {
  depths_m: number[]
  input_window_days: number
  input_shape: number[]
  output_shape: number[]
  variables: string[]
  available_dates?: string[]
}


/**
 * Flexible JSON response for the production heatmap endpoint.
 *
 * Your frontend now safely supports:
 *
 *   prediction_C
 *   prediction
 *   data
 *   mean_C
 *   min_C
 *   max_C
 *
 * The backend may return a 2D grid, 1D array,
 * or an already-computed scalar.
 */
export interface HeatmapJsonResponse {
  date?: string

  depth_m?: number

  depth_index?: number

  prediction_C?: unknown

  prediction?: unknown

  data?: unknown

  shape?: number[]

  min_C?: number | null

  max_C?: number | null

  mean_C?: number | null

  [key: string]: unknown
}



// ─────────────────────────────────────────────────────────────────────────────
// Embedding comparison types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request sent to:
 *
 *   POST /api/embeddings/compare
 */
export interface EmbeddingCompareRequest {
  /**
   * Models to compare.
   *
   * Supported production/experimental names can be:
   *
   *   cnn
   *   swin
   *   gnn
   *   autoencoder
   *   convgru
   *
   * The backend decides which models are actually available.
   */
  models?: string[]

  /**
   * Dimensionality-reduction / visualization method.
   */
  method?: 'pca' | 'none'

  /**
   * Optional ocean depth.
   */
  depth_m?: number

  /**
   * Optional date.
   */
  date?: string

  /**
   * Maximum number of embedding samples
   * requested from the backend.
   */
  limit?: number
}


/**
 * Result for one embedding model.
 */
export interface EmbeddingModelResult {
  /**
   * Model name.
   */
  model: string

  /**
   * Shape of the raw embedding tensor.
   *
   * Example:
   *
   *   [1, 48, 101, 241]
   */
  embedding_shape?: number[]

  /**
   * Flattened/projected embedding dimension.
   */
  embedding_dimension?: number

  /**
   * Optional PCA/UMAP/t-SNE coordinates.
   */
  coordinates?: number[][]

  /**
   * Optional quantitative comparison metrics.
   */
  rmse_C?: number | null

  mae_C?: number | null

  correlation?: number | null

  /**
   * Number of samples used.
   */
  samples?: number

  /**
   * PCA explained variance.
   */
  explained_variance?: number[]

  /**
   * Any backend-specific metadata.
   */
  metadata?: Record<string, unknown>

  [key: string]: unknown
}


/**
 * Full response from:
 *
 *   POST /api/embeddings/compare
 */
export interface EmbeddingCompareResponse {
  success?: boolean

  method?: string

  models?: string[]

  results?: EmbeddingModelResult[]

  /**
   * Optional backend comparison information.
   *
   * Example:
   * {
   *   "cnn_vs_swin": ...
   * }
   */
  comparison?: Record<string, unknown>

  /**
   * Optional visualization data.
   */
  plot?: {
    x?: number[]
    y?: number[]
    labels?: string[]
  }

  message?: string

  [key: string]: unknown
}



// ─────────────────────────────────────────────────────────────────────────────
// Backend URL helper
// ─────────────────────────────────────────────────────────────────────────────

export function getBackendUrl(): string {
  return DIRECT
}



// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /chat
 */
export async function sendChat(
  message: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(
    `${DIRECT}/chat`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        message,
      }),
    },
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /health
 */
export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>(
    `${DIRECT}/health`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /metrics/summary
 */
export async function fetchMetricsSummary(): Promise<MetricsSummary> {
  return apiFetch<MetricsSummary>(
    `${DIRECT}/metrics/summary`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Validation reports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/report/{name}
 *
 * Supported:
 *
 *   validation_2023
 *   final_test_2024_2025
 */
export async function fetchReport(
  name: string,
): Promise<ReportResponse> {
  if (!name) {
    throw new Error(
      'Report name cannot be empty.',
    )
  }

  return apiFetch<ReportResponse>(
    `${DIRECT}/api/report/${encodeURIComponent(
      name,
    )}`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Surface data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/surface/{date}
 *
 * Returns:
 *
 *   SST
 *   SSS
 *   SSH
 *   U/V wind
 *   U/V currents
 */
export async function fetchSurface(
  date: string,
): Promise<SurfaceResponse> {
  const safeDate =
    clampDate(date)

  return apiFetch<SurfaceResponse>(
    `${DIRECT}/api/surface/${safeDate}`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Heatmap metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/heatmap/available
 *
 * Returns available:
 *
 *   depths
 *   dates
 *   model input/output shapes
 *   variables
 */
export async function fetchHeatmapAvailable(): Promise<HeatmapAvailableResponse> {
  return apiFetch<HeatmapAvailableResponse>(
    `${DIRECT}/api/heatmap/available`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Heatmap image URL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the URL for the production-model
 * heatmap PNG.
 *
 * Example:
 *
 *   http://127.0.0.1:8000/api/heatmap/2025-01-01/100
 */
export function getHeatmapUrl(
  date: string,
  depth: number,
): string {
  const safeDate =
    clampDate(date)

  const safeDepth =
    normalizeDepth(depth)

  return (
    `${DIRECT}/api/heatmap/` +
    `${safeDate}/` +
    `${safeDepth}`
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Heatmap JSON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/heatmap/{date}/{depth_m}/json
 *
 * Returns production model prediction data.
 */
export async function fetchHeatmapJson(
  date: string,
  depth: number,
): Promise<HeatmapJsonResponse> {
  const safeDate =
    clampDate(date)

  const safeDepth =
    normalizeDepth(depth)

  return apiFetch<HeatmapJsonResponse>(
    `${DIRECT}/api/heatmap/${safeDate}/${safeDepth}/json`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Model information
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /models
 */
export async function fetchModelInfo(): Promise<
  Record<string, unknown>
> {
  return apiFetch<
    Record<string, unknown>
  >(
    `${DIRECT}/models`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING COMPARISON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/embeddings/compare
 *
 * Main API call used by the Embedding Compare frontend.
 *
 * Example request:
 *
 * {
 *   models: [
 *     'cnn',
 *     'swin',
 *     'gnn',
 *     'autoencoder'
 *   ],
 *   method: 'pca',
 *   limit: 500
 * }
 *
 * IMPORTANT:
 *
 * This function does NOT generate embeddings in the frontend.
 * The backend must calculate / load the real embeddings and
 * return the result.
 */
export async function compareEmbeddings(
  request: EmbeddingCompareRequest = {},
): Promise<EmbeddingCompareResponse> {
  const safeModels =
    request.models &&
    request.models.length > 0
      ? request.models
      : [
          'cnn',
          'swin',
          'gnn',
          'autoencoder',
        ]

  const safeMethod =
    request.method ?? 'pca'

  const payload: Record<
    string,
    unknown
  > = {
    models: safeModels,
    method: safeMethod,
  }

  if (
    request.depth_m !== undefined
  ) {
    payload.depth_m =
      normalizeDepth(
        request.depth_m,
      )
  }

  if (
    request.date
  ) {
    payload.date =
      clampDate(
        request.date,
      )
  }

  if (
    request.limit !== undefined
  ) {
    const safeLimit =
      Math.max(
        1,
        Math.round(
          request.limit,
        ),
      )

    payload.limit =
      safeLimit
  }

  return apiFetch<EmbeddingCompareResponse>(
    `${DIRECT}/api/embeddings/compare`,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(
        payload,
      ),
    },
  )
}


/**
 * GET /api/embeddings/compare
 *
 * Convenience function for a backend that provides
 * a default comparison result through GET.
 *
 * This is optional and should only be used if your
 * backend exposes the GET route.
 */
export async function fetchEmbeddingComparison(): Promise<EmbeddingCompareResponse> {
  return apiFetch<EmbeddingCompareResponse>(
    `${DIRECT}/api/embeddings/compare`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Model explanation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /explain/model
 */
export async function fetchModelExplanation(): Promise<
  Record<string, unknown>
> {
  return apiFetch<
    Record<string, unknown>
  >(
    `${DIRECT}/explain/model`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Depth explanation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /explain/depth/{depth}
 */
export async function fetchDepthExplanation(
  depth: number,
): Promise<Record<string, unknown>> {
  const safeDepth =
    normalizeDepth(depth)

  return apiFetch<
    Record<string, unknown>
  >(
    `${DIRECT}/explain/depth/${safeDepth}`,
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// Backend connectivity check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convenience helper for pages that only need to
 * verify that the backend is reachable.
 *
 * GET /health
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    await fetchHealth()
    return true
  } catch (error) {
    console.error(
      '[oceanApi] Backend connection failed:',
      error,
    )

    return false
  }
}