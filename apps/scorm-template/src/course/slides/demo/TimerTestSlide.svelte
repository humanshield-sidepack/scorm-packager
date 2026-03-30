<script lang="ts">
  import { coursePlayer } from "$core/player/index.js";

  const MS_PER_SECOND = 1000;
  const SECONDS_PER_MINUTE = 60;
  const PAD_LENGTH = 2;
  const PAD_CHAR = "0";

  function formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / MS_PER_SECOND);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return `${String(minutes).padStart(PAD_LENGTH, PAD_CHAR)}:${String(seconds).padStart(PAD_LENGTH, PAD_CHAR)}`;
  }
</script>

<article>
  <h2>Timer Test</h2>
  <p>
    Both clocks should tick every second. If they update, reactive elapsed times
    are working.
  </p>

  <section>
    <h3>Time on this slide</h3>
    <p class="clock">{formatMs(coursePlayer.slide.elapsedMs)}</p>
  </section>

  <section>
    <h3>Session time</h3>
    <p class="clock">{formatMs(coursePlayer.session.elapsedMs)}</p>
  </section>
</article>

<style>
  .clock {
    font-size: 4rem;
    font-family: monospace;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  section + section {
    margin-top: 2rem;
  }
</style>
