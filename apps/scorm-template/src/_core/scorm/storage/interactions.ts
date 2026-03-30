import {
  SCORM12,
  SCORM2004,
  scorm12Interaction,
  scorm2004Interaction,
} from "../data-model.js";
import { ScormWrapper } from "../api-adapter.js";
import type {
  Scorm12InteractionType,
  Scorm2004InteractionType,
  Scorm2004InteractionResult,
} from "../types.js";

export type StorageMode = "standard" | "chunked";

export interface RecordInteractionOptions {
  id: string;
  type: Scorm12InteractionType | Scorm2004InteractionType;
  learnerResponse: string;
  alternateResponse?: string;
  correctResponse?: string;
  alternateCorrectResponse?: string;
  result?: Scorm2004InteractionResult;
  weighting?: number;
  latency?: number;
  objectiveId?: string;
  description?: string;
}

export interface RecordedInteraction {
  id: string;
  type: Scorm12InteractionType | Scorm2004InteractionType;
  learnerResponse: string;
  correctResponse: string | undefined;
  result: Scorm2004InteractionResult | undefined;
  weighting: number | undefined;
  timestamp: string;
}

export interface StoreData {
  variables: Record<string, unknown>;
  interactions: Record<string, RecordedInteraction[]>;
}

export interface IStorageEngine {
  persist(data: StoreData, wrapper: ScormWrapper): void;
  restore(wrapper: ScormWrapper): StoreData;
  reportInteraction(
    options: RecordInteractionOptions,
    wrapper: ScormWrapper,
  ): void;
}

const DATA_CHUNK_ID_PREFIX = "data_chunk_";

export function getNextInteractionIndex(wrapper: ScormWrapper): number {
  const countElement =
    wrapper.version === "2004"
      ? SCORM2004.INTERACTIONS_COUNT
      : SCORM12.INTERACTIONS_COUNT;
  const raw = wrapper.getValue(countElement);
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function writeWithFallback(
  wrapper: ScormWrapper,
  field: string,
  values: [primary: string, fallback: string | undefined],
): void {
  const wrote = wrapper.setValue(field, values[0]);
  if (!wrote && values[1] !== undefined) {
    wrapper.getLastErrorCode();
    wrapper.setValue(field, values[1]);
  }
}

function write2004VersionFields(
  element: ReturnType<typeof scorm2004Interaction>,
  options: RecordInteractionOptions,
  wrapper: ScormWrapper,
): void {
  wrapper.setValue(element.timestamp, new Date().toISOString());
  if (options.description !== undefined) {
    wrapper.setValue(element.description, options.description);
  }
}

function write12VersionFields(
  element: ReturnType<typeof scorm12Interaction>,
  wrapper: ScormWrapper,
): void {
  wrapper.setValue(element.time, wrapper.formatSessionTime(Date.now()));
}

export function writeSingleInteraction(
  index: number,
  options: RecordInteractionOptions,
  wrapper: ScormWrapper,
): void {
  const is2004 = wrapper.version === "2004";

  const element = is2004
    ? scorm2004Interaction(index)
    : scorm12Interaction(index);

  wrapper.setValue(element.id, options.id);
  wrapper.setValue(element.type, options.type);

  const responseField = is2004
    ? (element as ReturnType<typeof scorm2004Interaction>).learnerResponse
    : (element as ReturnType<typeof scorm12Interaction>).studentResponse;
  writeWithFallback(wrapper, responseField, [
    options.learnerResponse,
    options.alternateResponse,
  ]);

  if (options.correctResponse !== undefined) {
    writeWithFallback(wrapper, element.correctResponsePattern(0), [
      options.correctResponse,
      options.alternateCorrectResponse,
    ]);
  }

  if (options.result !== undefined)
    wrapper.setValue(element.result, options.result);
  if (options.weighting !== undefined)
    wrapper.setValue(element.weighting, String(options.weighting));
  if (options.latency !== undefined) {
    wrapper.setValue(
      element.latency,
      wrapper.formatSessionTime(options.latency),
    );
  }
  if (options.objectiveId !== undefined) {
    wrapper.setValue(element.objectiveId(0), options.objectiveId);
  }

  if (is2004) {
    write2004VersionFields(
      element as ReturnType<typeof scorm2004Interaction>,
      options,
      wrapper,
    );
  } else {
    write12VersionFields(
      element as ReturnType<typeof scorm12Interaction>,
      wrapper,
    );
  }
}

function buildInteractionFromScorm(
  index: number,
  wrapper: ScormWrapper,
): RecordedInteraction | undefined {
  const is2004 = wrapper.version === "2004";
  const element = is2004
    ? scorm2004Interaction(index)
    : scorm12Interaction(index);
  const id = wrapper.getValue(element.id);

  if (!id || id.startsWith(DATA_CHUNK_ID_PREFIX)) return undefined;

  const learnerResponse = is2004
    ? wrapper.getValue(
        (element as ReturnType<typeof scorm2004Interaction>).learnerResponse,
      )
    : wrapper.getValue(
        (element as ReturnType<typeof scorm12Interaction>).studentResponse,
      );

  const correctResponse =
    wrapper.getValue(element.correctResponsePattern(0)) || undefined;
  const result =
    (wrapper.getValue(element.result) as Scorm2004InteractionResult) ||
    undefined;
  const weightingRaw = wrapper.getValue(element.weighting);
  const weighting = weightingRaw ? Number(weightingRaw) : undefined;
  const type = wrapper.getValue(element.type) as
    | Scorm12InteractionType
    | Scorm2004InteractionType;
  const timestamp = is2004
    ? wrapper.getValue(
        (element as ReturnType<typeof scorm2004Interaction>).timestamp,
      )
    : wrapper.getValue((element as ReturnType<typeof scorm12Interaction>).time);

  return {
    id,
    type,
    learnerResponse,
    correctResponse,
    result,
    weighting,
    timestamp,
  };
}

export function rebuildInteractions(
  wrapper: ScormWrapper,
): Record<string, RecordedInteraction[]> {
  const countElement =
    wrapper.version === "2004"
      ? SCORM2004.INTERACTIONS_COUNT
      : SCORM12.INTERACTIONS_COUNT;
  const raw = wrapper.getValue(countElement);
  const count = Number.parseInt(raw, 10);
  if (Number.isNaN(count) || count <= 0) return {};

  const accumulator = new Map<string, RecordedInteraction[]>();

  for (let index = 0; index < count; index++) {
    const interaction = buildInteractionFromScorm(index, wrapper);
    if (!interaction) continue;
    const existing = accumulator.get(interaction.id) ?? [];
    existing.push(interaction);
    accumulator.set(interaction.id, existing);
  }

  return Object.fromEntries(accumulator);
}
