import type {
  ProfileResolutionRequest,
  ProfileResolverAdapter,
} from './adapters.ts';
import type { ResolvedProfile, Side } from './types.ts';
import type { QlooFetch } from './qloo-retrieval-adapter.ts';

const DEFAULT_BASE_URL = 'https://hackathon.api.qloo.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 120_000;
const FALLBACK_BACKOFF_MS = [2_000, 8_000] as const;
const SEARCH_TAKE = 8;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QlooEntitySearchRequest {
  readonly query: string;
  readonly entityType?: string;
}

export interface QlooEntitySearchCandidate {
  readonly entity_id: string;
  readonly name: string;
  readonly types: readonly string[];
  readonly disambiguation: string | null;
}

export interface QlooEntitySearchOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: QlooFetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly sleepImpl?: (milliseconds: number) => Promise<void>;
}

export interface ProfileRegistration {
  readonly side: Side;
  readonly profile_ref: string;
  readonly qloo_seed_entity_ids: readonly string[];
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
  return FALLBACK_BACKOFF_MS[
    Math.min(attempt - 1, FALLBACK_BACKOFF_MS.length - 1)
  ]!;
}

function mapCandidates(payload: unknown): readonly QlooEntitySearchCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error('Qloo entity search response is missing results.');
  }

  const candidates = payload.results.map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Qloo entity search returned a malformed candidate.');
    }

    const entityId = candidate.entity_id;
    if (typeof entityId !== 'string' || entityId.trim().length === 0) {
      throw new Error(
        'Qloo entity search returned a candidate without entity_id.',
      );
    }

    const name = candidate.name;
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Qloo entity search returned a candidate without name.');
    }

    const types = candidate.types;
    if (
      !Array.isArray(types) ||
      types.some(
        (value) => typeof value !== 'string' || value.trim().length === 0,
      )
    ) {
      throw new Error(
        'Qloo entity search returned a candidate with malformed types.',
      );
    }

    const disambiguation =
      typeof candidate.disambiguation === 'string' &&
      candidate.disambiguation.trim().length > 0
        ? candidate.disambiguation
        : null;

    return {
      entity_id: entityId,
      name,
      types: [...types],
      disambiguation,
    };
  });

  const seenEntityIds = new Set<string>();

  return candidates.filter((candidate) => {
    if (seenEntityIds.has(candidate.entity_id)) return false;

    seenEntityIds.add(candidate.entity_id);
    return true;
  });
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class QlooEntitySearchClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: QlooFetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sleepImpl: (milliseconds: number) => Promise<void>;

  constructor(options: QlooEntitySearchOptions) {
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

  private requestUrl(request: QlooEntitySearchRequest): URL {
    const query = request.query.trim();
    if (query.length === 0) {
      throw new Error('Qloo entity search requires a query.');
    }

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('take', String(SEARCH_TAKE));
    url.searchParams.set('sort_by', 'match');

    if (request.entityType !== undefined) {
      const entityType = request.entityType.trim();
      if (!entityType.startsWith('urn:entity:')) {
        throw new Error(
          'Qloo entity search entityType must use a urn:entity: value.',
        );
      }
      url.searchParams.set('type', entityType);
    }

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
          throw new Error(
            'Qloo Retry-After exceeded the bounded retry policy.',
          );
        }
        waitMs = retryAfterMs;
      }
    }

    await this.sleepImpl(waitMs);
  }

  async search(
    request: QlooEntitySearchRequest,
  ): Promise<readonly QlooEntitySearchCandidate[]> {
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
            'Qloo entity search failed after bounded transport retries.',
          );
        }

        await this.waitBeforeRetry(attempt);
        continue;
      }

      if (retryableStatus(response.status)) {
        clearTimeout(timeout);

        if (attempt >= this.maxAttempts) {
          throw new Error(
            `Qloo entity search exhausted retries after HTTP ${response.status}.`,
          );
        }

        await this.waitBeforeRetry(attempt, response);
        continue;
      }

      if (!response.ok) {
        clearTimeout(timeout);
        throw new Error(
          `Qloo entity search failed with nonretryable HTTP ${response.status}.`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        if (controller.signal.aborted) {
          throw new Error(
            'Qloo entity search response body exceeded timeout.',
          );
        }
        throw new Error('Qloo entity search returned malformed JSON.');
      } finally {
        clearTimeout(timeout);
      }

      return mapCandidates(payload);
    }

    throw new Error('Qloo entity search reached an invalid retry state.');
  }
}

export class RequestLocalProfileResolver implements ProfileResolverAdapter {
  readonly adapter_id = 'REQUEST_LOCAL_PROFILE_RESOLVER_V1';

  private readonly profilesByRef = new Map<string, ResolvedProfile>();

  constructor(registrations: readonly ProfileRegistration[] = []) {
    for (const registration of registrations) {
      this.registerProfile(registration);
    }
  }

  registerProfile(registration: ProfileRegistration): ResolvedProfile {
    const profileRef = registration.profile_ref.trim();
    if (profileRef.length === 0) {
      throw new Error('Profile registration requires profile_ref.');
    }

    if (this.profilesByRef.has(profileRef)) {
      throw new Error(`Profile reference is already registered: ${profileRef}.`);
    }

    const entityIds = registration.qloo_seed_entity_ids.map((entityId) =>
      entityId.trim(),
    );

    if (entityIds.length < 3 || entityIds.length > 5) {
      throw new Error('Resolved profile requires 3 through 5 Qloo entity IDs.');
    }

    if (new Set(entityIds).size !== entityIds.length) {
      throw new Error('Resolved profile contains duplicate Qloo entity IDs.');
    }

    if (entityIds.some((entityId) => !UUID_PATTERN.test(entityId))) {
      throw new Error('Resolved profile contains an invalid Qloo entity ID.');
    }

    const profile: ResolvedProfile = {
      side: registration.side,
      profile_ref: profileRef,
      qloo_seed_entity_ids: entityIds,
    };

    this.profilesByRef.set(profileRef, profile);
    return profile;
  }

  async resolveProfile(
    request: ProfileResolutionRequest,
  ): Promise<ResolvedProfile> {
    const profile = this.profilesByRef.get(request.profile_ref);

    if (!profile) {
      throw new Error(
        `Profile resolution failed for unknown reference: ${request.profile_ref}.`,
      );
    }

    if (profile.side !== request.side) {
      throw new Error(
        `Profile resolution side mismatch for reference: ${request.profile_ref}.`,
      );
    }

    return profile;
  }
}
