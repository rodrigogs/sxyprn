import { gotScraping } from 'got-scraping';
import type {
  RequestOptions,
  RequestResponse,
  RetryableError,
  SharedRequestConfig,
  SxyprnConfig,
} from './types/base.js';

export const BASE_URL = 'https://sxyprn.com';

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  referer: `${BASE_URL}/`,
};

const REQUEST_TIMEOUT = 20_000;
const REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 750;
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
]);

/**
 * sxyprn.com serves plain 200s to datacenter IPs but robots.txt declares
 * `Crawl-delay: 10`, so the shared throttle starts armed at 10s and is a floor:
 * callers can raise the interval, never lower it. Override only if you own the
 * politeness decision (`configureRequest`).
 */
export const DEFAULT_MIN_REQUEST_INTERVAL_MS = 10_000;

export const resolveUrl = (path?: string): string => {
  if (!path) {
    return '';
  }

  return new URL(path, BASE_URL).toString();
};

export const delay = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const shouldRetry = (error: unknown): error is RetryableError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const retryable = error as RetryableError;

  return (
    retryable.name === 'TimeoutError' ||
    (retryable.code !== undefined && RETRYABLE_ERROR_CODES.has(retryable.code))
  );
};

/**
 * Exponential backoff with full jitter (AWS recommended): the delay for a
 * given attempt is a uniform random value in [0, base * 2^(attempt-1)).
 * Jitter avoids thundering-herd retry storms against rate limiters.
 */
export const computeRetryDelay = (
  attempt: number,
  random: () => number = Math.random,
): number => {
  const base = RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  return Math.round(base * random());
};

let sharedConfig: SharedRequestConfig = {
  minRequestIntervalMs: DEFAULT_MIN_REQUEST_INTERVAL_MS,
};
let sharedLastRequestStart = 0;

/**
 * Module-level configuration shared by every createRequest instance in the
 * process. The throttle is the LARGEST interval anyone asked for, so concurrent
 * sections (videos.ts and any user-created client) stay collectively polite,
 * and a proxy can be applied globally without touching internals.
 */
export const configureRequest = (config: SxyprnConfig = {}): void => {
  sharedConfig = {
    ...sharedConfig,
    ...config,
    minRequestIntervalMs: Math.max(
      sharedConfig.minRequestIntervalMs,
      config.minRequestIntervalMs ?? 0,
    ),
  };
};

export const resetSharedThrottle = (): void => {
  sharedConfig = { minRequestIntervalMs: DEFAULT_MIN_REQUEST_INTERVAL_MS };
  sharedLastRequestStart = 0;
};

/**
 * Reserve the next throttle slot SYNCHRONOUSLY, before any await: concurrent
 * callers serialize on `sharedLastRequestStart`, so simultaneous waiters can't
 * compute the same stale-anchor sleep, wake up together and fire in a burst
 * (breaking the minimum spacing). Returns the milliseconds to wait.
 */
export const reserveRequestSlot = (
  now: () => number,
  minRequestIntervalMs: number,
): number => {
  const current = now();
  const start = Math.max(
    current,
    sharedLastRequestStart + minRequestIntervalMs,
  );
  sharedLastRequestStart = start;

  return start - current;
};

export const createRequest = (options: RequestOptions = {}) => {
  if (options.minRequestIntervalMs !== undefined) {
    sharedConfig = {
      ...sharedConfig,
      minRequestIntervalMs: Math.max(
        sharedConfig.minRequestIntervalMs,
        options.minRequestIntervalMs,
      ),
    };
  }

  return {
    async get(path: string): Promise<RequestResponse> {
      const transport = options.transport ?? gotScraping;
      const sleep = options.sleep ?? delay;
      const now = options.now ?? Date.now;
      const proxyUrl = sharedConfig.proxyUrl ?? options.proxyUrl;
      let attempt = 1;

      while (true) {
        try {
          const wait = reserveRequestSlot(
            now,
            sharedConfig.minRequestIntervalMs,
          );

          if (wait > 0) {
            await sleep(wait);
          }

          const response = await transport({
            url: resolveUrl(path),
            headers: {
              ...DEFAULT_HEADERS,
              ...options.headers,
            },
            http2: false,
            responseType: 'text',
            throwHttpErrors: true,
            retry: {
              limit: 0,
            },
            timeout: {
              request: REQUEST_TIMEOUT,
            },
            proxyUrl,
          });

          return {
            data:
              typeof response.body === 'string'
                ? response.body
                : String(response.body),
            statusCode: response.statusCode,
            url: response.url,
          };
        } catch (error) {
          if (!shouldRetry(error) || attempt === REQUEST_ATTEMPTS) {
            throw error;
          }

          await sleep(computeRetryDelay(attempt, options.random));
          attempt += 1;
        }
      }
    },
  };
};

export default {
  BASE_URL,
  DEFAULT_MIN_REQUEST_INTERVAL_MS,
  computeRetryDelay,
  configureRequest,
  createRequest,
  delay,
  reserveRequestSlot,
  resetSharedThrottle,
  resolveUrl,
  shouldRetry,
};
