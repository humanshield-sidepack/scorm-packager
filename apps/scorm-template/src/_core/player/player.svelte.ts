import {
  _courseSlides,
  _firstCoursePath,
  _navigate,
  _route,
} from "./router.svelte.js";
import { scormState } from "$core/scorm/index.js";
import type { SlideObjectiveStatus } from "$core/scorm/persistent-store.svelte.js";
import { PlayerBuiltins } from "./player-metrics.svelte.js";
import type { ActiveSlideState, CourseSlide } from "./types.js";
import { course } from "../../course.js";

function normalizePathname(pathname: string): `/${string}` {
  let normalized = pathname;
  while (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  return (normalized || "/") as `/${string}`;
}

const slidesByPath = new Map(
  _courseSlides.map((slide) => [slide.pathname, slide]),
);
const slidesByIndex = new Map(
  _courseSlides.map((slide) => [slide.index, slide]),
);

function deriveActiveSlide(): ActiveSlideState | undefined {
  const slide = slidesByPath.get(normalizePathname(_route.pathname));
  if (!slide) return;
  return {
    ...slide,
    get status() {
      return scormState.store.getSlideStatus(slide.lessonId, slide.id);
    },
    get isPassed() {
      return scormState.store.isSlideCompleted(slide.lessonId, slide.id);
    },
    get isFailed() {
      return (
        scormState.store.getSlideStatus(slide.lessonId, slide.id) === "failed"
      );
    },
    get score() {
      return scormState.store.getSlideScore(slide.lessonId, slide.id);
    },
  };
}

class CoursePlayer {
  isNavigating = $state(false);
  #slideEnterTime = $state(0);
  readonly #builtins: PlayerBuiltins;

  constructor() {
    this.#builtins = new PlayerBuiltins({
      getSlideEnterTime: () => this.#slideEnterTime,
    });
  }

  get slides(): CourseSlide[] {
    return _courseSlides;
  }

  readonly activeSlide: ActiveSlideState | undefined =
    $derived.by(deriveActiveSlide);

  get canGoNext(): boolean {
    const current = this.activeSlide;
    if (!current) return false;
    const nextSlide = slidesByIndex.get(current.index + 1);
    if (!nextSlide) return false;
    if (course.sequencing === "free") return true;
    return (
      scormState.store.getSlideStatus(current.lessonId, current.id) === "passed"
    );
  }

  get canGoPrevious(): boolean {
    const current = this.activeSlide;
    if (!current) return false;
    return current.index > 0;
  }

  get firstPath(): `/${string}` {
    return _firstCoursePath;
  }

  get course() {
    return this.#builtins.course;
  }
  get lesson() {
    return this.#builtins.lesson;
  }
  get slide() {
    return this.#builtins.slide;
  }
  get session() {
    return this.#builtins.session;
  }

  isLocked(slide: CourseSlide): boolean {
    if (course.sequencing === "free") return false;
    if (slide.index === 0) return false;

    const previousSlide = slidesByIndex.get(slide.index - 1);
    if (!previousSlide) return false;

    return !scormState.store.isSlideCompleted(
      previousSlide.lessonId,
      previousSlide.id,
    );
  }

  getSlideStatus(slide: CourseSlide): SlideObjectiveStatus {
    return scormState.store.getSlideStatus(slide.lessonId, slide.id);
  }

  _initVisitTracking(): void {
    const legacySlides = scormState.store.getObject<string[]>("__v_s");
    if (legacySlides && legacySlides.length > 0) {
      for (const pathname of legacySlides) {
        const slide = slidesByPath.get(pathname as `/${string}`);
        if (slide) {
          scormState.store.markSlideVisited(slide.lessonId, slide.id);
        }
      }
      scormState.store.delete("__v_s");
      scormState.store.delete("__v_l");
    }
  }

  async goto(pathname: `/${string}`): Promise<void> {
    const targetSlide = slidesByPath.get(normalizePathname(pathname));
    if (targetSlide && this.isLocked(targetSlide)) return;

    this.isNavigating = true;
    try {
      await _navigate(pathname);
      scormState.location = pathname;
      this.#slideEnterTime = Date.now();
      const active = this.activeSlide;
      if (active) {
        if (active.completionMode === "auto") {
          scormState.store.markSlideVisited(active.lessonId, active.id);
        } else {
          const currentStatus = scormState.store.getSlideStatus(
            active.lessonId,
            active.id,
          );
          if (currentStatus === "not attempted") {
            scormState.store.updateSlideObjective({
              lessonId: active.lessonId,
              slideId: active.id,
              status: "incomplete",
            });
          }
        }
      }
    } finally {
      this.isNavigating = false;
    }
  }

  _startTicking(): void {
    this.#builtins.startTicking();
  }
  _stopTicking(): void {
    this.#builtins.stopTicking();
  }

  async goNext(): Promise<void> {
    if (!this.canGoNext) return;
    const nextSlide = slidesByIndex.get((this.activeSlide?.index ?? -1) + 1);
    if (nextSlide) await this.goto(nextSlide.pathname);
  }

  async goPrevious(): Promise<void> {
    if (!this.canGoPrevious) return;
    const previousSlide = slidesByIndex.get((this.activeSlide?.index ?? 0) - 1);
    if (previousSlide) await this.goto(previousSlide.pathname);
  }
}

export const coursePlayer = new CoursePlayer();
