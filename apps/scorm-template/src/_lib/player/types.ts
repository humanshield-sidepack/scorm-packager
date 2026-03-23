import type { Component, Snippet } from 'svelte'

export type LayoutComponent = Component<{ children: Snippet }>

export type SlideDefinition = {
  id: string
  source: string
  component: () => Promise<{ default: Component }>
}

export type LessonDefinition = {
  id: string
  title: string
  description?: string
  layout?: LayoutComponent
  slides: SlideDefinition[]
}

export type CourseDefinition = {
  id: string
  title: string
  description?: string
  masteryScore?: number
  minScore: number
  maxScore: number
  layout?: LayoutComponent
  lessons: LessonDefinition[]
}

export type CourseSlide = SlideDefinition & {
  index: number
  total: number
  lessonId: string
  lessonTitle: string
  pathname: `/${string}`
}

export function defineCourse(definition: CourseDefinition): CourseDefinition {
  return definition
}

export function defineLesson(definition: LessonDefinition): LessonDefinition {
  return definition
}

export function defineSlide(definition: SlideDefinition): SlideDefinition {
  return definition
}
