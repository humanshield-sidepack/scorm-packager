# scorm-template — Roadmap & Known Concerns

## Missing Features

### Core Player

- [ ] **True visited/completed tracking per slide** — currently uses cursor position; needs a `Set<string>` of visited pathnames so backwards navigation doesn't lose visited state
- [ ] **Slide locking** — prevent Next until a condition is met (e.g. content read, video watched, question answered)
- [ ] **`masteryScore` auto-enforcement** — automatically call `setPassed()` / `setFailed()` when a score is submitted against `course.masteryScore`
- [ ] **Branching / conditional navigation** — non-linear paths based on score, completion, or custom variables
- [ ] **Proper progress tracking** — slide-position-based progress bar (currently stubbed with score)

### Assessment Engine

- [ ] **Quiz component primitives** — multiple choice, true/false, fill-in-the-blank, matching, drag-and-drop
- [ ] **SCORM interactions recording** — write learner responses to `cmi.interactions.*`
- [ ] **Attempt tracking** — record number of attempts per quiz/question
- [ ] **Retry logic** — configurable retry count with score averaging or highest-score rules
- [ ] **Feedback display** — correct/incorrect response feedback per question and per quiz

### Media & Content

- [ ] **Video component with completion gate** — play-to-end required to unlock Next
- [ ] **Audio component with transcript** — accessible audio playback
- [ ] **Timed content reveal** — show elements after N seconds (Storyline-style timeline)
- [ ] **Image zoom / lightbox** — accessible zoom for diagrams and images

### Authoring DX

- [ ] **Variable system** — named reactive course-level variables shared across slides (like Storyline variables)
- [ ] **Trigger system** — declarative "when X, do Y" event bindings across slides and lessons
- [ ] **Master slide / shared layout library** — pre-built reusable content layouts
- [ ] **Slide transition animations** — enter/exit animations between slides
- [ ] **Component library** — accordion, tabs, hotspot, drag-and-drop, timeline built-ins

### SCORM & Standards

- [ ] **`imsmanifest.xml` generation** — packager to produce spec-compliant manifest
- [ ] **SCORM zip packaging** — bundle course for LMS upload
- [ ] **Multi-SCO support** — multiple Shareable Content Objects within one course
- [ ] **xAPI / Tin Can support** — send statements to an LRS as an alternative to SCORM
- [ ] **AICC support** — legacy CMI standard compatibility
- [ ] **Bookmarking** — save and restore exact slide + scroll position on resume

### Platform & Quality

- [ ] **Accessibility (a11y)** — ARIA roles, keyboard navigation, focus management, screen reader support
- [ ] **Theming / design system** — CSS custom properties for colors, typography, spacing
- [ ] **i18n / localization** — multi-language support for UI strings and course content
- [ ] **Course completion certificate** — printable/downloadable certificate component
- [ ] **Offline / service worker** — cache assets for unreliable network environments

---

## Design Concerns

- **Single-SCO assumption** — the architecture maps one Svelte app to one SCO. Multi-SCO courses (common in Storyline) would require a different packaging and manifest strategy.
- **Module-load-time routing** — `router.svelte.ts` builds routes at module load, making dynamic/conditional routes (branching) not possible without a rethink of how `_buildRoutes` is called.
- **`masteryScore` is defined but unused** — stored in `CourseDefinition` but nothing reads it to trigger pass/fail automatically. Authors must manually call `setPassed()` / `setFailed()`.
- **Layout components access singletons directly** — `CourseFrame` and `LessonFrame` import `scormState` and `coursePlayer` directly, which makes them harder to test in isolation or reuse outside the player context.
