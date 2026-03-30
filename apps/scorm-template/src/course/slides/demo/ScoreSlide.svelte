<script lang="ts">
  import { scormState } from "$core/scorm/index.js";
  import { testRegistry } from "$core/quiz";
  import Progress from "$lib/components/ui/progress/progress.svelte";

  const PERCENTAGE = 100;

  let scorePercent = $derived(
    scormState.score.raw !== undefined && scormState.score.max
      ? Math.round(
          ((scormState.score.raw - (scormState.score.min ?? 0)) /
            (scormState.score.max - (scormState.score.min ?? 0))) *
            PERCENTAGE,
        )
      : 0,
  );

  let tests = $derived(testRegistry.contributingTests);
</script>

<article class="mx-auto max-w-[85ch] space-y-6 px-4">
  <header class="space-y-1">
    <h2 class="font-serif text-3xl font-bold tracking-tight text-foreground">
      Course Score
    </h2>
    <p class="text-muted-foreground">
      Your course score is calculated automatically from quiz results — it
      cannot be set manually.
    </p>
  </header>

  <!-- Current Score -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Current Score</h3>

    {#if scormState.score.raw === undefined}
      <p class="text-sm text-muted-foreground">
        No score has been recorded yet. Complete a quiz to see your score here.
      </p>
    {:else}
      <div class="mb-3 flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Score Progress</span>
        <span class="font-medium">{scorePercent}%</span>
      </div>
      <Progress value={scorePercent} class="mb-4 h-2" />

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p class="text-xs text-muted-foreground">Raw Score</p>
          <p class="text-xl font-bold">{scormState.score.raw}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Min</p>
          <p class="text-xl font-bold">{scormState.score.min ?? "—"}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Max</p>
          <p class="text-xl font-bold">{scormState.score.max ?? "—"}</p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Scaled</p>
          <p class="text-xl font-bold">
            {scormState.score.scaled ?? "—"}
          </p>
        </div>
      </div>
    {/if}
  </section>

  <!-- How Scoring Works -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">How Scoring Works</h3>
    <ol class="list-decimal space-y-3 pl-5 text-sm text-foreground/75">
      <li>
        Each quiz is defined with a set of questions and a
        <strong class="text-foreground">pass threshold</strong> (e.g. 50%).
      </li>
      <li>
        When you submit a quiz, your correct answers are tallied into a
        <strong class="text-foreground">test score percentage</strong>.
      </li>
      <li>
        The course score is the
        <strong class="text-foreground">average</strong> of all submitted test scores.
      </li>
      <li>
        That percentage maps to the SCORM score range:
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs"
          >raw = min + (% / 100) &times; (max &minus; min)</code
        >
      </li>
      <li>
        When <strong class="text-foreground">all</strong> tests are passed, the
        course completion is automatically set to
        <span class="font-medium text-green-500">passed</span>.
      </li>
    </ol>
  </section>

  <!-- Contributing Tests -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Contributing Tests</h3>

    {#if tests.length > 0}
      <div class="space-y-3">
        {#each tests as test (test.fullId)}
          <div
            class="flex items-center justify-between rounded-md border px-4 py-3 text-sm"
          >
            <div class="space-y-0.5">
              <p class="font-medium">{test.id}</p>
              <p class="text-xs text-muted-foreground">
                {test.passedCount} of {test.questions.length} correct
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-lg font-bold">{Math.round(test.score)}%</span>
              {#if test.isPassed}
                <span
                  class="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500"
                >
                  Passed
                </span>
              {:else if test.isSubmitted}
                <span
                  class="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                >
                  Failed
                </span>
              {:else}
                <span
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  Pending
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-4 flex items-center justify-between border-t pt-4 text-sm">
        <span class="text-muted-foreground">Course Score Average</span>
        <span class="text-lg font-bold">
          {Math.round(testRegistry.courseScorePercentage)}%
        </span>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">
        No tests have been submitted yet. Complete a quiz to see test results
        here.
      </p>
    {/if}
  </section>
</article>
