export { coursePlayer } from "./player.svelte.js";
export { default as LoadingScreen } from "./LoadingScreen.svelte";
export { useSlideCompletion } from "./slide-completion.svelte.js";
export type { SlideCompletionHandle } from "./slide-completion.svelte.js";
export type { PlayerBuiltins } from "./player-metrics.svelte.js";
export type {
  ActiveSlideState,
  CourseDefinition,
  CourseSlide,
  LayoutComponent,
  LessonDefinition,
  SlideCompletionMode,
  SlideDefinition,
  SequencingMode,
} from "./types.js";
export { defineCourse, defineLesson, defineSlide } from "./types.js";
