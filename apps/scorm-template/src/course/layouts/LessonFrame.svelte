<script lang="ts">
  import type { Snippet } from "svelte";
  import { coursePlayer } from "$core/player/player.svelte.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import { scrollProgress } from "$lib/attachments/scroll-progress.svelte.js";

  let { children }: { children: Snippet } = $props();

  const trackScroll = scrollProgress();
</script>

<div class="fullscreenMinusHeader flex flex-col gap-4">
  <div class="flex-1 overflow-y-scroll" {@attach trackScroll}>
    {@render children()}
  </div>
  <!-- 
    With the help of the course player you can handle and manage navigation from outside the slides
  -->
  <footer class="flex justify-between border-t px-4 pt-4">
    <Button
      size="lg"
      disabled={!coursePlayer.canGoPrevious}
      onclick={() => coursePlayer.goPrevious()}
      class="px-6"
    >
      Previous Slide
    </Button>
    <Button
      size="lg"
      disabled={!coursePlayer.activeSlide?.isPassed ||
        coursePlayer.activeSlide?.isFailed}
      onclick={() => coursePlayer.goNext()}
      class="px-6">Next Slide</Button
    >
  </footer>
</div>

<style>
  .fullscreenMinusHeader {
    height: calc(100vh - 96px);
  }
</style>
