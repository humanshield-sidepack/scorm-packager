/** Bounded concurrency queue for async tasks (e.g. FFmpeg encoding). */
export class EncodingQueue {
	private running = 0;
	private readonly queue: Array<() => Promise<void>> = [];
	private pending = 0;

	constructor(
		private readonly maxJobs: number,
		private readonly onAllDone: () => void
	) {}

	enqueue(task: () => Promise<void>): void {
		this.pending++;
		const wrapped = async (): Promise<void> => {
			try {
				await task();
			} catch (error) {
				console.error('[video-plugin] encoding task failed:', error);
			} finally {
				this.running--;
				this.pending--;
				if (this.pending === 0) this.onAllDone();
				this.drain();
			}
		};
		this.queue.push(wrapped);
		this.drain();
	}

	isIdle(): boolean {
		return this.pending === 0;
	}

	private drain(): void {
		while (this.queue.length > 0 && this.running < this.maxJobs) {
			const task = this.queue.shift()!;
			this.running++;
			void task();
		}
	}
}
