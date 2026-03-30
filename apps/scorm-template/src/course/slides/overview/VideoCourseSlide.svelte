<script lang="ts">
  import SlideVideoComponent from "$course/components/SlideVideoComponent.svelte";

  let videoEl = $state<HTMLVideoElement>(null!);
</script>

<SlideVideoComponent
  {videoEl}
  title="AOS - Animate On Scroll Library Demo Video"
  description="This video demonstrates the capabilities of the Animate On Scroll (AOS) library, showcasing various animations triggered as elements come into view during scrolling."
>
  <p
    class="border-warning my-4 rounded-md border bg-card p-4 text-justify text-foreground/75"
  >
    The next button will not activate until the entire video is played. progress
    is saved across sessions so user closing the course at a certain video time,
    will resume it later, it is tied to the slide progress and persists data via
    the objectives API of SCORM.
  </p>
  <video:enhanced
    bind:this={videoEl}
    class="max-h-[calc(100vh-128px)] w-full rounded-lg border"
    src="../../../assets/videos/aos.mov"
  ></video:enhanced>
</SlideVideoComponent>
