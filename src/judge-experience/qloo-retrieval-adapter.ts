import type {
  RetrievalRequest,
  RetrievalSourceAdapter,
} from './adapters.ts';
import type {
  Category,
  RankedEntity,
  RetrievalResult,
} from './types.ts';

const DEFAULT_BASE_URL = 'https://hackathon.api.qloo.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 120_000;
const FALLBACK_BACKOFF_MS = [2_000, 8_000] as const;

export const QLOO_CATEGORY_TAGS: Readonly<Record<Category, string>> = {
  art_gallery: 'urn:tag:category:place:art_gallery',
  book_store: 'urn:tag:category:place:book_store',
  museum: 'urn:tag:category:place:museum',
  park: 'urn:tag:category:place:park',
  restaurant: 'urn:tag:category:place:restaurant',
  shopping_mall: 'urn:tag:category:place:shopping_mall',
};

export type QlooFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface QlooRetrievalAdapterOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: QlooFetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly sleepImpl?: (milliseconds: number) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfterMilliseconds(value: string | null): number | null {
  if (value === null) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;

  return Math.max(0, date - Date.now());
}

function fallbackBackoffMilliseconds(attempt: number): number {
  return FALLBACK_BACKOFF_MS[Math.min(attempt - 1, FALLBACK_BACKOFF_MS.length - 1)]!;
}

function mapEntities(payload: unknown): readonly RankedEntity[] {
  if (!isRecord(payload) || !isRecord(payload.results)) {
    throw new Error('Qloo retrieval response is missing results.');
  }

  const entities = payload.results.entities;
  if (!Array.isArray(entities)) {
    throw new Error('Qloo retrieval response is missing results.entities.');
  }

  return entities.map((entity, index) => {
    if (!isRecord(entity)) {
      throw new Error('Qloo retrieval returned a malformed entity.');
    }

    const rawEntityId = entity.entity_id;
    if (typeof rawEntityId !== 'string' || rawEntityId.trim().length === 0) {
      throw new Error('Qloo retrieval returned an entity without entity_id.');
    }

    const name =
      typeof entity.name === 'string' && entity.name.trim().length > 0
        ? entity.name
        : null;

    const displayType =
      typeof entity.display_type === 'string' &&
      entity.display_type.trim().length > 0
        ? entity.display_type
        : null;

    return {
      entity_id: rawEntityId,
      rank: index + 1,
      name,
      display_type: displayType,
    };
  });
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class QlooRetrievalAdapter implements RetrievalSourceAdapter {
  readonly adapter_id = 'QLOO_RETRIEVAL_ADAPTER_V1';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: QlooFetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sleepImpl: (milliseconds: number) => Promise<void>;

  constructor(options: QlooRetrievalAdapterOptions) {
    if (options.apiKey.trim().length === 0) {
      throw new Error('Qloo API key is required.');
    }

    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
      throw new Error('Qloo maxAttempts must be an integer from 1 through 3.');
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error('Qloo timeoutMs must be greater than zero.');
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
    this.sleepImpl = options.sleepImpl ?? defaultSleep;
  }

  private requestUrl(request: RetrievalRequest): URL {
    if (request.profile.qloo_seed_entity_ids.length === 0) {
      throw new Error('Qloo retrieval requires at least one seed entity.');
    }

    if (request.destination_city.trim().length === 0) {
      throw new Error('Qloo retrieval requires a destination city.');
    }

    const url = new URL(`${this.baseUrl}/v2/insights`);
    url.searchParams.set('filter.type', 'urn:entity:place');
    url.searchParams.set(
      'signal.interests.entities',
      request.profile.qloo_seed_entity_ids.join(','),
    );
    url.searchParams.set('filter.tags', QLOO_CATEGORY_TAGS[request.category]);
    url.searchParams.set('filter.location.query', request.destination_city);
    url.searchParams.set('filter.location.radius', '0');
    url.searchParams.set('take', '18');
    return url;
  }

  private async waitBeforeRetry(
    attempt: number,
    response?: Response,
  ): Promise<void> {
    let waitMs = fallbackBackoffMilliseconds(attempt);

    if (response?.status === 429) {
      const retryAfterMs = parseRetryAfterMilliseconds(
        response.headers.get('retry-after'),
      );

      if (retryAfterMs !== null) {
        if (retryAfterMs > MAX_RETRY_AFTER_MS) {
          throw new Error('Qloo Retry-After exceeded the bounded retry policy.');
        }
        waitMs = retryAfterMs;
      }
    }

    await this.sleepImpl(waitMs);
  }

  async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const url = this.requestUrl(request);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Api-Key': this.apiKey,
          },
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeout);

        if (attempt >= this.maxAttempts) {
          throw new Error(
            'Qloo retrieval failed after bounded transport retries.',
          );
        }

        await this.waitBeforeRetry(attempt);
        continue;
      }

      if (retryableStatus(response.status)) {
        clearTimeout(timeout);
        if (attempt >= this.maxAttempts) {
          throw new Error(
            `Qloo retrieval exhausted retries after HTTP ${response.status}.`,
          );
        }

        await this.waitBeforeRetry(attempt, response);
        continue;
      }

      if (!response.ok) {
        clearTimeout(timeout);
        throw new Error(
          `Qloo retrieval failed with nonretryable HTTP ${response.status}.`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        if (controller.signal.aborted) {
          throw new Error('Qloo retrieval response body exceeded timeout.');
        }
        throw new Error('Qloo retrieval returned malformed JSON.');
      } finally {
        clearTimeout(timeout);
      }

      return {
        side: request.side,
        category: request.category,
        destination_city: request.destination_city,
        status: 'COMPLETE',
        entities: mapEntities(payload),
      };
    }

    throw new Error('Qloo retrieval reached an invalid retry state.');
  }
}
