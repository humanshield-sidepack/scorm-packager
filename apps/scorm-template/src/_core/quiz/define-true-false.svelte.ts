import { coursePlayer } from "$core/player";
import { scormState, type RecordedInteraction } from "$core/scorm/index.js";
import type { Question } from "./types.js";

const DEFAULT_WEIGHT = 1;

function getHistory(fullId: string): RecordedInteraction[] {
  return scormState.store.interactionHistory[fullId] ?? [];
}

function isAlreadyResolved(fullId: string): boolean {
  if (scormState.store.isObjectivePassed(fullId)) return true;
  const history = getHistory(fullId);
  return history.some((a) => a.result === "correct");
}

function hasAlreadyAnsweredWith(fullId: string, answer: string): boolean {
  return getHistory(fullId).some((a) => a.learnerResponse === answer);
}

function submitAnswer(options: {
  fullId: string;
  answer: string;
  correctAnswer: string;
  weight: number;
}): void {
  if (isAlreadyResolved(options.fullId)) return;
  if (hasAlreadyAnsweredWith(options.fullId, options.answer)) return;

  scormState.store.recordInteraction({
    id: options.fullId,
    type: "true-false",
    learnerResponse: options.answer,
    correctResponse: options.correctAnswer,
    result: options.answer === options.correctAnswer ? "correct" : "incorrect",
    weighting: options.weight,
  });
}

function getSlideOrThrow() {
  const slide = coursePlayer.activeSlide;
  if (!slide) {
    throw new Error(
      "defineTrueFalseQuestion() must be called inside a component rendered by the course player",
    );
  }
  return slide;
}

export function defineTrueFalseQuestion(q: {
  id: string;
  question: string;
  correctAnswer: "true" | "false";
  weight?: number;
}): Question {
  const slide = getSlideOrThrow();
  const fullId = `q:${slide.lessonId}:${slide.id}:${q.id}`;
  const weight = q.weight ?? DEFAULT_WEIGHT;

  let selectedAnswer = $state<string | undefined>();
  let localPassed = $state(scormState.store.isObjectivePassed(fullId));

  return {
    fullId,
    id: q.id,
    question: q.question,
    weight,
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
