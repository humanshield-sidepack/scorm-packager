<script lang="ts">
	import { scormState } from "$lib/scorm/index.js";

	let raw = $derived(scormState.score.raw ?? 0);
</script>

<article>
	<h1>Score</h1>
	<p>Current raw score: {scormState.score.raw ?? "not set"}</p>
	<label>
		Set score (0–{scormState.score.max})
		<input type="range" min={0} max={scormState.score.max} bind:value={raw} />
		<span>{raw}</span>
	</label>
	<button onclick={() => (scormState.score.raw = raw)}>Submit score</button>
</article>
