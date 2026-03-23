<script lang="ts">
	import type { Snippet } from "svelte";
	import { scormState } from "$lib/scorm/index.js";

	let { children }: { children: Snippet } = $props();
</script>

<div class="course-frame">
	<header class="course-header">
		<span class="student-name">{scormState.student.name || "Student"}</span>
		<progress value={scormState.score.raw ?? 0} max={scormState.score.max}
		></progress>
	</header>
	<main class="course-content">
		{@render children()}
	</main>
</div>

<style>
	.course-frame {
		display: grid;
		grid-template-rows: auto 1fr;
		min-height: 100vh;
	}
	.course-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		background: #fff;
	}
	.student-name {
		font-weight: 600;
	}
	progress {
		flex: 1;
		height: 0.5rem;
	}
	.course-content {
		padding: 1.5rem;
	}
</style>
