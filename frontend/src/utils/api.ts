const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper to get auth header
const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('mbdb_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Custom error class
export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // Handle CSV/file downloads differently
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new APIError('Failed to download file', response.status);
    }
    // Return the response directly for downstream blob conversion
    return response as unknown as T;
  }

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new APIError('Failed to parse response JSON', response.status);
  }

  if (!response.ok) {
    throw new APIError(data.error || 'Terjadi kesalahan pada server', response.status);
  }

  return data as T;
}

export const api = {
  // Get base URL for static images
  getMediaUrl: (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${BASE_URL}${path}`;
  },

  get: <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: any): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: any): Promise<T> =>
    request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),

  // Multipart form post for file uploads (pas foto)
  upload: <T>(path: string, formData: FormData): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      // Note: We MUST NOT set Content-Type header manually for FormData,
      // the browser will automatically set it along with the correct boundary boundary boundary.
      body: formData,
    }),
};
