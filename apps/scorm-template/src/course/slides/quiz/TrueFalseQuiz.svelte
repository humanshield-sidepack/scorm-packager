<script lang="ts">
  import { defineTrueFalseQuestion, defineTest } from "$core/quiz";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";

  const q1 = defineTrueFalseQuestion({
    id: "suspend-data-limits",
    question:
      "SCORM 2004 allows up to 64,000 characters in suspend_data, while SCORM 1.2 only allows 4,096.",
    correctAnswer: "true",
  });

  const test = defineTest({
    id: "true-false-check",
    questions: [q1],
  });

  function optionClass(
    isSelected: boolean,
    isCorrect: boolean,
    isWrong: boolean,
  ): string {
    const base =
      "rounded-md border px-6 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed";
    if (isCorrect)
      return cn(
        base,
        "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
      );
    if (isWrong)
      return cn(base, "border-destructive bg-destructive/10 text-destructive");
    if (isSelected)
      return cn(
        base,
        "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30",
      );
    return cn(
      base,
      "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50",
    );
  }
</script>

<div class="mx-auto max-w-3xl space-y-8 p-6">
  <div class="space-y-2">
    <h1 class="font-serif text-3xl font-bold text-foreground">True or False</h1>
    {#if !test.hasIncorrect}
      <p class="text-sm font-medium text-green-600 dark:text-green-400">
        All questions answered correctly.
      </p>
    {:else if test.phase === "submitted"}
      <p class="text-muted-foreground">Some questions need to be retried.</p>
    {:else}
      <p class="text-muted-foreground">Select your answer and submit.</p>
    {/if}
  </div>

  {#each test.questions as q (q.id)}
    {@const isCorrect = q.isPassed}
    {@const isWrong =
      test.phase === "submitted" &&
      !q.isPassed &&
      q.selectedAnswer !== undefined}
    <div
      class={cn(
        "rounded-lg border bg-card p-6 shadow-sm transition-colors",
        isCorrect && "border-green-500/50",
        isWrong && "border-destructive/50",
      )}
    >
      <h2 class="mb-4 text-lg font-semibold text-foreground">
        {q.question}
      </h2>

      <div class="flex gap-3">
        {#each ["true", "false"] as value (value)}
          {@const isSelected = q.selectedAnswer === value}
          {@const isCorrectChoice = isSelected && isCorrect}
          {@const isWrongChoice = isSelected && isWrong}
          <button
            type="button"
            disabled={q.isPassed}
            onclick={() => (q.selectedAnswer = value)}
            class={optionClass(isSelected, isCorrectChoice, isWrongChoice)}
          >
            {value === "true" ? "True" : "False"}
          </button>
        {/each}
      </div>

      {#if isCorrect}
        <p class="mt-4 text-sm font-medium text-green-600 dark:text-green-400">
          Correct!
        </p>
      {:else if isWrong}
        <p class="mt-4 text-sm font-medium text-destructive">
          Incorrect — try again.
        </p>
      {/if}
    </div>
  {/each}

  <div class="flex items-center justify-end gap-4 pt-2">
    {#if !test.hasIncorrect}
      <p class="text-sm font-medium text-green-600 dark:text-green-400">
        Correct — {Math.round(test.score)}%
      </p>
    {:else if test.phase === "submitted"}
      <Button size="lg" variant="outline" onclick={() => test.retry()}>
        Retry
      </Button>
    {:else}
      <Button
        size="lg"
        disabled={test.pendingCount > 0}
        onclick={() => test.submit()}
      >
        Submit
      </Button>
    {/if}
  </div>
</div>
