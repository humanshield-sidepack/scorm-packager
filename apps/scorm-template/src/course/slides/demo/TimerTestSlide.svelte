<script lang="ts">
  import { coursePlayer } from "$core/player/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";

  const MS_PER_SECOND = 1000;
  const SECONDS_PER_MINUTE = 60;
  const PAD_LENGTH = 2;
  const PAD_CHAR = "0";

  function formatMs(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return `${String(minutes).padStart(PAD_LENGTH, PAD_CHAR)}:${String(seconds).padStart(PAD_LENGTH, PAD_CHAR)}`;
  }
</script>

<div class="mx-auto max-w-xl space-y-8 p-8">
  <div class="space-y-2">
    <h2 class="font-serif text-3xl font-bold text-foreground">Timer Test</h2>
    <p class="text-sm text-muted-foreground">
      Both clocks should tick every second. If they update, reactive elapsed
      times are working.
    </p>
  </div>

  <Separator />

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
    <div class="rounded-lg border bg-card p-6 shadow-sm">
      <h3 class="text-sm font-medium text-muted-foreground">Time on slide</h3>
      <p
        class="mt-2 font-mono text-5xl font-bold tracking-wider text-foreground"
      >
        {formatMs(coursePlayer.slide.elapsedMs || 0)}
      </p>
    </div>

    <div class="rounded-lg border bg-card p-6 shadow-sm">
      <h3 class="text-sm font-medium text-muted-foreground">Session time</h3>
      <p
        class="mt-2 font-mono text-5xl font-bold tracking-wider text-foreground"
      >
        {formatMs(coursePlayer.session.elapsedMs || 0)}
      </p>
    </div>
  </div>
</div>
