const API_URL = 'http://localhost:8000';

export const api = {
  baseUrl: API_URL,

  heatmapUrl: (date: string, depth: number) =>
    `${API_URL}/api/heatmap/${date}/${depth}`,

  heatmapAvailableUrl: () =>
    `${API_URL}/api/heatmap/available`,

  phase1Url: () =>
    `${API_URL}/cyclone/phase1/predict`,

  surfaceUrl: (date: string) =>
    `${API_URL}/api/surface/${date}`,

  predictUrl: () =>
    `${API_URL}/predict`,

  healthUrl: () =>
    `${API_URL}/health`,
};