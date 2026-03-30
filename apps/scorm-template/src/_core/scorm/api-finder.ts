import type { Scorm12API, Scorm2004API } from "./types.js";

const MAX_SEARCH_DEPTH = 10;

type WindowRecord = Record<string, unknown>;

function isScorm12API(value: unknown): value is Scorm12API {
  return (
    typeof value === "object" &&
    value !== null &&
    "LMSInitialize" in value &&
    "LMSGetValue" in value &&
    "LMSSetValue" in value
  );
}

function isScorm2004API(value: unknown): value is Scorm2004API {
  return (
    typeof value === "object" &&
    value !== null &&
    "Initialize" in value &&
    "GetValue" in value &&
    "SetValue" in value
  );
}

function readScorm12Candidate(targetWindow: Window): unknown {
  return (targetWindow as unknown as WindowRecord).API;
}

function readScorm2004Candidate(targetWindow: Window): unknown {
  return (targetWindow as unknown as WindowRecord).API_1484_11;
}

type CandidateReader = (targetWindow: Window) => unknown;

function traverseParents(
  startWindow: Window,
  read: CandidateReader,
  test: (candidate: unknown) => boolean,
): unknown {
  let currentWindow = startWindow;
  let depth = 0;

  while (depth < MAX_SEARCH_DEPTH) {
    try {
      const candidate = read(currentWindow);
      if (test(candidate)) return candidate;
    } catch {
      break;
    }

    if (currentWindow.parent === currentWindow) break;
    currentWindow = currentWindow.parent;
    depth++;
  }

  return undefined;
}

function findAPI(
  read: CandidateReader,
  test: (candidate: unknown) => boolean,
): unknown {
  const rootWindow = globalThis as unknown as Window;

  const fromParents = traverseParents(rootWindow, read, test);
  if (fromParents !== undefined) return fromParents;

  try {
    const openerWindow = rootWindow.opener as Window | null;
    if (openerWindow !== null && openerWindow !== undefined) {
      return traverseParents(openerWindow, read, test);
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function findScorm12API(): Scorm12API | undefined {
  const result = findAPI(readScorm12Candidate, isScorm12API);
  return isScorm12API(result) ? result : undefined;
}

export function findScorm2004API(): Scorm2004API | undefined {
  const result = findAPI(readScorm2004Candidate, isScorm2004API);
  return isScorm2004API(result) ? result : undefined;
}
