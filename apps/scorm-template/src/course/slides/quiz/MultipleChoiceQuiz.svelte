<script lang="ts">
  import { defineMultiChoiceQuestion, defineTest } from "$core/quiz";
  import { Button } from "$lib/components/ui/button/index.js";
  import MultipleChoiceQuestionCard from "$lib/components/local/MultipleChoiceQuestionCard.svelte";

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
    <MultipleChoiceQuestionCard
      question={q}
      index={qi}
      result={test.questionResult(q)}
      phase={test.phase}
    />
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
