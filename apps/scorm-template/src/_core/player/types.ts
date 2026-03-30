import type { Component, Snippet } from "svelte";
export type LayoutComponent = Component<{ children: Snippet }>;

export type SlideCompletionMode = "auto" | "manual";
export type SequencingMode = "linear" | "free";

export type SlideDefinition = {
  id: string;
  title?: string;
  description?: string;
  completionMode?: SlideCompletionMode;
  component: () => Promise<{ default: Component }>;
};

export type LessonDefinition = {
  id: string;
  title: string;
  description?: string;
  layout?: LayoutComponent;
  slides: SlideDefinition[];
};

export type CourseDefinition = {
  id: string;
  title: string;
  description?: string;
  masteryScore?: number;
  minScore: number;
  maxScore: number;
  storageMode?: "standard" | "chunked";
  sequencing?: SequencingMode;
  layout?: LayoutComponent;
  loadingComponent?: Component;
  lessons: LessonDefinition[];
};

export type CourseSlide = Omit<SlideDefinition, "completionMode"> & {
  index: number;
  total: number;
  lessonId: string;
  lessonTitle: string;
  pathname: `/${string}`;
  completionMode: SlideCompletionMode;
};

export type ActiveSlideState = CourseSlide & {
  readonly status: import("$core/scorm/persistent-store.svelte.js").SlideObjectiveStatus;
  readonly isPassed: boolean;
  readonly isFailed: boolean;
  readonly score: number | undefined;
};

export function defineCourse(definition: CourseDefinition): CourseDefinition {
  return definition;
}

export function defineLesson(definition: LessonDefinition): LessonDefinition {
  return definition;
}

export function defineSlide(definition: SlideDefinition): SlideDefinition {
  return definition;
}
