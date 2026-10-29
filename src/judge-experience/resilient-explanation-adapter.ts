import type {
  ExplanationRequest,
  ExplanationSourceAdapter,
} from './adapters.ts';
import { AgenticExplanationAdapter } from './agentic-explanation-adapter.ts';
import { DeterministicExplanationAdapter } from './deterministic-explanation-adapter.ts';
import type { ExplanationPayload } from './types.ts';

const AVAILABILITY_ERROR_NAMES = new Set([
  'AbortError',
  'APIConnectionError',
  'APIConnectionTimeoutError',
  'RateLimitError',
]);

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isExplanationAvailabilityFailure(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const status = error.status;
  if (
    typeof status === 'number' &&
    (status === 408 || status === 429 || (status >= 500 && status <= 599))
  ) {
    return true;
  }

  const name = error.name;
  if (
    typeof name === 'string' &&
    AVAILABILITY_ERROR_NAMES.has(name)
  ) {
    return true;
  }

  const code = error.code;
  if (
    typeof code === 'string' &&
    NETWORK_ERROR_CODES.has(code)
  ) {
    return true;
  }

  const message = error.message;
  return (
    typeof message === 'string' &&
    /\bRESOURCE_EXHAUSTED\b/i.test(message)
  );
}

export interface ResilientExplanationAdapterOptions {
  readonly primary?: ExplanationSourceAdapter;
  readonly fallback?: ExplanationSourceAdapter;
  readonly forceDeterministic?: boolean;
  readonly logWarning?: (message: string) => void;
}

export class ResilientExplanationAdapter
  implements ExplanationSourceAdapter
{
  readonly adapter_id = 'RESILIENT_EXPLANATION_ADAPTER_V1';

  private readonly primary: ExplanationSourceAdapter;
  private readonly fallback: ExplanationSourceAdapter;
  private readonly forceDeterministic: boolean;
  private readonly logWarning: (message: string) => void;

  constructor(options: ResilientExplanationAdapterOptions = {}) {
    this.primary = options.primary ?? new AgenticExplanationAdapter();
    this.fallback =
      options.fallback ?? new DeterministicExplanationAdapter();
    this.forceDeterministic = options.forceDeterministic ?? false;
    this.logWarning =
      options.logWarning ??
      ((message) => {
        console.warn(message);
      });
  }

  async explain(request: ExplanationRequest): Promise<ExplanationPayload> {
    if (this.forceDeterministic) {
      this.logWarning(
        '[Tarsima] Deterministic explanation fallback forced by configuration.',
      );
      return this.fallback.explain(request);
    }

    try {
      return await this.primary.explain(request);
    } catch (error) {
      if (!isExplanationAvailabilityFailure(error)) {
        throw error;
      }

      this.logWarning(
        '[Tarsima] AI explanation provider unavailable; using deterministic explanation fallback.',
      );

      return this.fallback.explain(request);
    }
  }
}
