import { coursePlayer } from "$core/player";
import { useSlideCompletion } from "$core/player/slide-completion.svelte.js";
import type { SlideCompletionHandle } from "$core/player/slide-completion.svelte.js";
import { untrack } from "svelte";
import { testRegistry } from "./test-registry.svelte.js";
import type {
  Question,
  QuestionResult,
  TestDefinition,
  TestHandle,
  TestPhase,
} from "./types.js";

const PERCENTAGE = 100;
const DEFAULT_PASS_THRESHOLD = 1;

function getSlideOrThrow() {
  const slide = coursePlayer.activeSlide;
  if (!slide) {
    throw new Error(
      "defineTest() must be called inside a component rendered by the course player",
    );
  }
  return slide;
}

function computeScore(questions: Question[]): number {
  const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = questions.reduce(
    (sum, q) => sum + (q.isPassed ? q.weight : 0),
    0,
  );
  return (earned / totalWeight) * PERCENTAGE;
}

function restoreFromPersistence(
  questions: Question[],
  reactive: TestReactiveState,
): void {
  if (reactive.phase !== "unanswered") return;
  const hasAnyAttempts = questions.some((q) => q.attempts.length > 0);
  if (!hasAnyAttempts) return;
  reactive.phase = "submitted";
  for (const q of questions) {
    const correctAttempt = q.attempts.find((a) => a.result === "correct");
    if (correctAttempt) {
      q.selectedAnswer = correctAttempt.learnerResponse;
    }
  }
}

function syncSlideCompletion(
  completion: SlideCompletionHandle,
  state: { phase: TestPhase; isPassed: boolean; score: number },
): void {
  if (state.phase !== "submitted") return;
  if (state.isPassed && !completion.isPassed) {
    completion.markPassedWithScore(state.score);
  } else if (!state.isPassed) {
    completion.setScore(state.score);
  }
}

interface TestReactiveState {
  readonly score: number;
  readonly isPassed: boolean;
  readonly allAnswered: boolean;
  phase: TestPhase;
}

function submitQuestions(
  questions: Question[],
  reactive: TestReactiveState,
): void {
  reactive.phase = "submitted";
  for (const q of questions) q.handleSubmit();
}

function retryIncorrect(
  questions: Question[],
  reactive: TestReactiveState,
): void {
  reactive.phase = "retrying";
  for (const q of questions) {
    if (!q.isPassed) {
      q.selectedAnswer = undefined;
    }
  }
}

function pendingCount(questions: Question[]): number {
  return questions.filter((q) => !q.isPassed && q.selectedAnswer === undefined)
    .length;
}

function buildHandle(
  definition: TestDefinition,
  fullId: string,
  reactive: TestReactiveState,
): TestHandle {
  const { questions } = definition;
  return {
    id: definition.id,
    fullId,
    questions,
    get score() {
      return reactive.score;
    },
    get isPassed() {
      return reactive.isPassed;
    },
    get isSubmitted() {
      return reactive.phase === "submitted";
    },
    get phase() {
      return reactive.phase;
    },
    get allAnswered() {
      return reactive.allAnswered;
    },
    get hasIncorrect() {
      return questions.some((q) => !q.isPassed);
    },
    get passedCount() {
      return questions.filter((q) => q.isPassed).length;
    },
    get answeredCount() {
      return questions.filter((q) => q.selectedAnswer !== undefined).length;
    },
    get pendingCount() {
      return pendingCount(questions);
    },
    questionResult(q: Question): QuestionResult {
      if (q.isPassed) return "correct";
      if (reactive.phase !== "submitted") return undefined;
      if (q.selectedAnswer === undefined) return undefined;
      return "incorrect";
    },
    submit: () => submitQuestions(questions, reactive),
    retry: () => retryIncorrect(questions, reactive),
  };
}

function setupEffects(
  definition: TestDefinition,
  completion: SlideCompletionHandle,
  reactive: TestReactiveState,
): void {
  const { questions } = definition;

  $effect(() => {
    restoreFromPersistence(questions, reactive);
  });

  $effect(() => {
    const phase = reactive.phase;
    const isPassed = reactive.isPassed;
    const score = reactive.score;
    untrack(() => syncSlideCompletion(completion, { phase, isPassed, score }));
  });

  $effect(() => {
    if (reactive.phase === "submitted") {
      untrack(() => testRegistry.syncCourseScore());
    }
  });
}

export function defineTest(definition: TestDefinition): TestHandle {
  const slide = getSlideOrThrow();
  const fullId = `test:${slide.lessonId}:${slide.id}:${definition.id}`;
  const passThreshold = definition.passThreshold ?? DEFAULT_PASS_THRESHOLD;
  const { questions } = definition;

  let phase = $state<TestPhase>("unanswered");
  const score = $derived(computeScore(questions));
  const isPassed = $derived(score >= passThreshold * PERCENTAGE);
  const allAnswered = $derived(
    questions.every((q) => q.selectedAnswer !== undefined),
  );

  const reactive: TestReactiveState = {
    get score() {
      return score;
    },
    get isPassed() {
      return isPassed;
    },
    get allAnswered() {
      return allAnswered;
    },
    get phase() {
      return phase;
    },
    set phase(value: TestPhase) {
      phase = value;
    },
  };

  setupEffects(definition, useSlideCompletion(), reactive);

  const handle = buildHandle(definition, fullId, reactive);
  testRegistry.register(handle);
  return handle;
}
