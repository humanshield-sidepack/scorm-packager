<script lang="ts">
  import { coursePlayer } from "$core/player/index.js";
</script>

<article>
  <h1>Course Map</h1>
  <ol>
    {#each coursePlayer.slides as slide (slide.id)}
      <li class:active={slide.id === coursePlayer.activeSlide?.id}>
        <button onclick={() => coursePlayer.goto(slide.pathname)}>
          {slide.lessonTitle} — {slide.id}
        </button>
      </li>
    {/each}
  </ol>
</article>
