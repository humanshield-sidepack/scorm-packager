import { _courseSlides, _firstCoursePath, _navigate, _route } from './router.svelte.js'
import { scormState } from '$lib/scorm/index.js'
import type { CourseSlide } from './types.js'

function normalizePathname(pathname: string): `/${string}` {
  let normalized = pathname
  while (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1)
  }
  return (normalized || '/') as `/${string}`
}

const slidesByPath = new Map(_courseSlides.map((slide) => [slide.pathname, slide]))
const slidesByIndex = new Map(_courseSlides.map((slide) => [slide.index, slide]))

class CoursePlayer {
  get slides(): CourseSlide[] {
    return _courseSlides
  }

  get activeSlide(): CourseSlide | undefined {
    return slidesByPath.get(normalizePathname(_route.pathname))
  }

  get isFirst(): boolean {
    return this.activeSlide?.index === 0
  }

  get isLast(): boolean {
    const slide = this.activeSlide
    return slide !== undefined && slide.index === _courseSlides.length - 1
  }

  get firstPath(): `/${string}` {
    return _firstCoursePath
  }

  isVisited(slide: CourseSlide): boolean {
    const active = this.activeSlide
    return active !== undefined && slide.index <= active.index
  }

  async goto(pathname: `/${string}`): Promise<void> {
    await _navigate(pathname)
    scormState.location = pathname
  }

  async goNext(): Promise<void> {
    const nextSlide = slidesByIndex.get((this.activeSlide?.index ?? -1) + 1)
    if (nextSlide) await this.goto(nextSlide.pathname)
  }

  async goPrevious(): Promise<void> {
    const previousSlide = slidesByIndex.get((this.activeSlide?.index ?? 0) - 1)
    if (previousSlide) await this.goto(previousSlide.pathname)
  }
}

export const coursePlayer = new CoursePlayer()
