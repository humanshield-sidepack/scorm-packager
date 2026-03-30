import type {
  IStorageEngine,
  StoreData,
  RecordInteractionOptions,
  RecordedInteraction,
} from "./storage/index.js";
import type { ScormWrapper } from "./api-adapter.js";
import type { ObjectiveState } from "./storage/objectives.js";
import { restoreObjectives, writeObjective } from "./storage/objectives.js";
import { SvelteDate, SvelteMap } from "svelte/reactivity";

export type SlideObjectiveStatus =
  | "passed"
  | "failed"
  | "incomplete"
  | "not attempted";

export type SlideVisitState = {
  id: string;
  status: SlideObjectiveStatus;
  score?: number;
};

function resultToObjectiveStatus(
  result: string | undefined,
): ObjectiveState["status"] {
  if (result === "correct") return "passed";
  if (result === "incorrect") return "failed";
  return "incomplete";
}

export class PersistentStore {
  #variables = $state<Record<string, unknown>>({});
  #interactionHistory = $state<
    Record<string, RecordedInteraction[] | undefined>
  >({});
  #interaction = $state<Record<string, unknown>>({});
  #objectives = $state<Record<string, ObjectiveState | undefined>>({});
  #objectiveIndexMap = new SvelteMap<string, number>();
  #slideVisits = $state<Record<string, SlideVisitState>>({});
  #engine: IStorageEngine | undefined;
  #wrapper: ScormWrapper | undefined;

  get interactionHistory(): Record<string, RecordedInteraction[] | undefined> {
    return this.#interactionHistory;
  }

  get variables(): Record<string, unknown> {
    return this.#variables;
  }

  get interactions(): Record<string, unknown> {
    return this.#interaction;
  }

  getObjective(id: string): ObjectiveState | undefined {
    return this.#objectives[id];
  }

  isObjectivePassed(id: string): boolean {
    return this.#objectives[id]?.status === "passed";
  }

  get slideVisits(): Record<string, SlideVisitState> {
    return this.#slideVisits;
  }

  updateSlideObjective(options: {
    lessonId: string;
    slideId: string;
    status: SlideObjectiveStatus;
    score?: number;
  }): void {
    if (!this.#wrapper) return;
    const objectiveId = `slide:${options.lessonId}:${options.slideId}`;
    const key = `${options.lessonId}:${options.slideId}`;

    const existing = this.#slideVisits[key];
    if (existing?.status === "passed") return;

    const scoreFields =
      options.score === undefined
        ? {}
        : { scoreRaw: options.score, scoreMin: 0, scoreMax: 100 };

    writeObjective(
      { id: objectiveId, status: options.status, ...scoreFields },
      this.#objectiveIndexMap,
      this.#wrapper,
    );

    this.#slideVisits = {
      ...this.#slideVisits,
      [key]: { id: objectiveId, status: options.status, score: options.score },
    };
  }

  markSlideVisited(lessonId: string, slideId: string): void {
    this.updateSlideObjective({ lessonId, slideId, status: "passed" });
  }

  getSlideStatus(lessonId: string, slideId: string): SlideObjectiveStatus {
    const key = `${lessonId}:${slideId}`;
    return this.#slideVisits[key]?.status ?? "not attempted";
  }

  isSlideCompleted(lessonId: string, slideId: string): boolean {
    return this.getSlideStatus(lessonId, slideId) === "passed";
  }

  getSlideScore(lessonId: string, slideId: string): number | undefined {
    const key = `${lessonId}:${slideId}`;
    return this.#slideVisits[key]?.score;
  }

  getString(key: string): string | undefined {
    const value = this.#variables[key];
    return typeof value === "string" ? value : undefined;
  }

  setString(key: string, value: string): void {
    this.#variables = { ...this.#variables, [key]: value };
    this.#persist();
  }

  getNumber(key: string): number | undefined {
    const value = this.#variables[key];
    return typeof value === "number" ? value : undefined;
  }

