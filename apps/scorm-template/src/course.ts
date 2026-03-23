import { defineCourse, defineLesson, defineSlide } from '$lib/player/types.js'
import CourseFrame from './course/layouts/CourseFrame.svelte'
import LessonFrame from './course/layouts/LessonFrame.svelte'

export const course = defineCourse({
  id: 'scorm-template-course',
  title: 'SCORM Template Course',
  description: 'A simple SCORM course template.',
  masteryScore: 80,
  minScore: 0,
  maxScore: 100,
  layout: CourseFrame,
  lessons: [
    defineLesson({
      id: 'overview',
      title: 'Overview',
      layout: LessonFrame,
      slides: [
        defineSlide({
          id: 'welcome',
          component: () => import('./course/slides/welcome/WelcomeSlide.svelte'),
        }),
        defineSlide({
          id: 'course-map',
          component: () => import('./course/slides/overview/CourseMapSlide.svelte'),
        }),
      ],
    }),
    defineLesson({
      id: 'demo',
      title: 'SCORM Demo',
      layout: LessonFrame,
      slides: [
        defineSlide({
          id: 'score',
          component: () => import('./course/slides/demo/ScoreSlide.svelte'),
        }),
        defineSlide({
          id: 'completion',
          component: () => import('./course/slides/demo/CompletionSlide.svelte'),
        }),
        defineSlide({
          id: 'summary',
          component: () => import('./course/slides/demo/SummarySlide.svelte'),
        }),
      ],
    }),
  ],
})
