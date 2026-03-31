<script lang="ts">
  import type { Question, QuestionResult, TestPhase } from "$core/quiz/types.js";
  import { cn } from "$lib/utils.js";

  interface MultiChoiceQuestion extends Question {
    readonly options: readonly { key: string; label: string }[];
    readonly correctAnswer: string;
  }

  let {
    question: q,
    index: qi,
    result,
    phase,
  }: {
    question: MultiChoiceQuestion;
    index: number;
    result: QuestionResult;
    phase: TestPhase;
  } = $props();

  function optionClass(
    isSelected: boolean,
    isCorrectAnswer: boolean,
    isWrongSelection: boolean,
  ): string {
    const base =
      "flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-all disabled:cursor-not-allowed";
    if (isCorrectAnswer)
      return cn(
        base,
        "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
      );
    if (isWrongSelection)
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

  function badgeClass(
    isSelected: boolean,
    isCorrectAnswer: boolean,
    isWrongSelection: boolean,
  ): string {
    const base =
      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold";
    if (isCorrectAnswer)
      return cn(base, "border-green-500 bg-green-500 text-white");
    if (isWrongSelection)
      return cn(base, "border-destructive bg-destructive text-white");
    if (isSelected)
      return cn(base, "border-primary bg-primary text-primary-foreground");
    return cn(base, "border-muted-foreground/30 text-muted-foreground");
  }
</script>

<div
  class={cn(
    "rounded-lg border bg-card p-6 shadow-sm transition-colors",
    result === "correct" && "border-green-500/50",
    result === "incorrect" && "border-destructive/50",
  )}
>
  <h2 class="mb-4 text-lg font-semibold text-foreground">
    <span class="text-primary">{qi + 1}.</span>
    {q.question}
  </h2>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {#each q.options as option (option.key)}
      {@const isSelected = q.selectedAnswer === option.key}
      {@const isCorrectAnswer = q.isPassed && option.key === q.correctAnswer}
      {@const isWrongSelection =
        phase === "submitted" && isSelected && result === "incorrect"}
      <button
        type="button"
        disabled={q.isPassed}
        onclick={() => (q.selectedAnswer = option.key)}
        class={optionClass(isSelected, isCorrectAnswer, isWrongSelection)}
      >
        <span
          class={badgeClass(
            isSelected && phase !== "submitted" && !q.isPassed,
            isCorrectAnswer,
            isWrongSelection,
          )}
        >
          {option.key}
        </span>
        <span class="pt-0.5">{option.label}</span>
      </button>
    {/each}
  </div>

  {#if result === "correct"}
    <p class="mt-4 text-sm font-medium text-green-600 dark:text-green-400">
      Correct!
    </p>
  {:else if result === "incorrect"}
    <p class="mt-4 text-sm font-medium text-destructive">
      Incorrect — try again.
    </p>
  {/if}
</div>