  setNumber(key: string, value: number): void {
    this.#variables = { ...this.#variables, [key]: value };
    this.#persist();
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.#variables[key];
    return typeof value === "boolean" ? value : undefined;
  }

  setBoolean(key: string, value: boolean): void {
    this.#variables = { ...this.#variables, [key]: value };
    this.#persist();
  }

  getObject<T>(key: string): T | undefined {
    const value = this.#variables[key];
    return value === undefined ? undefined : (value as T);
  }

  setObject<T>(key: string, value: T): void {
    this.#variables = { ...this.#variables, [key]: value };
    this.#persist();
  }

  has(key: string): boolean {
    return Object.hasOwn(this.#variables, key);
  }

  delete(key: string): void {
    this.#variables = Object.fromEntries(
      Object.entries(this.#variables).filter(([k]) => k !== key),
    );
    this.#persist();
  }

  recordInteraction(options: RecordInteractionOptions): void {
    const interaction: RecordedInteraction = {
      id: options.id,
      type: options.type,
      learnerResponse: options.learnerResponse,
      correctResponse: options.correctResponse,
      result: options.result,
      weighting: options.weighting,
      timestamp: new SvelteDate().toISOString(),
    };

    const existing = this.#interactionHistory[options.id] ?? [];
    this.#interactionHistory = {
      ...this.#interactionHistory,
      [options.id]: [...existing, interaction],
    };
    this.#interaction = { ...this.#interaction, [options.id]: interaction };

    this.#persist();
    if (this.#engine && this.#wrapper) {
      this.#engine.reportInteraction(
        { ...options, objectiveId: options.id },
        this.#wrapper,
      );
    }

    this.#updateObjective(options);
  }

  _load(wrapper: ScormWrapper): void {
    if (!this.#engine) return;
    const data = this.#engine.restore(wrapper);
    this.#variables = { ...data.variables };
    this.#interactionHistory = { ...data.interactions };
    const latest: Record<string, unknown> = {};
    for (const [id, history] of Object.entries(data.interactions)) {
      const last = history.at(-1);
      if (last !== undefined) latest[id] = last;
    }
    this.#interaction = latest;

    const restored = restoreObjectives(wrapper);
    this.#objectives = Object.fromEntries(restored.objectives);

    const indexMap = new SvelteMap<string, number>();
    for (const [key, value] of restored.indexMap) {
      indexMap.set(key, value);
    }
    this.#objectiveIndexMap = indexMap;

    const visits: Record<string, SlideVisitState> = {};
    for (const [id, state] of restored.objectives) {
      if (id.startsWith("slide:")) {
        const key = id.slice("slide:".length);
        visits[key] = {
          id,
          status: state.status,
          score: state.score?.raw,
        };
      }
    }
    this.#slideVisits = visits;
  }

  _setEngine(engine: IStorageEngine, wrapper: ScormWrapper): void {
    this.#engine = engine;
    this.#wrapper = wrapper;
  }

  #updateObjective(options: RecordInteractionOptions): void {
    if (!this.#wrapper) return;

    const existing = this.#objectives[options.id];
    if (existing?.status === "passed") return;

    const status = resultToObjectiveStatus(options.result);
    const scoreRaw =
      options.result === "correct" ? (options.weighting ?? 1) : 0;
    const scoreMax = options.weighting ?? 1;

    writeObjective(
      { id: options.id, status, scoreRaw, scoreMin: 0, scoreMax },
      this.#objectiveIndexMap,
      this.#wrapper,
    );

    this.#objectives = {
      ...this.#objectives,
      [options.id]: {
        id: options.id,
        status,
        score: { raw: scoreRaw, min: 0, max: scoreMax },
      },
    };
  }

  #persist(): void {
    if (!this.#engine || !this.#wrapper) return;
    const interactions: Record<string, RecordedInteraction[]> = {};
    for (const [id, history] of Object.entries(this.#interactionHistory)) {
      if (history) interactions[id] = history;
    }
    const data: StoreData = {
      variables: { ...this.#variables },
      interactions,
    };
    this.#engine.persist(data, this.#wrapper);
  }
}
