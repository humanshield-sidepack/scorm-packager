import { findScorm12API, findScorm2004API } from './api-finder.js'
import type { Scorm12API, Scorm2004API, ScormVersion } from './types.js'

const DEV_STORAGE_PREFIX = 'scorm-dev:'
const MS_PER_SECOND = 1000
const SECONDS_PER_HOUR = 3600
const SECONDS_PER_MINUTE = 60
const DECIMAL_RADIX = 10

function padTwo(value: number): string {
  return String(value).padStart(2, '0')
}

function elapsedToComponents(elapsedMs: number): { h: number; m: number; s: number } {
  const total = Math.floor(elapsedMs / MS_PER_SECOND)
  const h = Math.floor(total / SECONDS_PER_HOUR)
  const m = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const s = total % SECONDS_PER_MINUTE
  return { h, m, s }
}

function formatSessionTime12(elapsedMs: number): string {
  const { h, m, s } = elapsedToComponents(elapsedMs)
  return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`
}

function formatSessionTime2004(elapsedMs: number): string {
  const { h, m, s } = elapsedToComponents(elapsedMs)
  return `PT${h}H${m}M${s}S`
}

export class ScormWrapper {
  #api12: Scorm12API | undefined
  #api2004: Scorm2004API | undefined
  #version: ScormVersion | undefined
  #devStore: Map<string, string> | undefined

  get version(): ScormVersion | undefined {
    return this.#version
  }

  get isDev(): boolean {
    return this.#devStore !== undefined
  }

  connect(): 'lms' | 'dev' {
    const api2004 = findScorm2004API()
    if (api2004) {
      this.#api2004 = api2004
      this.#version = '2004'
      return 'lms'
    }

    const api12 = findScorm12API()
    if (api12) {
      this.#api12 = api12
      this.#version = '1.2'
      return 'lms'
    }

    this.#devStore = new Map<string, string>()
    this.#loadDevStore()
    return 'dev'
  }

  initialize(): boolean {
    if (this.#devStore !== undefined) return true
    if (this.#api2004) return this.#api2004.Initialize('') === 'true'
    if (this.#api12) return this.#api12.LMSInitialize('') === 'true'
    return false
  }

  terminate(): boolean {
    if (this.#devStore !== undefined) return true
    if (this.#api2004) return this.#api2004.Terminate('') === 'true'
    if (this.#api12) return this.#api12.LMSFinish('') === 'true'
    return false
  }

  commit(): boolean {
    if (this.#devStore !== undefined) return true
    if (this.#api2004) return this.#api2004.Commit('') === 'true'
    if (this.#api12) return this.#api12.LMSCommit('') === 'true'
    return false
  }

  getValue(element: string): string {
    if (this.#devStore !== undefined) return this.#devStore.get(element) ?? ''
    if (this.#api2004) return this.#api2004.GetValue(element)
    if (this.#api12) return this.#api12.LMSGetValue(element)
    return ''
  }

  setValue(element: string, value: string): boolean {
    if (this.#devStore !== undefined) {
      this.#devStore.set(element, value)
      this.#persistDevStore()
      return true
    }
    if (this.#api2004) return this.#api2004.SetValue(element, value) === 'true'
    if (this.#api12) return this.#api12.LMSSetValue(element, value) === 'true'
    return false
  }

  getLastErrorCode(): number {
    if (this.#devStore !== undefined) return 0
    if (this.#api2004) {
      const retrieve = this.#api2004.GetLastError.bind(this.#api2004)
      return Number.parseInt(retrieve(), DECIMAL_RADIX)
    }
    if (this.#api12) {
      const retrieve = this.#api12.LMSGetLastError.bind(this.#api12)
      return Number.parseInt(retrieve(), DECIMAL_RADIX)
    }
    return 0
  }

  getErrorDescription(errorCode: number): string {
    const code = String(errorCode)
    if (this.#api2004) return this.#api2004.GetErrorString(code)
    if (this.#api12) return this.#api12.LMSGetErrorString(code)
    return ''
  }

  getDiagnosticInfo(errorCode: number): string {
    const code = String(errorCode)
    if (this.#api2004) return this.#api2004.GetDiagnostic(code)
    if (this.#api12) return this.#api12.LMSGetDiagnostic(code)
    return ''
  }

  formatSessionTime(elapsedMs: number): string {
    if (this.#version === '2004') return formatSessionTime2004(elapsedMs)
    return formatSessionTime12(elapsedMs)
  }

  #loadDevStore(): void {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (key?.startsWith(DEV_STORAGE_PREFIX)) {
        const element = key.slice(DEV_STORAGE_PREFIX.length)
        this.#devStore!.set(element, localStorage.getItem(key) || '')
      }
    }
  }

  #persistDevStore(): void {
    for (const [element, value] of this.#devStore!) {
      localStorage.setItem(`${DEV_STORAGE_PREFIX}${element}`, value)
    }
  }
}
