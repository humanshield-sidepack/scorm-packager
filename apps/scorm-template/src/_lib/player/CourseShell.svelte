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
		const ok = scormState.initialize(course.minScore, course.maxScore);
		if (!ok) console.error('[CourseShell] SCORM initialization failed');
		const isResume = scormState.session.entry === "resume";
		const savedLocation = scormState.location as `/${string}`;
		const isValidPath = coursePlayer.slides.some((s) => s.pathname === savedLocation);
		const targetPathname =
			isResume && savedLocation && isValidPath ? savedLocation : coursePlayer.firstPath;
		await coursePlayer.goto(targetPathname);
	});

	onDestroy(() => {
		scormState.terminate();
	});
</script>

<Router base="#" />
