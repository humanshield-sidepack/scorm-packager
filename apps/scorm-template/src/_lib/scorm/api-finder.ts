import type { Scorm12API, Scorm2004API } from './types.js'

const MAX_SEARCH_DEPTH = 500

function isScorm12API(value: unknown): value is Scorm12API {
  return (
    typeof value === 'object' &&
    value !== null &&
    'LMSInitialize' in value &&
    'LMSGetValue' in value &&
    'LMSSetValue' in value
  )
}

function isScorm2004API(value: unknown): value is Scorm2004API {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Initialize' in value &&
    'GetValue' in value &&
    'SetValue' in value
  )
}

export function findScorm12API(): Scorm12API | undefined {
  let currentWindow = globalThis as unknown as Window
  let depth = 0

  while (depth < MAX_SEARCH_DEPTH) {
    try {
      const candidate = currentWindow.API
      if (isScorm12API(candidate)) return candidate
    } catch {
      return undefined
    }

    if (currentWindow.parent === currentWindow) break
    currentWindow = currentWindow.parent
    depth++
  }

  return undefined
}

export function findScorm2004API(): Scorm2004API | undefined {
  let currentWindow = globalThis as unknown as Window
  let depth = 0

  while (depth < MAX_SEARCH_DEPTH) {
    try {
      const candidate = currentWindow.API_1484_11
      if (isScorm2004API(candidate)) return candidate
    } catch {
      return undefined
    }

    if (currentWindow.parent === currentWindow) break
    currentWindow = currentWindow.parent
    depth++
  }

  return undefined
}
