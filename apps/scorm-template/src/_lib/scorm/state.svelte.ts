import { SCORM12, SCORM2004 } from './elements.js'
import { ScormWrapper } from './wrapper.js'
import type { Scorm2004Mode, Scorm2004Credit, Scorm2004Entry, ScormVersion } from './types.js'
import { ScoreState, CompletionState } from './state-sub.svelte.js'

class StudentState {
  #id = $state('')
  #name = $state('')

  get id(): string {
    return this.#id
  }

  get name(): string {
    return this.#name
  }

  load(wrapper: ScormWrapper): void {
    const isV2004 = wrapper.version === '2004'
    this.#id = wrapper.getValue(isV2004 ? SCORM2004.LEARNER_ID : SCORM12.CORE_STUDENT_ID)
    this.#name = wrapper.getValue(isV2004 ? SCORM2004.LEARNER_NAME : SCORM12.CORE_STUDENT_NAME)
  }
}

class SessionState {
  #mode = $state<Scorm2004Mode>('normal')
  #credit = $state<Scorm2004Credit>('credit')
  #entry = $state<Scorm2004Entry | 'ab-initio'>('ab-initio')

  get mode(): Scorm2004Mode {
    return this.#mode
  }

  get credit(): Scorm2004Credit {
    return this.#credit
  }

  get entry(): Scorm2004Entry | 'ab-initio' {
    return this.#entry
  }

  load(wrapper: ScormWrapper): void {
    const isV2004 = wrapper.version === '2004'
    this.#mode = wrapper.getValue(isV2004 ? SCORM2004.MODE : SCORM12.CORE_LESSON_MODE) as Scorm2004Mode
    this.#credit = wrapper.getValue(isV2004 ? SCORM2004.CREDIT : SCORM12.CORE_CREDIT) as Scorm2004Credit
    this.#entry = wrapper.getValue(isV2004 ? SCORM2004.ENTRY : SCORM12.CORE_ENTRY) as Scorm2004Entry | 'ab-initio'
  }
}


export class ScormState {
  #wrapper = new ScormWrapper()
  #sessionStart = 0
  #location = $state('')

  readonly student: StudentState
  readonly session: SessionState
  readonly score: ScoreState
  readonly completion: CompletionState

  isConnected = $state(false)
  isInitialized = $state(false)
  version = $state<ScormVersion>()
  mode = $state<'lms' | 'dev'>('dev')

  constructor() {
    this.student = new StudentState()
    this.session = new SessionState()
    this.score = new ScoreState(this.#wrapper)
    this.completion = new CompletionState(this.#wrapper)
  }

  get location(): string {
    return this.#location
  }

  set location(value: string) {
    this.#location = value
    const element = this.#wrapper.version === '2004' ? SCORM2004.LOCATION : SCORM12.CORE_LESSON_LOCATION
    this.#wrapper.setValue(element, value)
    this.#wrapper.commit()
  }

  initialize(minScore: number, maxScore: number): boolean {
    this.mode = this.#wrapper.connect()
    this.isConnected = true
    const result = this.#wrapper.initialize()
    this.isInitialized = result
    this.version = this.#wrapper.version
    this.student.load(this.#wrapper)
    this.session.load(this.#wrapper)
    this.score.load(this.#wrapper)
    this.score._setRange(minScore, maxScore)
    this.completion.load(this.#wrapper)
    const isV2004 = this.#wrapper.version === '2004'
    this.#location = this.#wrapper.getValue(isV2004 ? SCORM2004.LOCATION : SCORM12.CORE_LESSON_LOCATION)
    this.#sessionStart = Date.now()
    return result
  }

  commit(): void {
    this.#wrapper.commit()
  }

  terminate(): void {
    const elapsed = Date.now() - this.#sessionStart
    const sessionTime = this.#wrapper.formatSessionTime(elapsed)
    const timeElement = this.#wrapper.version === '2004' ? SCORM2004.SESSION_TIME : SCORM12.CORE_SESSION_TIME
    this.#wrapper.setValue(timeElement, sessionTime)
    this.#wrapper.commit()
    this.#wrapper.terminate()
    this.isInitialized = false
  }
}

export const scormState = new ScormState()
