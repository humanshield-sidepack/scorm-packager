import { SCORM12, SCORM2004 } from "./data-model.js";
import { ScormWrapper } from "./api-adapter.js";

const SCALE_PRECISION = 7;
const SCALE_MIN = 0;
const SCALE_MAX = 1;

export class ScoreState {
  #raw = $state<number>();
  #min = $state<number>();
  #max = $state<number>();
  #scaled = $state<number>();
  #wrapper: ScormWrapper;

  constructor(wrapper: ScormWrapper) {
    this.#wrapper = wrapper;
  }

  get raw(): number | undefined {
    return this.#raw;
  }

  set raw(value: number) {
    const min = this.#min ?? value;
    const max = this.#max ?? value;
    const clamped = Math.min(max, Math.max(min, value));
    if (clamped !== value) {
      console.warn(`[ScormState] Score ${value} clamped to [${min}, ${max}]`);
    }
    this.#raw = clamped;
    this.#wrapper.setValue(
      this.#wrapper.version === "2004"
        ? SCORM2004.SCORE_RAW
        : SCORM12.CORE_SCORE_RAW,
      String(clamped),
    );
    this.#updateScaled();
    this.#wrapper.commit();
  }

  get min(): number | undefined {
    return this.#min;
  }

  get max(): number | undefined {
    return this.#max;
  }

  _setRange(min: number, max: number): void {
    this.#min = min;
    this.#max = max;
    this.#wrapper.setValue(
      this.#wrapper.version === "2004"
        ? SCORM2004.SCORE_MIN
        : SCORM12.CORE_SCORE_MIN,
      String(min),
    );
    this.#wrapper.setValue(
      this.#wrapper.version === "2004"
        ? SCORM2004.SCORE_MAX
        : SCORM12.CORE_SCORE_MAX,
      String(max),
    );
    this.#wrapper.commit();
  }

  get scaled(): number | undefined {
    return this.#scaled;
  }

  #updateScaled(): void {
    if (this.#wrapper.version !== "2004") return;
    if (this.#raw === undefined || this.#max === undefined) return;
    const min = this.#min ?? SCALE_MIN;
    const range = this.#max - min;
    if (range <= SCALE_MIN) return;
    const computed = (this.#raw - min) / range;
    const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, computed));
    this.#scaled = Number(clamped.toFixed(SCALE_PRECISION));
    this.#wrapper.setValue(SCORM2004.SCORE_SCALED, String(this.#scaled));
  }

  load(wrapper: ScormWrapper): void {
    const isV2004 = wrapper.version === "2004";
    const rawValue = wrapper.getValue(
      isV2004 ? SCORM2004.SCORE_RAW : SCORM12.CORE_SCORE_RAW,
    );
    const minValue = wrapper.getValue(
      isV2004 ? SCORM2004.SCORE_MIN : SCORM12.CORE_SCORE_MIN,
    );
    const maxValue = wrapper.getValue(
      isV2004 ? SCORM2004.SCORE_MAX : SCORM12.CORE_SCORE_MAX,
    );
    this.#raw = rawValue ? Number(rawValue) : undefined;
    this.#min = minValue ? Number(minValue) : undefined;
    this.#max = maxValue ? Number(maxValue) : undefined;
    if (isV2004) {
      const scaledValue = wrapper.getValue(SCORM2004.SCORE_SCALED);
      this.#scaled = scaledValue ? Number(scaledValue) : undefined;
    }
  }
}
