import { describe, it, expect, vi } from 'vitest';
import { EncodingQueue } from './encoding-queue';

function makeQueue(maxJobs: number) {
	const onAllDone = vi.fn();
	const onError = vi.fn();
	const queue = new EncodingQueue(maxJobs, onAllDone, onError);
	return { queue, onAllDone, onError };
}

describe('EncodingQueue - isIdle', () => {
	it('is idle when newly created', () => {
		const { queue } = makeQueue(2);
		expect(queue.isIdle()).toBe(true);
	});

	it('is not idle while a task is pending', async () => {
		const { queue } = makeQueue(1);
		let resolve!: () => void;
		const task = new Promise<void>((r) => {
			resolve = r;
		});
		queue.enqueue(() => task);
		expect(queue.isIdle()).toBe(false);
		resolve();
		await task;
	});

	it('returns to idle after all tasks complete', async () => {
		const { queue } = makeQueue(1);
		let resolve!: () => void;
		const task = new Promise<void>((r) => {
			resolve = r;
		});
		queue.enqueue(() => task);
		resolve();
		await task;
		await Promise.resolve();
		expect(queue.isIdle()).toBe(true);
	});
});

describe('EncodingQueue - enqueue / execution', () => {
	it('runs a single task immediately', async () => {
		const { queue } = makeQueue(2);
		const ran = vi.fn(() => Promise.resolve());
		queue.enqueue(ran);
		await Promise.resolve();
		expect(ran).toHaveBeenCalledOnce();
	});

	it('calls onAllDone when the only task completes', async () => {
		const { queue, onAllDone } = makeQueue(1);
		queue.enqueue(() => Promise.resolve());
		await new Promise((r) => setTimeout(r, 0));
		expect(onAllDone).toHaveBeenCalledOnce();
	});

	it('calls onAllDone once after multiple tasks all complete', async () => {
		const { queue, onAllDone } = makeQueue(2);
		queue.enqueue(() => Promise.resolve());
		queue.enqueue(() => Promise.resolve());
		await new Promise((r) => setTimeout(r, 0));
		expect(onAllDone).toHaveBeenCalledOnce();
	});

	it('drains queued tasks after a running slot frees', async () => {
		const { queue, onAllDone } = makeQueue(1);
		const order: number[] = [];
		queue.enqueue(async () => {
			order.push(1);
		});
		queue.enqueue(async () => {
			order.push(2);
		});
		await new Promise((r) => setTimeout(r, 0));
		expect(order).toEqual([1, 2]);
		expect(onAllDone).toHaveBeenCalledOnce();
	});
});

describe('EncodingQueue - concurrency cap', () => {
	it('runs at most maxJobs tasks simultaneously', async () => {
		const { queue } = makeQueue(2);
		let concurrentPeak = 0;
		let currentlyRunning = 0;
		const resolvers: Array<() => void> = [];

		for (let index = 0; index < 4; index++) {
			queue.enqueue(async () => {
				currentlyRunning++;
				concurrentPeak = Math.max(concurrentPeak, currentlyRunning);
				await new Promise<void>((r) => resolvers.push(r));
				currentlyRunning--;
			});
		}

		await Promise.resolve();
		expect(concurrentPeak).toBe(2);
		for (const r of resolvers) r();
	});
});

describe('EncodingQueue - error handling', () => {
	it('calls onError when a task rejects', async () => {
		const { queue, onError } = makeQueue(1);
		const boom = new Error('boom');
		queue.enqueue(() => Promise.reject(boom));
		await new Promise((r) => setTimeout(r, 0));
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(expect.any(String), boom);
	});

	it('continues processing subsequent tasks after a failure', async () => {
		const { queue, onAllDone } = makeQueue(1);
		const second = vi.fn(() => Promise.resolve());
		queue.enqueue(() => Promise.reject(new Error('fail')));
		queue.enqueue(second);
		await new Promise((r) => setTimeout(r, 0));
		expect(second).toHaveBeenCalledOnce();
		expect(onAllDone).toHaveBeenCalledOnce();
	});

	it('returns to idle after a failed task', async () => {
		const { queue } = makeQueue(1);
		queue.enqueue(() => Promise.reject(new Error('fail')));
		await new Promise((r) => setTimeout(r, 0));
		expect(queue.isIdle()).toBe(true);
	});
});
