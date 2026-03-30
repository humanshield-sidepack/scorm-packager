import type { RecordedInteraction } from "$core/scorm/index.js";

export interface Question {
  readonly fullId: string;
  readonly id: string;
  readonly question: string;
  readonly weight: number;
  readonly isPassed: boolean;
  readonly attempts: RecordedInteraction[];
  selectedAnswer: string | undefined;
  handleSubmit(): void;
}

export interface TestDefinition {
  id: string;
  questions: Question[];
  passThreshold?: number;
  contributesToCourseScore?: boolean;
}

export type QuestionResult = "correct" | "incorrect" | undefined;

export type TestPhase = "unanswered" | "submitted" | "retrying";

export interface TestHandle {
  readonly id: string;
  readonly fullId: string;
  readonly questions: Question[];
  readonly score: number;
  readonly isPassed: boolean;
  readonly isSubmitted: boolean;
  readonly phase: TestPhase;
  readonly allAnswered: boolean;
  readonly hasIncorrect: boolean;
  readonly passedCount: number;
  readonly answeredCount: number;
  readonly pendingCount: number;
  questionResult(q: Question): QuestionResult;
  submit(): void;
  retry(): void;
}
