export type ScormVersion = '1.2' | '2004'

export type ScormBoolString = 'true' | 'false'

export type Scorm12LessonStatus =
  | 'passed'
  | 'completed'
  | 'failed'
  | 'incomplete'
  | 'browsed'
  | 'not attempted'

export type Scorm12LessonMode = 'browse' | 'normal' | 'review'

export type Scorm12Credit = 'credit' | 'no-credit'

export type Scorm12Exit = 'time-out' | 'suspend' | 'logout' | ''

export type Scorm12Entry = 'ab-initio' | 'resume' | ''

export type Scorm12TimeLimitAction =
  | 'exit,message'
  | 'exit,no message'
  | 'continue,message'
  | 'continue,no message'

export type Scorm12InteractionType =
  | 'true-false'
  | 'choice'
  | 'fill-in'
  | 'matching'
  | 'performance'
  | 'sequencing'
  | 'likert'
  | 'numeric'

export type Scorm12InteractionResult =
  | 'correct'
  | 'wrong'
  | 'unanticipated'
  | 'neutral'

export interface Scorm12API {
  LMSInitialize(parameter: ''): ScormBoolString
  LMSFinish(parameter: ''): ScormBoolString
  LMSGetValue(element: string): string
  LMSSetValue(element: string, value: string): ScormBoolString
  LMSCommit(parameter: ''): ScormBoolString
  LMSGetLastError(): string
  LMSGetErrorString(errorCode: string): string
  LMSGetDiagnostic(errorCode: string): string
}

export type Scorm2004CompletionStatus =
  | 'completed'
  | 'incomplete'
  | 'not attempted'
  | 'unknown'

export type Scorm2004SuccessStatus = 'passed' | 'failed' | 'unknown'

export type Scorm2004Mode = 'browse' | 'normal' | 'review'

export type Scorm2004Credit = 'credit' | 'no-credit'

export type Scorm2004Exit = 'timeout' | 'suspend' | 'logout' | 'normal' | ''

export type Scorm2004Entry = 'ab_initio' | 'resume' | ''

export type Scorm2004TimeLimitAction =
  | 'exit,message'
  | 'exit,no message'
  | 'continue,message'
  | 'continue,no message'

export type Scorm2004InteractionType =
  | 'true-false'
  | 'choice'
  | 'fill-in'
  | 'long-fill-in'
  | 'matching'
  | 'performance'
  | 'sequencing'
  | 'likert'
  | 'numeric'
  | 'other'

export type Scorm2004InteractionResult =
  | 'correct'
  | 'incorrect'
  | 'unanticipated'
  | 'neutral'

export type Scorm2004NavRequest =
  | 'continue'
  | 'previous'
  | 'choice'
  | 'jump'
  | 'exit'
  | 'exitAll'
  | 'abandon'
  | 'abandonAll'
  | 'suspendAll'
  | '_none_'

export type Scorm2004NavState = 'true' | 'false' | 'unknown'

export type Scorm2004AudioCaptioning = '-1' | '0' | '1'

export interface Scorm2004API {
  Initialize(parameter: ''): ScormBoolString
  Terminate(parameter: ''): ScormBoolString
  GetValue(element: string): string
  SetValue(element: string, value: string): ScormBoolString
  Commit(parameter: ''): ScormBoolString
  GetLastError(): string
  GetErrorString(errorCode: string): string
  GetDiagnostic(errorCode: string): string
}

export type ScormAPI = Scorm12API | Scorm2004API
