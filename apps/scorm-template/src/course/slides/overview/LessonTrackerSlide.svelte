<script lang="ts">
  import { coursePlayer } from "$core/player/index.js";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import ScormStateCards from "./ScormStateCards.svelte";

  const MS_PER_SECOND = 1000;
  const SECONDS_PER_MINUTE = 60;

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / MS_PER_SECOND);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  const statusColors: Record<string, string> = {
    passed: "text-green-500",
    failed: "text-destructive",
    incomplete: "text-yellow-500",
    "not attempted": "text-muted-foreground",
  };
</script>

<article class="mx-auto max-w-[85ch] space-y-6 px-4">
  <header>
    <h2 class="text-2xl font-bold tracking-tight">Player State Dashboard</h2>
    <p class="text-sm text-muted-foreground">
      All reactive data available via <code
        class="rounded bg-muted px-1.5 py-0.5 text-xs">coursePlayer</code
      >
      and
      <code class="rounded bg-muted px-1.5 py-0.5 text-xs">scormState</code>
    </p>
  </header>

  <!-- Course Overview -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Course Overview</h3>
    <div class="mb-3 flex items-center justify-between text-sm">
      <span class="text-muted-foreground">Overall Progress</span>
      <span class="font-medium">{coursePlayer.course.progress}%</span>
    </div>
    <Progress value={coursePlayer.course.progress} class="mb-4 h-2" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <p class="text-xs text-muted-foreground">Current Slide</p>
        <p class="text-xl font-bold">
          {coursePlayer.course.slideNumber}<span
            class="text-sm font-normal text-muted-foreground"
            >/{coursePlayer.course.totalSlides}</span
          >
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Slides Completed</p>
        <p class="text-xl font-bold">{coursePlayer.course.slidesCompleted}</p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Current Lesson</p>
        <p class="text-xl font-bold">
          {coursePlayer.course.lessonNumber}<span
            class="text-sm font-normal text-muted-foreground"
            >/{coursePlayer.course.totalLessons}</span
          >
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Session Time</p>
        <p class="text-xl font-bold">
          {formatTime(coursePlayer.session.elapsedMs)}
        </p>
      </div>
    </div>
  </section>

  <!-- Lesson + Active Slide -->
  <div class="grid gap-6 md:grid-cols-2">
    <section class="rounded-lg border bg-card p-5">
      <h3 class="mb-4 text-lg font-semibold">Lesson</h3>
      <div class="mb-3 flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Lesson Progress</span>
        <span class="font-medium">{coursePlayer.lesson.progress}%</span>
      </div>
      <Progress value={coursePlayer.lesson.progress} class="mb-4 h-2" />
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted-foreground">ID</dt>
          <dd class="font-mono text-xs">{coursePlayer.lesson.id}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Title</dt>
          <dd class="font-medium">{coursePlayer.lesson.title || "—"}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Slide Position</dt>
          <dd>
            {coursePlayer.lesson.slideNumber} / {coursePlayer.lesson
              .totalSlides}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Slides Completed</dt>
          <dd>{coursePlayer.lesson.slidesCompleted}</dd>
        </div>
      </dl>
    </section>

    <section class="rounded-lg border bg-card p-5">
      <h3 class="mb-4 text-lg font-semibold">Active Slide</h3>
      {#if coursePlayer.activeSlide}
        {@const slide = coursePlayer.activeSlide}
        <div class="mb-4 flex items-center gap-2">
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {statusColors[
              slide.status
            ] ?? 'text-muted-foreground'}"
          >
            {slide.status}
          </span>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {slide.completionMode}
          </span>
        </div>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">ID</dt>
            <dd class="font-mono text-xs">{slide.id}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Title</dt>
            <dd class="font-medium">{slide.title || "—"}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Pathname</dt>
            <dd class="font-mono text-xs">{slide.pathname}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Index</dt>
            <dd>{slide.index} / {slide.total - 1}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Score</dt>
            <dd>{slide.score ?? "—"}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Time on Slide</dt>
            <dd>{formatTime(coursePlayer.slide.elapsedMs)}</dd>
          </div>
        </dl>
      {:else}
        <p class="text-sm text-muted-foreground">No active slide</p>
      {/if}
    </section>
  </div>

  <!-- Navigation State -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Navigation State</h3>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <p class="text-xs text-muted-foreground">Can Go Next</p>
        <p
          class="text-lg font-semibold"
          class:text-green-500={coursePlayer.canGoNext}
          class:text-destructive={!coursePlayer.canGoNext}
        >
          {coursePlayer.canGoNext ? "Yes" : "No"}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Can Go Previous</p>
        <p
          class="text-lg font-semibold"
          class:text-green-500={coursePlayer.canGoPrevious}
          class:text-destructive={!coursePlayer.canGoPrevious}
        >
          {coursePlayer.canGoPrevious ? "Yes" : "No"}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Is Navigating</p>
        <p class="text-lg font-semibold">
          {coursePlayer.isNavigating ? "Yes" : "No"}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Sequencing</p>
        <p class="text-lg font-semibold capitalize">
          {coursePlayer.activeSlide?.completionMode ?? "—"}
        </p>
      </div>
    </div>
  </section>

  <ScormStateCards />
</article>
