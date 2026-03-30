import { coursePlayer } from "$core/player";
import { scormState, type RecordedInteraction } from "$core/scorm/index.js";
import type { Question } from "./types.js";

const DEFAULT_WEIGHT = 1;

function getHistory(fullId: string): RecordedInteraction[] {
  return scormState.store.interactionHistory[fullId] ?? [];
}

function findLastCorrectAttempt(
  attempts: RecordedInteraction[],
): RecordedInteraction | undefined {
  for (let index = attempts.length - 1; index >= 0; index--) {
    const attempt = attempts[index];
    if (attempt.result === "correct") return attempt;
  }
  return undefined;
}

function hasAlreadyAnsweredWith(
  attempts: RecordedInteraction[],
  answer: string,
): boolean {
  return attempts.some((attempt) => attempt.learnerResponse === answer);
}

function isAlreadyResolved(fullId: string): boolean {
  return (
    scormState.store.isObjectivePassed(fullId) ||
    findLastCorrectAttempt(getHistory(fullId)) !== undefined
  );
}

function submitAnswer(options: {
  fullId: string;
  answer: string;
  correctAnswer: string;
  weight: number;
}): void {
  if (isAlreadyResolved(options.fullId)) return;
  if (hasAlreadyAnsweredWith(getHistory(options.fullId), options.answer))
    return;

  scormState.store.recordInteraction({
    id: options.fullId,
    type: "choice",
    learnerResponse: options.answer,
    correctResponse: options.correctAnswer,
    result: options.answer === options.correctAnswer ? "correct" : "incorrect",
    weighting: options.weight,
  });
}

export function defineMultiChoiceQuestion<
  const Options extends readonly { key: string; label: string }[],
>(q: {
  id: string;
  question: string;
  options: Options;
  correctAnswer: Options[number]["key"];
  weight?: number;
}): Question & {
  readonly options: Options;
  readonly correctAnswer: Options[number]["key"];
} {
  const slide = coursePlayer.activeSlide!;

  const fullId = `q:${slide.lessonId}:${slide.id}:${q.id}`;
  const weight = q.weight ?? DEFAULT_WEIGHT;

  let selectedAnswer = $state<string | undefined>();
  let localPassed = $state(scormState.store.isObjectivePassed(fullId));

  return {
    ...q,
    weight,
    fullId,
    get selectedAnswer(): string | undefined {
      return selectedAnswer;
    },
    set selectedAnswer(value: string | undefined) {
      if (localPassed) return;
      selectedAnswer = value;
    },
    handleSubmit() {
      if (selectedAnswer === undefined) return;
      localPassed = selectedAnswer === q.correctAnswer;
      submitAnswer({
        fullId,
        answer: selectedAnswer,
        correctAnswer: q.correctAnswer,
        weight,
      });
    },
    get isPassed(): boolean {
      return localPassed;
    },
    get attempts(): RecordedInteraction[] {
      return getHistory(fullId);
    },
  };
}
