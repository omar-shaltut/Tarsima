import type {
  ExplanationRequest,
  ExplanationSourceAdapter,
} from './adapters.ts';
import type { ExplanationPayload } from './types.ts';

const GROUNDED_REASON =
  'Selected from shared Qloo evidence surfaced for both taste profiles.';

export class DeterministicExplanationAdapter
  implements ExplanationSourceAdapter
{
  readonly adapter_id = 'DETERMINISTIC_EXPLANATION_ADAPTER_V1';

  async explain(request: ExplanationRequest): Promise<ExplanationPayload> {
    const slots = request.slots
      .filter((slot) => slot.status === 'SHARED_PRIMARY')
      .map((slot) => {
        if (slot.selected === null) {
          throw new Error(
            `Shared-primary slot ${slot.slot_id} is missing immutable selection evidence.`,
          );
        }

        return {
          slot_id: slot.slot_id,
          entity_id: slot.selected.entity_id,
          name: slot.selected.name,
          rank_a: slot.selected.rank_a,
          rank_b: slot.selected.rank_b,
          why_it_works: GROUNDED_REASON,
        };
      });

    return {
      slots,
      shared_taste_summary: null,
    };
  }
}
