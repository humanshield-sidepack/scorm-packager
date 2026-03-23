<script lang="ts">
  import type { Snippet } from 'svelte'
  import { coursePlayer } from '$lib/player/player.svelte.js'

  let { children }: { children: Snippet } = $props()
</script>

<div class="lesson-frame">
  <header class="lesson-header">
    <h2>{coursePlayer.activeSlide?.lessonTitle}</h2>
  </header>
  <div class="lesson-content">
    {@render children()}
  </div>
  <nav class="lesson-nav">
    <button disabled={coursePlayer.isFirst} onclick={() => coursePlayer.goPrevious()}>Previous</button>
    <button disabled={coursePlayer.isLast} onclick={() => coursePlayer.goNext()}>Next</button>
  </nav>
</div>

<style>
  .lesson-frame {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
  }
  .lesson-header {
    padding: 1rem 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .lesson-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  .lesson-content {
    padding: 1rem 0;
  }
  .lesson-nav {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 0;
    border-top: 1px solid #e2e8f0;
  }
</style>
