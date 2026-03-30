import { deflateSync, decompressSync, strToU8, strFromU8 } from "fflate";
import {
  SCORM12,
  SCORM2004,
  scorm2004Interaction,
  scorm12Interaction,
} from "../data-model.js";
import {
  getNextInteractionIndex,
  rebuildInteractions,
  writeSingleInteraction,
} from "./interactions.js";
import type {
  StoreData,
  IStorageEngine,
  RecordInteractionOptions,
} from "./interactions.js";

export type {
  StorageMode,
  RecordInteractionOptions,
  RecordedInteraction,
  StoreData,
  IStorageEngine,
} from "./interactions.js";
export type { ObjectiveState } from "./objectives.js";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.codePointAt(0)!);
}

function compressToBase64(input: string): string {
  return uint8ArrayToBase64(deflateSync(strToU8(input)));
}

function decompressFromBase64(base64: string): string {
  return strFromU8(decompressSync(base64ToUint8Array(base64)));
}

const SCORM12_SUSPEND_DATA_WARN = 3800;
const SCORM12_SUSPEND_DATA_MAX = 4096;
const SCORM2004_SUSPEND_DATA_WARN = 60_000;
const SCORM2004_SUSPEND_DATA_MAX = 64_000;
const CHUNK_INTERACTION_RESPONSE_LENGTH = 4000;

function getSuspendDataLimits(
  wrapper: import("../api-adapter.js").ScormWrapper,
): { warn: number; max: number } {
  return wrapper.version === "2004"
    ? { warn: SCORM2004_SUSPEND_DATA_WARN, max: SCORM2004_SUSPEND_DATA_MAX }
    : { warn: SCORM12_SUSPEND_DATA_WARN, max: SCORM12_SUSPEND_DATA_MAX };
}

function checkSuspendDataSize(
  payload: string,
  wrapper: import("../api-adapter.js").ScormWrapper,
): boolean {
  const { warn, max } = getSuspendDataLimits(wrapper);
  if (payload.length > max) {
    console.error(
      `[PersistentStore] suspend_data size (${payload.length}) exceeds limit (${max}). Data not saved.`,
    );
    return false;
  }
  if (payload.length > warn) {
    console.warn(
      `[PersistentStore] suspend_data size (${payload.length}) is approaching the limit (${max}).`,
    );
  }
  return true;
}

export class StandardStorageEngine implements IStorageEngine {
  persist(
    data: StoreData,
    wrapper: import("../api-adapter.js").ScormWrapper,
  ): void {
    const payload = `{"t":"s","d":"${compressToBase64(JSON.stringify(data.variables))}"}`;
    if (!checkSuspendDataSize(payload, wrapper)) return;
    const suspendElement =
      wrapper.version === "2004"
        ? SCORM2004.SUSPEND_DATA
        : SCORM12.SUSPEND_DATA;
    wrapper.setValue(suspendElement, payload);
    wrapper.commit();
  }

  restore(wrapper: import("../api-adapter.js").ScormWrapper): StoreData {
    const suspendElement =
      wrapper.version === "2004"
        ? SCORM2004.SUSPEND_DATA
        : SCORM12.SUSPEND_DATA;
    const raw = wrapper.getValue(suspendElement);
    let variables: Record<string, unknown> = {};

    if (raw) {
      try {
        const meta = JSON.parse(raw) as { t: string; d: string };
        if (meta.t === "s" && meta.d) {
          variables = JSON.parse(decompressFromBase64(meta.d)) as Record<
            string,
            unknown
          >;
        }
      } catch {
        console.warn(
          "[PersistentStore] Failed to parse suspend_data — starting fresh.",
        );
      }
    }

    return { variables, interactions: rebuildInteractions(wrapper) };
  }

  reportInteraction(
    options: RecordInteractionOptions,
    wrapper: import("../api-adapter.js").ScormWrapper,
  ): void {
    const index = getNextInteractionIndex(wrapper);
    writeSingleInteraction(index, options, wrapper);
    wrapper.commit();
  }
}

export class ChunkedStorageEngine implements IStorageEngine {
  persist(
    data: StoreData,
    wrapper: import("../api-adapter.js").ScormWrapper,
  ): void {
    const compressed = compressToBase64(JSON.stringify(data));
    const singlePayload = `{"t":"s","d":"${compressed}"}`;
    const { max } = getSuspendDataLimits(wrapper);
    const suspendElement =
      wrapper.version === "2004"
        ? SCORM2004.SUSPEND_DATA
        : SCORM12.SUSPEND_DATA;

    if (singlePayload.length <= max) {
      wrapper.setValue(suspendElement, singlePayload);
      wrapper.commit();
      return;
    }

    const startIndex = getNextInteractionIndex(wrapper);
    const is2004 = wrapper.version === "2004";
    let chunkCount = 0;
    let offset = 0;

    while (offset < compressed.length) {
      const chunk = compressed.slice(
        offset,
        offset + CHUNK_INTERACTION_RESPONSE_LENGTH,
      );
      const chunkIndex = startIndex + chunkCount;
      const element = is2004
        ? scorm2004Interaction(chunkIndex)
        : scorm12Interaction(chunkIndex);
      wrapper.setValue(element.id, `data_chunk_${chunkCount}`);
      wrapper.setValue(element.type, "other");
      const responseField = is2004
        ? (element as ReturnType<typeof scorm2004Interaction>).learnerResponse
        : (element as ReturnType<typeof scorm12Interaction>).studentResponse;
      wrapper.setValue(responseField, chunk);
      offset += CHUNK_INTERACTION_RESPONSE_LENGTH;
      chunkCount++;
    }

    wrapper.setValue(
      suspendElement,
      `{"t":"c","s":${startIndex},"n":${chunkCount}}`,
    );
    wrapper.commit();
  }

  restore(wrapper: import("../api-adapter.js").ScormWrapper): StoreData {
    const suspendElement =
      wrapper.version === "2004"
        ? SCORM2004.SUSPEND_DATA
        : SCORM12.SUSPEND_DATA;
    const raw = wrapper.getValue(suspendElement);
    const empty: StoreData = { variables: {}, interactions: {} };

    if (!raw) return empty;

    try {
      const meta = JSON.parse(raw) as {
        t: string;
        d?: string;
        s?: number;
        n?: number;
      };

      if (meta.t === "s" && meta.d) {
        return JSON.parse(decompressFromBase64(meta.d)) as StoreData;
      }

      if (meta.t === "c" && meta.s !== undefined && meta.n !== undefined) {
        const is2004 = wrapper.version === "2004";
        const chunks: string[] = [];
        for (
          let chunkIndex = meta.s;
          chunkIndex < meta.s + meta.n;
          chunkIndex++
        ) {
          const element = is2004
            ? scorm2004Interaction(chunkIndex)
            : scorm12Interaction(chunkIndex);
          const responseField = is2004
            ? (element as ReturnType<typeof scorm2004Interaction>)
                .learnerResponse
            : (element as ReturnType<typeof scorm12Interaction>)
                .studentResponse;
          chunks.push(wrapper.getValue(responseField));
        }
        return JSON.parse(decompressFromBase64(chunks.join(""))) as StoreData;
      }
    } catch {
      console.warn(
        "[PersistentStore] Failed to restore chunked data — starting fresh.",
      );
    }

    return empty;
  }

  reportInteraction(): void {}
}
