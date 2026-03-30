<script lang="ts">
  import { defineMultiChoiceQuestion, defineTest } from "$core/quiz";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";

  const PASS_THRESHOLD = 0.5;

  const q1 = defineMultiChoiceQuestion({
    id: "scorm-acronym",
    question: "What does SCORM stand for?",
    options: [
      { key: "A", label: "Shareable Content Object Reference Model" },
      { key: "B", label: "Standard Course Object Resource Manager" },
      { key: "C", label: "Synchronized Content Online Reference Module" },
      { key: "D", label: "Simple Course Object Runtime Model" },
    ],
    correctAnswer: "A",
    weight: 2,
  });

  const q2 = defineMultiChoiceQuestion({
    id: "scorm-version",
    question: "Which SCORM version introduced sequencing and navigation?",
    options: [
      { key: "A", label: "SCORM 1.0" },
      { key: "B", label: "SCORM 1.1" },
      { key: "C", label: "SCORM 1.2" },
      { key: "D", label: "SCORM 2004" },
    ],
    correctAnswer: "D",
  });

  const q3 = defineMultiChoiceQuestion({
    id: "scorm-purpose",
    question: "What is the primary purpose of SCORM?",
    options: [
      { key: "A", label: "To create video content for online courses" },
      {
        key: "B",
        label:
          "To ensure e-learning content interoperability across LMS platforms",
      },
      { key: "C", label: "To manage student enrollment in universities" },
      {
        key: "D",
        label: "To provide a programming language for web development",
      },
    ],
    correctAnswer: "B",
  });

  const questions = [q1, q2, q3];

  const test = defineTest({
    id: "knowledge-check",
    questions,
    passThreshold: PASS_THRESHOLD,
  });

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

<div class="mx-auto max-w-3xl space-y-8 p-6">
  <div class="space-y-2">
    <h1 class="font-serif text-3xl font-bold text-foreground">
      Knowledge Check
    </h1>
    {#if !test.hasIncorrect}
      <p class="text-sm font-medium text-green-600 dark:text-green-400">
        All questions answered correctly. Score: {Math.round(test.score)}%
      </p>
    {:else if test.phase === "submitted"}
      <p class="text-muted-foreground">
        Some questions need to be retried. Score: {Math.round(test.score)}%
      </p>
    {:else}
      <p class="text-muted-foreground">
        Answer all questions before submitting. You need 50% to pass.
      </p>
    {/if}
  </div>

  {#each questions as q, qi (q.id)}
    {@const result = test.questionResult(q)}
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
          {@const isCorrectAnswer =
            q.isPassed && option.key === q.correctAnswer}
          {@const isWrongSelection =
            test.phase === "submitted" && isSelected && result === "incorrect"}
          <button
            type="button"
            disabled={q.isPassed}
            onclick={() => (q.selectedAnswer = option.key)}
            class={optionClass(isSelected, isCorrectAnswer, isWrongSelection)}
          >
            <span
              class={badgeClass(
                isSelected && test.phase !== "submitted" && !q.isPassed,
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
  {/each}

  <div class="flex items-center justify-end gap-4 pt-2">
    {#if !test.hasIncorrect}
      <p class="text-sm font-medium text-green-600 dark:text-green-400">
        {test.passedCount} of {test.questions.length} correct — {Math.round(
          test.score,
        )}%
      </p>
    {:else if test.phase === "submitted"}
      <p class="text-sm text-muted-foreground">
        {test.passedCount} of {test.questions.length} correct — {Math.round(
          test.score,
        )}%
      </p>
      <Button size="lg" variant="outline" onclick={() => test.retry()}>
        Retry
      </Button>
    {:else}
      {#if test.pendingCount > 0}
        <p class="text-sm text-muted-foreground">
          {test.pendingCount} question{test.pendingCount === 1 ? "" : "s"} remaining
        </p>
      {/if}
      <Button
        size="lg"
        disabled={test.pendingCount > 0}
        onclick={() => test.submit()}
      >
        Submit Answers
      </Button>
    {/if}
  </div>
</div>
