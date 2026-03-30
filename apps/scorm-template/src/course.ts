import { defineCourse, defineLesson, defineSlide } from "$core/player/types.js";
import CourseFrame from "./course/layouts/CourseFrame.svelte";
import LessonFrame from "./course/layouts/LessonFrame.svelte";

export const course = defineCourse({
  id: "scorm-template-course",
  title: "SCORM Template Course",
  description: "A simple SCORM course template.",
  masteryScore: 80,
  minScore: 0,
  maxScore: 100,
  layout: CourseFrame,
  lessons: [
    defineLesson({
      id: "overview",
      title: "Overview",
      layout: LessonFrame,
      slides: [
        defineSlide({
          id: "welcome",
          title: "Welcome",
          completionMode: "manual",
          component: () => import("./course/slides/overview/WelcomeSlide.svx"),
        }),
        defineSlide({
          id: "course-progress",
          title: "Course Progress",
          component: () =>
            import("./course/slides/overview/CourseProgressSlide.svx"),
        }),
        defineSlide({
          id: "lesson-tracker",
          title: "Lesson Tracker",
          component: () =>
            import("./course/slides/overview/LessonTrackerSlide.svelte"),
        }),
        defineSlide({
          id: "video-slide-example",
          title: "Video Slide Example",
          completionMode: "manual",
          component: () =>
            import("./course/slides/overview/VideoCourseSlide.svelte"),
        }),
      ],
    }),
    defineLesson({
      id: "quiz",
      title: "Quiz",
      layout: LessonFrame,
      slides: [
        defineSlide({
          id: "multiple-choice",
          completionMode: "manual",
          component: () =>
            import("./course/slides/quiz/MultipleChoiceQuiz.svelte"),
        }),
        defineSlide({
          id: "true-false",
          completionMode: "manual",
          component: () => import("./course/slides/quiz/TrueFalseQuiz.svelte"),
        }),
      ],
    }),
    defineLesson({
      id: "demo",
      title: "SCORM Demo",
      layout: LessonFrame,
      slides: [
        defineSlide({
          id: "score",
          component: () => import("./course/slides/demo/ScoreSlide.svelte"),
        }),
        defineSlide({
          id: "completion",
          component: () =>
            import("./course/slides/demo/CompletionSlide.svelte"),
        }),
        defineSlide({
          id: "summary",
          component: () => import("./course/slides/demo/SummarySlide.svelte"),
        }),
        defineSlide({
          id: "timer-test",
          title: "Timer Test",
          component: () => import("./course/slides/demo/TimerTestSlide.svelte"),
        }),
      ],
    }),
  ],
});
