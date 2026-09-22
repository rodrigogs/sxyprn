export type TransportResponse = {
  body: unknown;
  statusCode?: number;
  url: string;
};

export type TransportOptions = {
  url: string;
  headers: Record<string, string>;
  http2: boolean;
  responseType: 'text';
  throwHttpErrors: true;
  retry: { limit: 0 };
  timeout: { request: number };
  proxyUrl?: string;
};

export type Transport = (
  options: TransportOptions,
) => Promise<TransportResponse>;

export type RequestOptions = {
  headers?: Record<string, string>;
  sleep?: (milliseconds: number) => Promise<void>;
  transport?: Transport;
  random?: () => number;
  now?: () => number;
  /** Route requests through an HTTP(S) proxy (e.g. to avoid datacenter-IP blocks). */
  proxyUrl?: string;
  /**
   * Minimum spacing between request starts, shared across every createRequest
   * instance in the process (module-level throttle). Use to stay polite
   * against rate limiters. The shared value can only grow, and it never drops
   * below `DEFAULT_MIN_REQUEST_INTERVAL_MS` (10s, robots.txt Crawl-delay).
   */
  minRequestIntervalMs?: number;
};

export type RequestResponse = {
  data: string;
  statusCode?: number;
  url: string;
};

export type RetryableError = Error & {
  code?: string;
  name?: string;
};

export type SharedRequestConfig = {
  minRequestIntervalMs: number;
  proxyUrl?: string;
};

/** Public configuration surface (`sxyprn.configure`). */
export type SxyprnConfig = {
  minRequestIntervalMs?: number;
  proxyUrl?: string;
};
