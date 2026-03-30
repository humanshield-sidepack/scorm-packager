import { SCORM12, SCORM2004 } from "./data-model.js";
import { ScormWrapper } from "./api-adapter.js";
import type {
  Scorm2004CompletionStatus,
  Scorm2004SuccessStatus,
} from "./types.js";

export class CompletionState {
  #completionStatus = $state<Scorm2004CompletionStatus>("incomplete");
  #successStatus = $state<Scorm2004SuccessStatus>("unknown");
  #wrapper: ScormWrapper;

  constructor(wrapper: ScormWrapper) {
    this.#wrapper = wrapper;
  }

  get status(): Scorm2004CompletionStatus {
    return this.#completionStatus;
  }

  get success(): Scorm2004SuccessStatus {
    return this.#successStatus;
  }

  setCompleted(): void {
    if (this.#wrapper.version === "2004") {
      this.#wrapper.setValue(SCORM2004.COMPLETION_STATUS, "completed");
    } else {
      this.#wrapper.setValue(SCORM12.CORE_LESSON_STATUS, "completed");
    }
    this.#completionStatus = "completed";
    this.#wrapper.commit();
  }

  setPassed(): void {
    if (this.#wrapper.version === "2004") {
      this.#wrapper.setValue(SCORM2004.COMPLETION_STATUS, "completed");
      this.#wrapper.setValue(SCORM2004.SUCCESS_STATUS, "passed");
    } else {
      this.#wrapper.setValue(SCORM12.CORE_LESSON_STATUS, "passed");
    }
    this.#completionStatus = "completed";
    this.#successStatus = "passed";
    this.#wrapper.commit();
  }

  setFailed(): void {
    if (this.#wrapper.version === "2004") {
      this.#wrapper.setValue(SCORM2004.COMPLETION_STATUS, "completed");
      this.#wrapper.setValue(SCORM2004.SUCCESS_STATUS, "failed");
    } else {
      this.#wrapper.setValue(SCORM12.CORE_LESSON_STATUS, "failed");
    }
    this.#completionStatus = "completed";
    this.#successStatus = "failed";
    this.#wrapper.commit();
  }

  setIncomplete(): void {
    if (this.#wrapper.version === "2004") {
      this.#wrapper.setValue(SCORM2004.COMPLETION_STATUS, "incomplete");
    } else {
      this.#wrapper.setValue(SCORM12.CORE_LESSON_STATUS, "incomplete");
    }
    this.#completionStatus = "incomplete";
    this.#wrapper.commit();
  }

  load(wrapper: ScormWrapper): void {
    if (wrapper.version === "2004") {
      this.#completionStatus = wrapper.getValue(
        SCORM2004.COMPLETION_STATUS,
      ) as Scorm2004CompletionStatus;
      this.#successStatus = wrapper.getValue(
        SCORM2004.SUCCESS_STATUS,
      ) as Scorm2004SuccessStatus;
      return;
    }
    this.#loadScorm12Status(wrapper);
  }

  #loadScorm12Status(wrapper: ScormWrapper): void {
    const raw = wrapper.getValue(SCORM12.CORE_LESSON_STATUS);
    switch (raw) {
      case "passed": {
        this.#completionStatus = "completed";
        this.#successStatus = "passed";
        break;
      }
      case "failed": {
        this.#completionStatus = "completed";
        this.#successStatus = "failed";
        break;
      }
      case "completed": {
        this.#completionStatus = "completed";
        this.#successStatus = "unknown";
        break;
      }
      default: {
        this.#completionStatus = "incomplete";
        this.#successStatus = "unknown";
      }
    }
  }
}
