import { scormState } from "$core/scorm/index.js";
import { untrack } from "svelte";
import type { TestHandle } from "./types.js";

const PERCENTAGE = 100;

class TestRegistry {
  #tests = $state(new Map<string, TestHandle>());

  register(test: TestHandle): void {
    this.#tests.set(test.fullId, test);
  }

  unregister(testId: string): void {
    this.#tests.delete(testId);
  }

  get contributingTests(): TestHandle[] {
    return [...this.#tests.values()];
  }

  get courseScorePercentage(): number {
    const tests = this.contributingTests;
    if (tests.length === 0) return 0;
    const total = tests.reduce((sum, t) => sum + t.score, 0);
    return total / tests.length;
  }

  get allTestsPassed(): boolean {
    const tests = this.contributingTests;
    if (tests.length === 0) return false;
    return tests.every((t) => t.isPassed);
  }

  syncCourseScore(): void {
    const percentage = this.courseScorePercentage;
    if (percentage <= 0) return;

    const min = scormState.score.min ?? 0;
    const max = scormState.score.max ?? PERCENTAGE;
    const raw = min + (percentage / PERCENTAGE) * (max - min);
    scormState.score.raw = raw;

    if (this.allTestsPassed) {
      untrack(() => {
        scormState.completion.setPassed();
      });
    }
  }
}

export const testRegistry = new TestRegistry();
