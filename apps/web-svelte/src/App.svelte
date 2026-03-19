<script lang="ts">
	const MS_PER_MINUTE = 60_000;
	const MS_PER_SECOND = 1000;
	const CENTISECONDS = 10;
	const TICK_MS = 5;

	let elapsed = $state(0);
	let running = $state(false);
	let intervalId: ReturnType<typeof setInterval> | undefined;

	const minutes = $derived(Math.floor(elapsed / MS_PER_MINUTE));
	const seconds = $derived(
		Math.floor((elapsed % MS_PER_MINUTE) / MS_PER_SECOND),
	);
	const millis = $derived(Math.floor((elapsed % MS_PER_SECOND) / CENTISECONDS));

	function start() {
		if (running) return;
		running = true;
		const startTime = Date.now() - elapsed;
		intervalId = setInterval(() => {
			elapsed = Date.now() - startTime;
		}, TICK_MS);
	}

	function stop() {
		if (!running) return;
		running = false;
		if (intervalId !== undefined) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
	}

	function reset() {
		stop();
		elapsed = 0;
	}

	function pad(n: number, digits = 2) {
		return String(n).padStart(digits, "0");
	}
</script>

<main>
	<div class="display">
		{pad(minutes)}:{pad(seconds)}<span class="millis">.{pad(millis)}</span>
	</div>

	<div class="controls">
		{#if !running}
			<button onclick={start}>Start</button>
		{:else}
			<button onclick={stop}>Stop</button>
		{/if}
		<button onclick={reset} disabled={elapsed === 0 && !running}>Reset</button>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-family: monospace;
		background: #111;
		color: #eee;
	}

	.display {
		font-size: 5rem;
		font-weight: bold;
		letter-spacing: 0.05em;
	}

	.millis {
		font-size: 3rem;
		color: #aaa;
	}

	.controls {
		margin-top: 2rem;
		display: flex;
		gap: 1rem;
	}

	button {
		padding: 0.6rem 1.8rem;
		font-size: 1.1rem;
		font-family: monospace;
		border: 2px solid #eee;
		background: transparent;
		color: #eee;
		cursor: pointer;
		border-radius: 4px;
		transition:
			background 0.15s,
			color 0.15s;
	}

	button:hover:not(:disabled) {
		background: #eee;
		color: #111;
	}

	button:disabled {
		opacity: 0.3;
		cursor: default;
	}
</style>
