# SCORM Template — Course Author Reference

## Table of Contents

- [Course Definition](#course-definition)
- [Sequencing](#sequencing)
- [Slide Completion](#slide-completion)
- [Course Player](#course-player)
- [Player Metrics](#player-metrics)
- [SCORM State](#scorm-state)
- [Quiz & Test System](#quiz--test-system)
- [Course Score vs Slide Score](#course-score-vs-slide-score)
- [Course Completion vs Slide Completion](#course-completion-vs-slide-completion)
- [Persistent Store](#persistent-store)
- [Interactions](#interactions)
- [Objectives](#objectives)
- [Storage Modes](#storage-modes)
- [App Structure](#app-structure)
- [Dev vs LMS Mode](#dev-vs-lms-mode)

---

## Course Definition

Define your course in `src/course.ts` using three helper functions:

```ts
import { defineCourse, defineLesson, defineSlide } from "$core/player/types.js";
import CourseFrame from "./course/layouts/CourseFrame.svelte";
import LessonFrame from "./course/layouts/LessonFrame.svelte";

export const course = defineCourse({
  id: "my-course",
  title: "My Course",
  description: "Optional description",
  masteryScore: 80, // optional, score to pass
  minScore: 0,
  maxScore: 100,
  sequencing: "linear", // 'linear' (default) or 'free'
  storageMode: "standard", // 'standard' (default) or 'chunked'
  layout: CourseFrame, // optional course-level layout
  loadingComponent: MyLoader, // optional custom loading screen
  lessons: [
    defineLesson({
      id: "intro",
      title: "Introduction",
      description: "Optional",
      layout: LessonFrame, // optional lesson-level layout
      slides: [
        defineSlide({
          id: "welcome",
          title: "Welcome", // optional, falls back to id
          description: "Optional slide description",
          component: () =>
            import("./course/slides/welcome/WelcomeSlide.svelte"),
        }),
        defineSlide({
          id: "quiz",
          title: "Quiz",
          completionMode: "manual", // requires explicit markPassed()
          component: () => import("./course/slides/quiz/Quiz.svelte"),
        }),
      ],
    }),
  ],
});
```

### Types

| Type               | Fields                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CourseDefinition` | `id`, `title`, `description?`, `masteryScore?`, `minScore`, `maxScore`, `sequencing?`, `storageMode?`, `layout?`, `loadingComponent?`, `lessons` |
| `LessonDefinition` | `id`, `title`, `description?`, `layout?`, `slides`                                                                                               |
| `SlideDefinition`  | `id`, `title?`, `description?`, `completionMode?`, `component` (lazy import)                                                                     |
| `LayoutComponent`  | `Component<{ children: Snippet }>` — wraps child content                                                                                         |

### Runtime: CourseSlide

Each slide gets enhanced at runtime with:

```ts
type CourseSlide = SlideDefinition & {
  index: number; // 0-based position in entire course
  total: number; // total slide count
  lessonId: string;
  lessonTitle: string;
  pathname: `/${string}`; // e.g. '/intro/welcome'
  completionMode: SlideCompletionMode; // resolved: 'auto' or 'manual'
};
```

---

## Sequencing

Controls whether learners must complete slides in order.

```ts
defineCourse({
  sequencing: "linear", // default — slides gate in order
  // sequencing: 'free', // all slides accessible at any time
});
```

### How linear sequencing works

- A slide is **locked** if the previous slide has not been **passed**
- `goto()` silently refuses navigation to locked slides
- `goNext()` refuses if the current slide is not passed
- `goPrevious()` always works — backward navigation is unrestricted
- The first slide is never locked

### How free sequencing works

- All slides are accessible at any time
- No navigation restrictions

### Checking lock state

```ts
coursePlayer.isLocked(slide); // true if the slide can't be navigated to yet
coursePlayer.getSlideStatus(slide); // 'passed' | 'failed' | 'incomplete' | 'not attempted'
```

---

## Slide Completion

Each slide has a `completionMode` that determines how it gets marked as passed.

### Completion modes

| Mode       | Behavior                                           | Use for                |
| ---------- | -------------------------------------------------- | ---------------------- |
| `'auto'`   | Marked as passed automatically on visit (default)  | Content/info slides    |
| `'manual'` | Must call `markPassed()` explicitly from the slide | Quiz/assessment slides |

### `useSlideCompletion()` hook

For manual-completion slides, use this hook inside your slide component:

```ts
import { useSlideCompletion } from "$core/player";

const completion = useSlideCompletion();
```

#### Returned handle

| Property / Method            | Type                   | Description                                                         |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `status`                     | `SlideObjectiveStatus` | Reactive: `'passed'`, `'failed'`, `'incomplete'`, `'not attempted'` |
| `isPassed`                   | `boolean`              | Reactive: slide is passed                                           |
| `isFailed`                   | `boolean`              | Reactive: slide is failed                                           |
| `score`                      | `number \| undefined`  | Reactive: slide score (0–100)                                       |
| `markPassed()`               | `void`                 | Mark the slide as passed                                            |
| `markFailed()`               | `void`                 | Mark the slide as failed                                            |
| `markPassedWithScore(score)` | `void`                 | Mark passed with a score (0–100)                                    |

A slide that has been marked `'passed'` is never downgraded to `'failed'` or `'incomplete'`.

### Example: quiz slide with manual completion

For simple cases you can use `useSlideCompletion()` directly, but for quizzes with scoring, thresholds, and course score integration, use `defineTest()` instead (see [Quiz & Test System](#quiz--test-system)).

```svelte
<script lang="ts">
  import { defineMultiChoiceQuestion, defineTest } from "$core/quiz";

  const q1 = defineMultiChoiceQuestion({
    id: "scorm-acronym",
    question: "What does SCORM stand for?",
    options: [
      { key: "A", label: "Shareable Content Object Reference Model" },
      { key: "B", label: "Standard Course Object Resource Manager" },
    ],
    correctAnswer: "A",
  });

  // defineTest handles slide completion, scoring, and course score automatically
  const test = defineTest({
    id: "my-quiz",
    questions: [q1],
    passThreshold: 1.0, // 100% to pass (default)
  });
</script>
```

### Zero-config behavior

- Content slides auto-complete on visit — no code needed
- Quiz slides: add `completionMode: 'manual'` in `course.ts`, then use `defineTest()` in the component — it handles slide completion automatically
- Default sequencing is `'linear'` — no config needed for gated navigation

---

## Course Player

```ts
import { coursePlayer } from "$core/player";
```

### Properties

| Property        | Type                       | Description                                  |
| --------------- | -------------------------- | -------------------------------------------- |
| `slides`        | `CourseSlide[]`            | All slides in the course                     |
| `activeSlide`   | `CourseSlide \| undefined` | Currently displayed slide (reactive)         |
| `canGoNext`     | `boolean`                  | Reactive: next slide exists and is reachable |
| `canGoPrevious` | `boolean`                  | Reactive: previous slide exists              |
| `firstPath`     | `` `/${string}` ``         | Path to the first slide                      |
| `isNavigating`  | `boolean`                  | True while navigating (reactive)             |

### Methods

```ts
await coursePlayer.goto("/lesson-id/slide-id"); // navigate to path (refused if locked)
await coursePlayer.goNext(); // next slide (refused if canGoNext is false)
await coursePlayer.goPrevious(); // previous slide (refused if canGoPrevious is false)
coursePlayer.isLocked(slide); // is this slide locked by sequencing?
coursePlayer.getSlideStatus(slide); // 'passed' | 'failed' | 'incomplete' | 'not attempted'
```

---

## Player Metrics

All metrics are reactive (`$derived`). Access via `coursePlayer`:

### `coursePlayer.course`

| Field             | Type     | Description                                  |
| ----------------- | -------- | -------------------------------------------- |
| `slideNumber`     | `number` | Current slide (1-based)                      |
| `totalSlides`     | `number` | Total slides in course                       |
| `slidesCompleted` | `number` | Slides with status `'passed'`                |
| `progress`        | `number` | Percentage 0–100 (based on slides completed) |
| `lessonNumber`    | `number` | Current lesson (1-based)                     |
| `totalLessons`    | `number` | Total lessons                                |

### `coursePlayer.lesson`

| Field             | Type     | Description                                |
| ----------------- | -------- | ------------------------------------------ |
| `id`              | `string` | Current lesson ID                          |
| `title`           | `string` | Current lesson title                       |
| `slideNumber`     | `number` | Slide position within lesson (1-based)     |
| `totalSlides`     | `number` | Slides in current lesson                   |
| `slidesCompleted` | `number` | Completed slides in current lesson         |
| `progress`        | `number` | Lesson progress 0–100 (based on completed) |

### `coursePlayer.slide`

| Field       | Type     | Description                |
| ----------- | -------- | -------------------------- |
| `id`        | `string` | Current slide ID           |
| `title`     | `string` | Current slide title        |
| `elapsedMs` | `number` | Time on current slide (ms) |

### `coursePlayer.session`

| Field       | Type     | Description                             |
| ----------- | -------- | --------------------------------------- |
| `elapsedMs` | `number` | Total session time (ms), ticks every 1s |

### Usage

```svelte
<p>Progress: {coursePlayer.course.progress}%</p>
<p>
  Slide {coursePlayer.course.slideNumber} of {coursePlayer.course.totalSlides}
</p>
<p>
  Completed: {coursePlayer.course.slidesCompleted} / {coursePlayer.course
    .totalSlides}
</p>
<p>Time on slide: {Math.round(coursePlayer.slide.elapsedMs / 1000)}s</p>
```

---

## SCORM State

```ts
import { scormState } from "$core/scorm";
```

### Properties

| Property           | Type                           | Description                                 |
| ------------------ | ------------------------------ | ------------------------------------------- |
| `isConnected`      | `boolean`                      | SCORM API found                             |
| `isInitialized`    | `boolean`                      | Successfully initialized                    |
| `version`          | `'1.2' \| '2004' \| undefined` | Detected SCORM version                      |
| `mode`             | `'lms' \| 'dev'`               | Running against LMS or localStorage         |
| `location`         | `string`                       | Current slide path (read/write, auto-saved) |
| `sessionStartTime` | `number`                       | Timestamp when course started               |
| `sessionElapsedMs` | `number`                       | Elapsed time (read-only)                    |

### Student Info

```ts
scormState.student.id; // learner ID from LMS
scormState.student.name; // learner name from LMS
```

### Session Info

```ts
scormState.session.mode; // 'normal' | 'browse' | 'review'
scormState.session.credit; // 'credit' | 'no-credit'
scormState.session.entry; // 'ab-initio' | 'ab_initio' | 'resume' | ''
```

### Methods

```ts
scormState.commit(); // force save to LMS
scormState.terminate(); // end session (called automatically on page unload)
```

---

## Quiz & Test System

The quiz system provides reusable `Question` and `Test` abstractions. Course authors define questions, group them into a test, and everything else — slide completion, weighted scoring, pass thresholds, and course score aggregation — is handled automatically.

### Question types

#### `defineMultiChoiceQuestion()`

```ts
import { defineMultiChoiceQuestion } from "$core/quiz";

const q = defineMultiChoiceQuestion({
  id: "my-question",
  question: "What does SCORM stand for?",
  options: [
    { key: "A", label: "Shareable Content Object Reference Model" },
    { key: "B", label: "Standard Course Object Resource Manager" },
    { key: "C", label: "Synchronized Content Online Reference Module" },
    { key: "D", label: "Simple Course Object Runtime Model" },
  ],
  correctAnswer: "A",
  weight: 2, // optional, default 1
});
```

#### `defineTrueFalseQuestion()`

```ts
import { defineTrueFalseQuestion } from "$core/quiz";

const q = defineTrueFalseQuestion({
  id: "tf-question",
  question: "SCORM 2004 supports sequencing and navigation.",
  correctAnswer: "true", // "true" or "false"
  weight: 1, // optional, default 1
});
```

#### The `Question` interface

Both factories return an object conforming to `Question`. Future question types (fill-in, matching, etc.) implement the same interface.

| Property / Method | Type                    | Description                                       |
| ----------------- | ----------------------- | ------------------------------------------------- |
| `id`              | `string`                | Short ID provided by the author                   |
| `fullId`          | `string`                | Globally unique: `q:{lessonId}:{slideId}:{id}`    |
| `question`        | `string`                | Question text                                     |
| `weight`          | `number`                | Weight for scoring (default 1)                    |
| `selectedAnswer`  | `string \| undefined`   | Writable reactive state — bind UI selections here |
| `isPassed`        | `boolean`               | Reactive: answered correctly                      |
| `attempts`        | `RecordedInteraction[]` | All recorded attempts                             |
| `handleSubmit()`  | `void`                  | Submits `selectedAnswer` to SCORM                 |

Set the user's selection directly on the question:

```svelte
<button onclick={() => (q.selectedAnswer = "A")}>Option A</button>
```

### `defineTest()`

Groups questions into a test with weighted scoring and a pass threshold. The test **owns slide completion** — you never call `useSlideCompletion()` yourself.

```ts
import { defineMultiChoiceQuestion, defineTest } from "$core/quiz";

const q1 = defineMultiChoiceQuestion({ id: "q1", ..., weight: 2 });
const q2 = defineMultiChoiceQuestion({ id: "q2", ... });

const test = defineTest({
  id: "knowledge-check",
  questions: [q1, q2],
  passThreshold: 0.5, // 50% to pass (0–1, default 1.0)
});
```

#### `TestHandle` properties and methods

| Property / Method   | Type             | Description                                        |
| ------------------- | ---------------- | -------------------------------------------------- |
| `id`                | `string`         | Test ID                                            |
| `fullId`            | `string`         | Globally unique: `test:{lessonId}:{slideId}:{id}`  |
| `questions`         | `Question[]`     | All questions in the test                          |
| `score`             | `number`         | Weighted score 0–100% (reactive)                   |
| `isPassed`          | `boolean`        | Reactive: `score >= passThreshold * 100`           |
| `isSubmitted`       | `boolean`        | Reactive: test has been submitted                  |
| `allAnswered`       | `boolean`        | Reactive: every question has a `selectedAnswer`    |
| `hasIncorrect`      | `boolean`        | Reactive: submitted with at least one wrong answer |
| `passedCount`       | `number`         | Number of correctly answered questions             |
| `answeredCount`     | `number`         | Number of questions with a selected answer         |
| `questionResult(q)` | `QuestionResult` | `'correct'`, `'incorrect'`, or `undefined`         |
| `submit()`          | `void`           | Submits all questions' `selectedAnswer`s           |
| `retry()`           | `void`           | Clears submitted state and all selections          |

#### What `defineTest()` handles automatically

1. **Slide completion** — calls `useSlideCompletion()` internally; marks the slide as passed (with score) or sets the score on failure
2. **Weighted scoring** — `score = (earned weight / total weight) * 100`
3. **Pass threshold** — `isPassed` when `score >= passThreshold * 100`
4. **Session restore** — if the test was already passed in a previous session, pre-fills `selectedAnswer` from persisted attempts
5. **Course score** — all tests automatically contribute to `scormState.score.raw` via the test registry (scaled to the course's `minScore`–`maxScore` range)

### Course score aggregation

Every `defineTest()` call registers the test with a global `testRegistry`. The registry:

- Averages all test scores into a single course score percentage
- Scales that percentage to the course's `minScore`–`maxScore` range and writes it to `scormState.score.raw`
- Calls `scormState.completion.setPassed()` when all tests pass

No manual wiring needed. If your course has two quiz slides each with a `defineTest()`, the course score is the average of their two scores.

### Full example

```svelte
<script lang="ts">
  import { defineMultiChoiceQuestion, defineTest } from "$core/quiz";
  import { Button } from "$lib/components/ui/button/index.js";

  const q1 = defineMultiChoiceQuestion({
    id: "scorm-acronym",
    question: "What does SCORM stand for?",
    options: [
      { key: "A", label: "Shareable Content Object Reference Model" },
      { key: "B", label: "Standard Course Object Resource Manager" },
    ],
    correctAnswer: "A",
    weight: 2,
  });

  const q2 = defineMultiChoiceQuestion({
    id: "scorm-version",
    question: "Which SCORM version introduced sequencing?",
    options: [
      { key: "A", label: "SCORM 1.2" },
      { key: "B", label: "SCORM 2004" },
    ],
    correctAnswer: "B",
  });

  const test = defineTest({
    id: "knowledge-check",
    questions: [q1, q2],
    passThreshold: 0.5,
  });
</script>

{#each test.questions as q, qi (q.id)}
  {@const result = test.questionResult(q)}
  <h2>{qi + 1}. {q.question}</h2>
  {#each q.options as option (option.key)}
    <button
      disabled={test.isSubmitted}
      onclick={() => (q.selectedAnswer = option.key)}
    >
      {option.key}. {option.label}
    </button>
  {/each}
  {#if result === "correct"}<p>Correct!</p>{/if}
  {#if result === "incorrect"}<p>Incorrect — try again.</p>{/if}
{/each}

<p>{test.answeredCount} of {test.questions.length} answered</p>

{#if test.isPassed}
  <p>Passed — {Math.round(test.score)}%</p>
{:else if test.hasIncorrect}
  <p>{test.passedCount} of {test.questions.length} correct</p>
  <Button onclick={() => test.retry()}>Retry</Button>
{:else}
  <Button disabled={!test.allAnswered} onclick={() => test.submit()}>
    Submit
  </Button>
{/if}
```

### Creating a new question type

To add a new question type (e.g., fill-in-the-blank):

1. Create `src/_core/quiz/define-fill-in.svelte.ts`
2. Export a factory that returns an object conforming to `Question`
3. Internally call `scormState.store.recordInteraction({ type: "fill-in", ... })`
4. Re-export from `src/_core/quiz/index.ts`

The new type works with `defineTest()` immediately — no changes to the test or scoring system.

---

## Course Score vs Slide Score

These are two separate concepts that serve different purposes.

### Course score (`scormState.score`)

The **course score** is the overall grade reported to the LMS via `cmi.core.score` (SCORM 1.2) or `cmi.score` (SCORM 2004). This is what the LMS displays in its gradebook.

```ts
scormState.score.raw; // get/set — clamped to [min, max]
scormState.score.min; // read-only (set from course definition)
scormState.score.max; // read-only (set from course definition)
scormState.score.scaled; // read-only, SCORM 2004 only (auto-calculated)
```

- Range defined by `minScore` / `maxScore` in `defineCourse()`
- If you use `defineTest()`, the course score is set automatically via the test registry (see [Quiz & Test System](#quiz--test-system))
- You can also set it manually for custom grading logic
- The LMS uses this alongside `masteryScore` to determine pass/fail

```ts
scormState.score.raw = 85;
// SCORM 1.2:  raw = 85
// SCORM 2004: raw = 85, scaled = 0.85 (auto)
```

### Slide score (`useSlideCompletion().score`)

The **slide score** is a per-slide value (0–100) stored in SCORM objectives. It is used internally for sequencing and progress tracking.

```ts
const completion = useSlideCompletion();
completion.markPassedWithScore(90); // stores score=90, min=0, max=100 on this slide's objective
completion.score; // 90
```

- Always 0–100 range (fixed)
- Stored per-slide via `cmi.objectives`
- Not automatically aggregated into the course score
- Used for per-slide tracking, not LMS gradebook reporting

### When to use which

| Scenario                                   | Use                                                            |
| ------------------------------------------ | -------------------------------------------------------------- |
| Quiz slides with automatic scoring         | `defineTest()` — handles both slide and course score           |
| Setting the overall grade manually         | `scormState.score.raw = 85`                                    |
| Tracking how a learner scored on one slide | `completion.markPassedWithScore(90)`                           |
| Custom grading from slide scores           | Read slide scores, compute average, set `scormState.score.raw` |

---

## Course Completion vs Slide Completion

These are also two separate concepts.

### Course completion (`scormState.completion`)

The **course completion** is the overall status reported to the LMS via `cmi.core.lesson_status` (SCORM 1.2) or `cmi.completion_status` / `cmi.success_status` (SCORM 2004). This is what the LMS uses to mark the course as done.

```ts
scormState.completion.status; // 'completed' | 'incomplete' | 'not attempted' | 'unknown'
scormState.completion.success; // 'passed' | 'failed' | 'unknown'
```

| Method            | Status     | Success       |
| ----------------- | ---------- | ------------- |
| `setCompleted()`  | completed  | _(unchanged)_ |
| `setIncomplete()` | incomplete | unknown       |
| `setPassed()`     | completed  | passed        |
| `setFailed()`     | completed  | failed        |

- You call these yourself when your course logic decides the learner is done
- The LMS uses this to determine if the learner has finished

### Slide completion (`useSlideCompletion()` / `coursePlayer.getSlideStatus()`)

**Slide completion** is a per-slide status stored in SCORM objectives. It drives sequencing (which slides are locked/unlocked) and progress tracking.

```ts
// From inside a slide component:
const completion = useSlideCompletion();
completion.status; // 'passed' | 'failed' | 'incomplete' | 'not attempted'
completion.isPassed; // true if passed
completion.markPassed(); // mark this slide as passed

// From anywhere:
coursePlayer.getSlideStatus(slide); // same status values
coursePlayer.isLocked(slide); // true if previous slide not passed (linear mode)
```

- Managed automatically for `'auto'` slides (passed on visit)
- Managed via `useSlideCompletion()` for `'manual'` slides
- Not automatically aggregated into course completion

### When to use which

| Scenario                                                | Use                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Telling the LMS the learner finished the course         | `scormState.completion.setPassed()`                                            |
| Gating navigation so slide 3 requires slide 2 to pass   | Set `completionMode: 'manual'` + `useSlideCompletion()`                        |
| Checking if all slides are done to decide course status | Read `coursePlayer.course.slidesCompleted === coursePlayer.course.totalSlides` |

---

## Persistent Store

Key-value storage that persists in SCORM `suspend_data`.

```ts
const store = scormState.store;
```

### String / Number / Boolean / Object

```ts
store.setString("theme", "dark");
store.getString("theme"); // 'dark' | undefined

store.setNumber("fontSize", 16);
store.getNumber("fontSize"); // 16 | undefined

store.setBoolean("soundOn", true);
store.getBoolean("soundOn"); // true | undefined

store.setObject("prefs", { a: 1 });
store.getObject<{ a: number }>("prefs"); // { a: 1 } | undefined

store.has("theme"); // true
store.delete("theme");
```

All set operations auto-persist immediately.

### Access All Variables

```ts
store.variables; // Record<string, unknown> — reactive
```

---

## Interactions

Record learner responses to questions. Written to the SCORM `cmi.interactions` data model for LMS reporting.

```ts
store.recordInteraction({
  id: "q:lesson1:slide1:question1",
  type: "choice", // 'true-false' | 'choice' | 'fill-in' | 'matching' | etc.
  learnerResponse: "A",
  correctResponse: "B",
  result: "incorrect", // 'correct' | 'incorrect' | 'unanticipated' | 'neutral'
  weighting: 1, // points
  // optional: latency, objectiveId, description (2004 only)
});
```

### Reading History (current session only)

```ts
store.interactionHistory; // Record<string, RecordedInteraction[]>

// RecordedInteraction:
// { id, type, learnerResponse, correctResponse, result, weighting, timestamp }
```

> **Note:** `cmi.interactions` are write-only on most SCORM 1.2 LMS. History is available within a session but not across sessions. Use objectives for cross-session state.

---

## Objectives

Automatically created when you `recordInteraction()`. Persist across sessions via `cmi.objectives`.

```ts
store.isObjectivePassed("q:lesson1:slide1:question1"); // boolean
store.getObjective("q:lesson1:slide1:question1");
// { id, status: 'passed' | 'failed' | 'incomplete' | 'not attempted', score? }
```

### How it works

- When `result === 'correct'` -> objective status = `'passed'`
- When `result === 'incorrect'` -> objective status = `'failed'`
- A `'passed'` objective is never downgraded to `'failed'`
- Objective IDs should use a `q:` prefix for quiz objectives: `q:lessonId:slideId:questionId`

### Slide objectives

Slide completion state is also stored as objectives with IDs in the format `slide:{lessonId}:{slideId}`. These are managed automatically by the player — you don't need to interact with them directly.

---

## Storage Modes

Set in `defineCourse({ storageMode: ... })`:

| Mode                   | How                                                   | Limits                 | Best for                               |
| ---------------------- | ----------------------------------------------------- | ---------------------- | -------------------------------------- |
| `'standard'` (default) | Variables compressed in `suspend_data`                | 4KB (1.2), 64KB (2004) | Most courses                           |
| `'chunked'`            | Overflow data split across `cmi.interactions` records | Virtually unlimited    | Large courses with lots of stored data |

---

## App Structure

```
src/
  course.ts                    <- Define your course here
  App.svelte                   <- Root component (don't edit usually)
  _core/
    player/
      CourseShell.svelte       <- Handles init, routing, lifecycle (internal)
      player.svelte.ts         <- coursePlayer singleton
      player-metrics.svelte.ts <- Reactive metrics
      slide-completion.svelte.ts <- useSlideCompletion() hook
      slide-context.svelte.ts  <- Slide identity context (internal)
      router.svelte.ts         <- sv-router setup (internal)
      types.ts                 <- defineCourse/Lesson/Slide, type definitions
    scorm/
      state.svelte.ts          <- scormState singleton
      persistent-store.svelte.ts <- Key-value + interactions + objectives + slide tracking
      score-state.svelte.ts    <- Score management
      completion-state.svelte.ts <- Completion management
      storage/                 <- Storage engines (internal)
    quiz/
      types.ts                     <- Question, TestDefinition, TestHandle interfaces
      define-multi-choice.svelte.ts <- defineMultiChoiceQuestion factory
      define-true-false.svelte.ts  <- defineTrueFalseQuestion factory
      define-test.svelte.ts        <- defineTest factory
      test-registry.svelte.ts      <- Global test registry + course score sync
  course/
    layouts/
      CourseFrame.svelte       <- Course-level layout (sidebar + header)
      LessonFrame.svelte       <- Lesson-level layout (title + prev/next nav)
    slides/                    <- Your slide components go here
  lib/
    components/
      app-sidebar.svelte       <- Course navigation sidebar (lock/check icons)
      ui/                      <- shadcn-svelte components (button, sidebar, etc.)
```

### Layouts

**CourseFrame** — wraps the entire course. Provides sidebar navigation, header, progress bar.

**LessonFrame** — wraps each lesson's slides. Shows lesson title, previous/next buttons.

Both accept a `children` snippet:

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<div class="my-layout">
  {@render children()}
</div>
```

---

## Dev vs LMS Mode

|                | Dev Mode                    | LMS Mode                             |
| -------------- | --------------------------- | ------------------------------------ |
| API            | localStorage                | SCORM API                            |
| Detection      | No SCORM API found          | `window.API` or `window.API_1484_11` |
| Storage prefix | `scorm-dev:{courseId}:`     | N/A                                  |
| Student info   | Empty strings               | From LMS                             |
| Check          | `scormState.mode === 'dev'` | `scormState.mode === 'lms'`          |

Dev mode activates automatically when no LMS is detected (e.g., running `vite dev`). All data persists in the browser's localStorage.
