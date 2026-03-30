<!-- 
  This is an internal component, unless you know what you're doing, you probably don't want to use or modify this component directly.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { Router } from "sv-router";
  import { coursePlayer } from "./player.svelte.js";
  import { scormState } from "$core/scorm/index.js";
  import { course } from "../../course.js";
  import LoadingScreen from "./LoadingScreen.svelte";

  const LoadingComponent = course.loadingComponent ?? LoadingScreen;
  const isLoading = $derived(
    !scormState.isInitialized || coursePlayer.isNavigating,
  );

  onMount(() => {
    const ok = scormState.initialize({
      courseId: course.id,
      minScore: course.minScore,
      maxScore: course.maxScore,
      storageMode: course.storageMode ?? "standard",
    });
    if (!ok) console.error("[CourseShell] SCORM initialization failed");
    coursePlayer._initVisitTracking();
    coursePlayer._startTicking();
    const isNewAttempt =
      scormState.session.entry === "ab-initio" ||
      scormState.session.entry === "ab_initio";
    const savedLocation = scormState.location as `/${string}`;
    const isValidPath = coursePlayer.slides.some(
      (s) => s.pathname === savedLocation,
    );
    const targetPathname =
      !isNewAttempt && savedLocation && isValidPath
        ? savedLocation
        : coursePlayer.firstPath;

    coursePlayer.goto(targetPathname);
    return () => {
      coursePlayer._stopTicking();
      scormState.terminate();
    };
  });
</script>

<!-- The duplicate termination is intentional, we want to make sure we commit the SCORM data before the page unloads -->
<svelte:window
  onbeforeunload={() => scormState.terminate()}
  onpagehide={() => scormState.terminate()}
/>

{#if isLoading}
  <LoadingComponent />
{/if}
<Router base="#" />
