<script lang="ts">
  import { scormState } from "$core/scorm/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
</script>

<Separator />

<!-- SCORM Connection -->
<section class="rounded-lg border bg-card p-5">
  <h3 class="mb-4 text-lg font-semibold">SCORM Connection</h3>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
    <div>
      <p class="text-xs text-muted-foreground">Mode</p>
      <p class="font-mono text-sm font-medium">{scormState.mode}</p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">Version</p>
      <p class="font-mono text-sm font-medium">
        {scormState.version ?? "—"}
      </p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">Connected</p>
      <p
        class="text-sm font-medium"
        class:text-green-500={scormState.isConnected}
        class:text-destructive={!scormState.isConnected}
      >
        {scormState.isConnected ? "Yes" : "No"}
      </p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">Initialized</p>
      <p
        class="text-sm font-medium"
        class:text-green-500={scormState.isInitialized}
        class:text-destructive={!scormState.isInitialized}
      >
        {scormState.isInitialized ? "Yes" : "No"}
      </p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">Session Mode</p>
      <p class="font-mono text-sm font-medium">
        {scormState.session.mode}
      </p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">Credit</p>
      <p class="font-mono text-sm font-medium">
        {scormState.session.credit}
      </p>
    </div>
  </div>
</section>

<!-- SCORM Completion & Score -->
<div class="grid gap-6 md:grid-cols-2">
  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Completion</h3>
    <dl class="space-y-3 text-sm">
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Status</dt>
        <dd class="font-medium capitalize">
          {scormState.completion.status}
        </dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Success</dt>
        <dd class="font-medium capitalize">
          {scormState.completion.success}
        </dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Entry</dt>
        <dd class="font-mono text-xs">{scormState.session.entry}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Location</dt>
        <dd class="font-mono text-xs">{scormState.location || "—"}</dd>
      </div>
    </dl>
  </section>

  <section class="rounded-lg border bg-card p-5">
    <h3 class="mb-4 text-lg font-semibold">Score</h3>
    <dl class="space-y-3 text-sm">
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Raw</dt>
        <dd class="font-medium">{scormState.score.raw ?? "—"}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Min</dt>
        <dd>{scormState.score.min ?? "—"}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Max</dt>
        <dd>{scormState.score.max ?? "—"}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted-foreground">Scaled</dt>
        <dd>{scormState.score.scaled ?? "—"}</dd>
      </div>
    </dl>
  </section>
</div>

<!-- Student Info -->
<section class="rounded-lg border bg-card p-5">
  <h3 class="mb-4 text-lg font-semibold">Student</h3>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <p class="text-xs text-muted-foreground">Name</p>
      <p class="text-sm font-medium">{scormState.student.name || "—"}</p>
    </div>
    <div>
      <p class="text-xs text-muted-foreground">ID</p>
      <p class="font-mono text-xs">{scormState.student.id || "—"}</p>
    </div>
  </div>
</section>
