<!-- 
  This is an internal component, unless you know what you're doing, you probably don't want to use or modify this component directly.
-->
<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Router } from "sv-router";
	import { coursePlayer } from "./player.svelte.js";
	import { scormState } from "$lib/scorm/index.js";
	import { course } from "../../course.js";

	onMount(async () => {
		scormState.initialize();
		scormState.score._setRange(course.minScore, course.maxScore);
		const isResume = scormState.session.entry === "resume";
		const targetPathname =
			isResume && scormState.location
				? (scormState.location as `/${string}`)
				: coursePlayer.firstPath;
		await coursePlayer.goto(targetPathname);
	});

	onDestroy(() => {
		scormState.terminate();
	});
</script>

<Router base="#" />
