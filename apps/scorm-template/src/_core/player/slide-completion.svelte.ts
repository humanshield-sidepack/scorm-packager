import { scormState } from "$core/scorm/index.js";
import type { SlideObjectiveStatus } from "$core/scorm/persistent-store.svelte.js";
import { coursePlayer } from "./player.svelte.js";

function getSlideOrThrow() {
  const slide = coursePlayer.activeSlide;
  if (!slide) {
    throw new Error(
      "useSlideCompletion() must be called inside a component rendered by the course player",
    );
  }
  return slide;
}

function canChangeScore(
  currentScore: number | undefined,
  newScore: number,
): boolean {
  if (typeof newScore !== "number" || Number.isNaN(newScore) || newScore < 0) {
    console.warn("Invalid score value. Score must be a non-negative number.", {
      newScore,
    });
    return false;
  }
  return typeof currentScore === "number" && newScore < currentScore
    ? false
    : true;
}

export type SlideCompletionHandle = {
  readonly status: SlideObjectiveStatus;
  readonly isPassed: boolean;
  readonly isFailed: boolean;
  readonly score: number | undefined;
  markPassed: () => void;
  markFailed: () => void;
  markPassedWithScore: (score: number) => void;
  setScore: (score: number) => boolean;
};

export function useSlideCompletion(): SlideCompletionHandle {
  const slide = getSlideOrThrow();

  const statusObject = $derived.by(() => {
    return {
      status: scormState.store.getSlideStatus(slide.lessonId, slide.id),
      isPassed: scormState.store.isSlideCompleted(slide.lessonId, slide.id),
      isFailed:
        scormState.store.getSlideStatus(slide.lessonId, slide.id) === "failed",
      score: scormState.store.getSlideScore(slide.lessonId, slide.id),
    };
  });

  function updateObjective(status: SlideObjectiveStatus, score?: number) {
    scormState.store.updateSlideObjective({
      lessonId: slide.lessonId,
      slideId: slide.id,
      status,
      score,
    });
  }

  return {
    get status(): SlideObjectiveStatus {
      return statusObject.status;
    },
    get isPassed(): boolean {
      return statusObject.isPassed;
    },
    get isFailed(): boolean {
      return statusObject.isFailed;
    },
    get score(): number | undefined {
      return statusObject.score;
    },
    setScore(score: number): boolean {
      if (!canChangeScore(statusObject.score, score)) return false;
      updateObjective(statusObject.status, score);
      return true;
    },
    markPassed(): void {
      updateObjective("passed");
    },
    markFailed(): void {
      updateObjective("failed");
    },
    markPassedWithScore(score: number): void {
      updateObjective("passed", score);
    },
  };
}
