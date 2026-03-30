<script lang="ts">
  import { scormState } from "$core/scorm/index.js";
  import { coursePlayer } from "$core/player/index.js";
  import { course } from "../../../course.js";
  import Progress from "$lib/components/ui/progress/progress.svelte";

  const statusColors = new Map([
    ["passed", "text-green-500"],
    ["failed", "text-destructive"],
    ["incomplete", "text-yellow-500"],
    ["unknown", "text-muted-foreground"],
  ]);

  const statusBadge = new Map([
    ["completed", "border-green-500/30 bg-green-500/10 text-green-500"],
    ["incomplete", "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"],
    ["passed", "border-green-500/30 bg-green-500/10 text-green-500"],
    ["failed", "border-destructive/30 bg-destructive/10 text-destructive"],
    ["unknown", "border-border bg-muted text-muted-foreground"],
  ]);

  const BADGE_FALLBACK = "border-border bg-muted text-muted-foreground";

  function badge(key: string): string {
    return statusBadge.get(key) ?? BADGE_FALLBACK;
  }

  let progress = $derived(coursePlayer.course.progress);
  let completionStatus = $derived(scormState.completion.status);
  let successStatus = $derived(scormState.completion.success);
</script>

<article class="mx-auto max-w-[85ch] space-y-6 px-4">
  <header class="space-y-1">
    <h2 class="font-serif text-3xl font-bold tracking-tight text-foreground">
      Completion &amp; Pass/Fail
    </h2>
    <p class="text-muted-foreground">
      Course completion and pass/fail status are managed automatically — you
      don't need to set them manually.
    </p>
  </header>

  <!-- Current Status -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Current Status</h3>

    <div class="mb-3 flex items-center justify-between text-sm">
      <span class="text-muted-foreground">Slide Completion</span>
      <span class="font-medium">{progress}%</span>
    </div>
    <Progress value={progress} class="mb-4 h-2" />

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <p class="text-xs text-muted-foreground">Completion</p>
        <span
          class="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {badge(
            completionStatus,
          )}"
        >
          {completionStatus}
        </span>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Success</p>
        <span
          class="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {badge(
            successStatus,
          )}"
        >
          {successStatus}
        </span>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Slides Completed</p>
        <p class="text-xl font-bold">
          {coursePlayer.course.slidesCompleted}<span
            class="text-sm font-normal text-muted-foreground"
            >/{coursePlayer.course.totalSlides}</span
          >
        </p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Mastery Score</p>
        <p class="text-xl font-bold">
          {course.masteryScore ?? "—"}<span
            class="text-sm font-normal text-muted-foreground"
            >{course.masteryScore ? "%" : ""}</span
          >
        </p>
      </div>
    </div>
  </section>

  <!-- How Completion Works -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">How Completion Works</h3>
    <p class="mb-3 text-sm text-foreground/75">
      Each slide has a <strong class="text-foreground">completion mode</strong>
      that determines when it is marked as done:
    </p>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-md border px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-foreground">
          Auto
          <code class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">"auto"</code
          >
        </p>
        <p class="text-sm text-muted-foreground">
          The slide is marked complete as soon as the learner visits it. No
          action required.
        </p>
      </div>
      <div class="rounded-md border px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-foreground">
          Manual
          <code class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs"
            >"manual"</code
          >
        </p>
        <p class="text-sm text-muted-foreground">
          The slide requires an explicit action — e.g. finishing a video,
          passing a quiz, or clicking a button.
        </p>
      </div>
    </div>
    <p class="mt-3 text-sm text-foreground/75">
      The course tracks how many slides have been completed. The SCORM
      <strong class="text-foreground">completion status</strong> is set to
      <code class="rounded bg-muted px-1.5 py-0.5 text-xs">"completed"</code>
      when all slides are done.
    </p>
  </section>

  <!-- How Pass/Fail Works -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">How Pass/Fail Works</h3>
    <ol class="list-decimal space-y-3 pl-5 text-sm text-foreground/75">
      <li>
        Quizzes are defined with a
        <strong class="text-foreground">pass threshold</strong> (e.g. 50%). When submitted,
        each quiz records a score percentage.
      </li>
      <li>
        The <strong class="text-foreground">test registry</strong> averages all
        quiz scores into an overall
        <strong class="text-foreground">course score</strong>, which is synced
        to SCORM automatically.
      </li>
      <li>
        When <strong class="text-foreground">all tests pass</strong>, the
        success status is automatically set to
        <span class={statusColors.get("passed")}>passed</span>.
      </li>
      {#if course.masteryScore}
        <li>
          This course has a
          <strong class="text-foreground"
            >mastery score of {course.masteryScore}%</strong
          >. The LMS may also evaluate pass/fail based on this threshold
          independently.
        </li>
      {/if}
    </ol>
  </section>

  <!-- Slide Breakdown -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Slide Status Breakdown</h3>
    <div class="space-y-2">
      {#each coursePlayer.slides as slide (slide.pathname)}
        {@const status = coursePlayer.getSlideStatus(slide)}
        <div
          class="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm"
        >
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-muted-foreground">
              {slide.index + 1}
            </span>
            <span class="font-medium">{slide.title || slide.id}</span>
            <code
              class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {slide.completionMode}
            </code>
          </div>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {badge(
              status,
            )}"
          >
            {status}
          </span>
        </div>
      {/each}
    </div>
  </section>
</article>
