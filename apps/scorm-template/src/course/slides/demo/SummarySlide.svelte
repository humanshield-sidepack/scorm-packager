<script lang="ts">
  import { testRegistry } from "$core/quiz";
</script>

<article class="mx-auto max-w-[85ch] space-y-6 px-4">
  <header class="space-y-1">
    <h2 class="font-serif text-3xl font-bold tracking-tight text-foreground">
      Tests &amp; Questions
    </h2>
    <p class="text-muted-foreground">
      How quizzes are built, scored, and contribute to the overall course score.
    </p>
  </header>

  <!-- Question Types -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Question Types</h3>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-md border px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-foreground">
          Multiple Choice
          <code class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs"
            >defineMultiChoiceQuestion()</code
          >
        </p>
        <p class="text-sm text-muted-foreground">
          A question with a list of options and a single correct answer. Each
          option has a key and label. Supports a
          <code class="rounded bg-muted px-1.5 py-0.5 text-xs">weight</code>
          to influence how much it counts toward the test score.
        </p>
      </div>
      <div class="rounded-md border px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-foreground">
          True / False
          <code class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs"
            >defineTrueFalseQuestion()</code
          >
        </p>
        <p class="text-sm text-muted-foreground">
          A simplified question with only true or false as possible answers.
          Uses the same scoring mechanics as multiple choice with a default
          weight of 1.
        </p>
      </div>
    </div>
  </section>

  <!-- Building a Test -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Building a Test</h3>
    <ol class="list-decimal space-y-3 pl-5 text-sm text-foreground/75">
      <li>
        Define your questions using
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs"
          >defineMultiChoiceQuestion()</code
        >
        or
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs"
          >defineTrueFalseQuestion()</code
        >. Each question needs an
        <strong class="text-foreground">id</strong>,
        <strong class="text-foreground">question text</strong>, and a
        <strong class="text-foreground">correct answer</strong>.
      </li>
      <li>
        Pass your questions into
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">defineTest()</code>
        along with a
        <strong class="text-foreground">pass threshold</strong> (0 to 1, e.g. 0.5
        for 50%). Defaults to 100% if not specified.
      </li>
      <li>
        The test returns a <strong class="text-foreground">TestHandle</strong>
        with reactive properties like
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">score</code>,
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">isPassed</code>,
        and methods like
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">submit()</code>
        and
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">retry()</code>.
      </li>
      <li>
        The slide's <strong class="text-foreground">completion mode</strong>
        should be set to
        <code class="rounded bg-muted px-1.5 py-0.5 text-xs">"manual"</code>
        so it only completes when the test is passed.
      </li>
    </ol>
  </section>

  <!-- Scoring -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">How Scoring Works</h3>
    <div class="space-y-4">
      <div>
        <h4 class="mb-1 text-sm font-semibold text-foreground">
          1. Question Weights
        </h4>
        <p class="text-sm text-foreground/75">
          Each question has a
          <strong class="text-foreground">weight</strong> (default 1). The test
          score is calculated as:
          <code class="rounded bg-muted px-1.5 py-0.5 text-xs"
            >score = (earned weight / total weight) &times; 100</code
          >. A question with weight 2 counts twice as much as weight 1.
        </p>
      </div>
      <div>
        <h4 class="mb-1 text-sm font-semibold text-foreground">
          2. Test Pass Threshold
        </h4>
        <p class="text-sm text-foreground/75">
          A test is passed when the score percentage meets or exceeds the
          threshold. For example, a threshold of
          <code class="rounded bg-muted px-1.5 py-0.5 text-xs">0.5</code>
          means 50% or higher is a pass.
        </p>
      </div>
      <div>
        <h4 class="mb-1 text-sm font-semibold text-foreground">
          3. Course Score Aggregation
        </h4>
        <p class="text-sm text-foreground/75">
          The <strong class="text-foreground">test registry</strong> collects
          all submitted tests and computes the course score as the
          <strong class="text-foreground">average</strong> of all test score percentages.
          This is synced to the SCORM raw score automatically.
        </p>
      </div>
      <div>
        <h4 class="mb-1 text-sm font-semibold text-foreground">
          4. Automatic Pass/Fail
        </h4>
        <p class="text-sm text-foreground/75">
          When all registered tests are passed, the course success status is
          automatically set to
          <span class="font-medium text-green-500">passed</span>. No manual
          intervention needed.
        </p>
      </div>
    </div>
  </section>

  <!-- Interaction Persistence -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Answer Persistence</h3>
    <p class="text-sm text-foreground/75">
      Every answer submission is recorded as a
      <strong class="text-foreground">SCORM interaction</strong> with the learner's
      response, the correct response, and the result. This means:
    </p>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/75">
      <li>
        Previously correct answers are
        <strong class="text-foreground">restored</strong> when the learner returns
        to a quiz — no need to re-answer.
      </li>
      <li>
        Duplicate submissions of the same answer are
        <strong class="text-foreground">skipped</strong> to avoid inflating the interaction
        history.
      </li>
      <li>
        Once a question is resolved (marked correct), further submissions for
        that question are ignored.
      </li>
    </ul>
  </section>

  <!-- Live Registry -->
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Registered Tests</h3>
    {#if testRegistry.contributingTests.length > 0}
      <div class="space-y-2">
        {#each testRegistry.contributingTests as test (test.fullId)}
          <div
            class="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm"
          >
            <div class="space-y-0.5">
              <p class="font-medium">{test.id}</p>
              <p class="text-xs text-muted-foreground">
                {test.passedCount}/{test.questions.length} correct &middot;
                {test.questions.length} questions
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
        <span class="text-lg font-bold"
          >{Math.round(testRegistry.courseScorePercentage)}%</span
        >
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">
        No tests have been submitted yet. Complete a quiz to see results here.
      </p>
    {/if}
  </section>
</article>
