import {
  SCORM12,
  SCORM2004,
  scorm12Objective,
  scorm2004Objective,
} from "../data-model.js";
import type { ScormWrapper } from "../api-adapter.js";

export interface ObjectiveState {
  id: string;
  status: "passed" | "failed" | "incomplete" | "not attempted";
  score?: { raw?: number; min?: number; max?: number };
}

export interface WriteObjectiveOptions {
  id: string;
  status: "passed" | "failed" | "incomplete" | "not attempted";
  scoreRaw?: number;
  scoreMin?: number;
  scoreMax?: number;
}

function toObjectiveStatus(raw: string): ObjectiveState["status"] {
  if (
    raw === "passed" ||
    raw === "failed" ||
    raw === "incomplete" ||
    raw === "not attempted"
  ) {
    return raw;
  }
  if (raw === "completed") return "passed";
  return "not attempted";
}

function toObjectiveStatusFrom2004(
  successStatus: string,
  completionStatus: string,
): ObjectiveState["status"] {
  if (successStatus === "passed") return "passed";
  if (successStatus === "failed") return "failed";
  if (completionStatus === "incomplete") return "incomplete";
  return "not attempted";
}

function getObjectiveCount(wrapper: ScormWrapper): number {
  const countElement =
    wrapper.version === "2004"
      ? SCORM2004.OBJECTIVES_COUNT
      : SCORM12.OBJECTIVES_COUNT;
  const raw = wrapper.getValue(countElement);
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function setObjectiveCount(wrapper: ScormWrapper, count: number): void {
  const countElement =
    wrapper.version === "2004"
      ? SCORM2004.OBJECTIVES_COUNT
      : SCORM12.OBJECTIVES_COUNT;
  wrapper.setValue(countElement, String(count));
}

function parseScore(
  wrapper: ScormWrapper,
  element: Pick<
    ReturnType<typeof scorm12Objective>,
    "scoreRaw" | "scoreMin" | "scoreMax"
  >,
): ObjectiveState["score"] {
  const rawValue = wrapper.getValue(element.scoreRaw);
  const minValue = wrapper.getValue(element.scoreMin);
  const maxValue = wrapper.getValue(element.scoreMax);

  const score: NonNullable<ObjectiveState["score"]> = {};
  if (rawValue) score.raw = Number(rawValue);
  if (minValue) score.min = Number(minValue);
  if (maxValue) score.max = Number(maxValue);

  return Object.keys(score).length > 0 ? score : undefined;
}

function readObjective12(
  index: number,
  wrapper: ScormWrapper,
): ObjectiveState | undefined {
  const element = scorm12Objective(index);
  const id = wrapper.getValue(element.id);
  if (!id) return undefined;

  return {
    id,
    status: toObjectiveStatus(wrapper.getValue(element.status)),
    score: parseScore(wrapper, element),
  };
}

function readObjective2004(
  index: number,
  wrapper: ScormWrapper,
): ObjectiveState | undefined {
  const element = scorm2004Objective(index);
  const id = wrapper.getValue(element.id);
  if (!id) return undefined;

  return {
    id,
    status: toObjectiveStatusFrom2004(
      wrapper.getValue(element.successStatus),
      wrapper.getValue(element.completionStatus),
    ),
    score: parseScore(wrapper, element),
  };
}

export function restoreObjectives(wrapper: ScormWrapper): {
  objectives: Map<string, ObjectiveState>;
  indexMap: Map<string, number>;
} {
  const count = getObjectiveCount(wrapper);
  const objectives = new Map<string, ObjectiveState>();
  const indexMap = new Map<string, number>();
  const reader =
    wrapper.version === "2004" ? readObjective2004 : readObjective12;

  for (let index = 0; index < count; index++) {
    const state = reader(index, wrapper);
    if (!state) continue;
    objectives.set(state.id, state);
    indexMap.set(state.id, index);
  }

  return { objectives, indexMap };
}

function mapStatusTo12(status: ObjectiveState["status"]): string {
  return status;
}

function mapSuccessStatusTo2004(status: ObjectiveState["status"]): string {
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  return "unknown";
}

function mapCompletionStatusTo2004(status: ObjectiveState["status"]): string {
  if (status === "not attempted") return "not attempted";
  if (status === "incomplete") return "incomplete";
  return "completed";
}

function writeScoreFields(
  wrapper: ScormWrapper,
  element: Pick<
    ReturnType<typeof scorm12Objective>,
    "scoreRaw" | "scoreMin" | "scoreMax"
  >,
  options: WriteObjectiveOptions,
): void {
  if (options.scoreRaw !== undefined)
    wrapper.setValue(element.scoreRaw, String(options.scoreRaw));
  if (options.scoreMin !== undefined)
    wrapper.setValue(element.scoreMin, String(options.scoreMin));
  if (options.scoreMax !== undefined)
    wrapper.setValue(element.scoreMax, String(options.scoreMax));
}

function writeObjective12(
  index: number,
  options: WriteObjectiveOptions,
  wrapper: ScormWrapper,
): void {
  const element = scorm12Objective(index);
  wrapper.setValue(element.id, options.id);
  wrapper.setValue(element.status, mapStatusTo12(options.status));
  writeScoreFields(wrapper, element, options);
}

function writeObjective2004(
  index: number,
  options: WriteObjectiveOptions,
  wrapper: ScormWrapper,
): void {
  const element = scorm2004Objective(index);
  wrapper.setValue(element.id, options.id);
  wrapper.setValue(
    element.successStatus,
    mapSuccessStatusTo2004(options.status),
  );
  wrapper.setValue(
    element.completionStatus,
    mapCompletionStatusTo2004(options.status),
  );
  writeScoreFields(wrapper, element, options);

  if (
    options.scoreRaw !== undefined &&
    options.scoreMax !== undefined &&
    options.scoreMax > 0
  ) {
    wrapper.setValue(
      element.scoreScaled,
      String(options.scoreRaw / options.scoreMax),
    );
  }
}

function ensureDevelopmentCount(wrapper: ScormWrapper, index: number): void {
  if (!wrapper.isDev) return;
  const currentCount = getObjectiveCount(wrapper);
  if (index >= currentCount) {
    setObjectiveCount(wrapper, index + 1);
  }
}

export function writeObjective(
  options: WriteObjectiveOptions,
  indexMap: Map<string, number>,
  wrapper: ScormWrapper,
): void {
  let index = indexMap.get(options.id);

  if (index === undefined) {
    index = getObjectiveCount(wrapper);
    indexMap.set(options.id, index);
  }

  if (wrapper.version === "2004") {
    writeObjective2004(index, options, wrapper);
  } else {
    writeObjective12(index, options, wrapper);
  }

  ensureDevelopmentCount(wrapper, index);
  wrapper.commit();
}
