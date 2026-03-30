import { coursePlayer } from "./player.svelte.js";
import { scormState } from "$core/scorm/index.js";
import { course } from "../../course.js";
import type { CourseSlide } from "./types.js";

function countCompleted(slides: CourseSlide[]): number {
  return slides.filter((s) =>
    scormState.store.isSlideCompleted(s.lessonId, s.id),
  ).length;
}

const PERCENT_MAX = 100;
const TICK_INTERVAL_MS = 1000;

type PlayerBuiltinsAccessors = {
  getSlideEnterTime: () => number;
};

export class PlayerBuiltins {
  readonly #accessors: PlayerBuiltinsAccessors;
  #now = $state(Date.now());
  #intervalId: ReturnType<typeof setInterval> | undefined;

  constructor(accessors: PlayerBuiltinsAccessors) {
    this.#accessors = accessors;
  }

  #lessonSlides(lessonId: string): CourseSlide[] {
    return coursePlayer.slides.filter((s) => s.lessonId === lessonId);
  }

  #lessonIndex(lessonId: string): number {
    return course.lessons.findIndex((l) => l.id === lessonId);
  }

  get course() {
    const active = coursePlayer.activeSlide;
    const total = coursePlayer.slides.length;
    const completed = countCompleted(coursePlayer.slides);
    const lessonIndex = active ? this.#lessonIndex(active.lessonId) : -1;
    return {
      slideNumber: active ? active.index + 1 : 0,
      totalSlides: total,
      slidesCompleted: completed,
      progress: total > 0 ? Math.round((completed / total) * PERCENT_MAX) : 0,
      lessonNumber: lessonIndex + 1,
      totalLessons: course.lessons.length,
    };
  }

  get lesson() {
    const active = coursePlayer.activeSlide;
    if (!active)
      return {
        title: "",
        slideNumber: 0,
        totalSlides: 0,
        slidesCompleted: 0,
        progress: 0,
      };
    const slides = this.#lessonSlides(active.lessonId);
    const completed = countCompleted(slides);
    return {
      id: active.lessonId,
      title: active.lessonTitle,
      slideNumber: slides.findIndex((s) => s.pathname === active.pathname) + 1,
      totalSlides: slides.length,
      slidesCompleted: completed,
      progress:
        slides.length > 0
          ? Math.round((completed / slides.length) * PERCENT_MAX)
          : 0,
    };
  }

  get slide() {
    const active = coursePlayer.activeSlide;
    return {
      id: active?.id ?? "",
      title: active?.title ?? "",
      elapsedMs: active ? this.#now - this.#accessors.getSlideEnterTime() : 0,
    };
  }

  get session() {
    return { elapsedMs: this.#now - scormState.sessionStartTime };
  }

  startTicking(): void {
    this.#intervalId = setInterval(() => {
      this.#now = Date.now();
    }, TICK_INTERVAL_MS);
  }

  stopTicking(): void {
    clearInterval(this.#intervalId);
    this.#intervalId = undefined;
  }
}
