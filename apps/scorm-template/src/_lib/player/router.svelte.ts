import { createRouter, type LazyRouteComponent, type Routes } from 'sv-router'
import type { CourseDefinition, CourseSlide, LessonDefinition } from './types.js'
import { course } from '../../course.js'

function buildPathname(lessonId: string, slideId: string, slideCount: number): `/${string}` {
  if (slideCount === 1) return `/${lessonId}`
  return `/${lessonId}/${slideId}`
}

export function _flattenCourseSlides(definition: CourseDefinition): CourseSlide[] {
  const partial: Omit<CourseSlide, 'total'>[] = []
  for (const lesson of definition.lessons) {
    for (const slide of lesson.slides) {
      partial.push({
        ...slide,
        index: partial.length,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        pathname: buildPathname(lesson.id, slide.id, lesson.slides.length),
      })
    }
  }
  const total = partial.length
  return partial.map((slide) => ({ ...slide, total }))
}

function buildLessonRoutes(lesson: LessonDefinition): Routes {
  if (lesson.slides.length === 1) {
    return { '/': lesson.slides[0]!.component as LazyRouteComponent }
  }
  const nested: Routes = {}
  for (const slide of lesson.slides) {
    nested[`/${slide.id}`] = { '/': slide.component as LazyRouteComponent }
  }
  return nested
}

export function _buildRoutes(definition: CourseDefinition): Routes {
  const routes: Routes = {}

  if (definition.layout) {
    routes.layout = definition.layout
  }

  for (const lesson of definition.lessons) {
    const lessonRoutes = buildLessonRoutes(lesson)
    if (lesson.layout) {
      lessonRoutes.layout = lesson.layout
    }
    routes[`/${lesson.id}`] = lessonRoutes
  }

  return routes
}

export const _courseSlides = _flattenCourseSlides(course)
export const _firstCoursePath: `/${string}` = _courseSlides[0]?.pathname ?? '/'

const { navigate, route } = createRouter(_buildRoutes(course))

export { navigate as _navigate, route as _route }
