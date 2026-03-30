<script lang="ts">
  import { useSlideCompletion } from "$core/player";
  import Plyr from "plyr";
  import "plyr/dist/plyr.css";
  import { onMount, type Snippet } from "svelte";

  const PERCENTAGE = 100;
  const COMPLETION_THRESHOLD = 95;

  const {
    videoEl,
    title,
    description,
    children,
  }: {
    videoEl: HTMLVideoElement;
    title?: string;
    description?: string;
    children: Snippet;
  } = $props();

  const slideProgress = useSlideCompletion();

  onMount(() => {
    function handlePlayedTimeUpdate() {
      const progress = (videoEl.currentTime / videoEl.duration) * PERCENTAGE;
      slideProgress.setScore(progress);
      if (progress >= COMPLETION_THRESHOLD) {
        slideProgress.markPassed();
      }
    }

    videoEl.addEventListener("timeupdate", handlePlayedTimeUpdate);

    const player = new Plyr(videoEl, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "fullscreen",
      ],
    });

    function handleLoadedMetadata() {
      const newScore = slideProgress.score || 0;
      if (newScore > 0) {
        const seekTime = (newScore / PERCENTAGE) * videoEl.duration;
        videoEl.currentTime = seekTime;
      }
    }

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      videoEl.removeEventListener("timeupdate", handlePlayedTimeUpdate);
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      player.destroy();
    };
  });
</script>

<div class="mx-auto aspect-video max-w-200 space-y-2 text-center">
  {@render children()}
  {#if title}
    <h2 class="font-serif text-2xl">
      {title}
    </h2>
  {/if}
  {#if description}
    <p class="text-sm text-muted-foreground">{description}</p>
  {/if}
</div>
