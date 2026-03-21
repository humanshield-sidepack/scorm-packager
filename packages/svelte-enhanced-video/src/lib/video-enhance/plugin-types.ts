import type { VideoFormat } from './encoder';
import type { EncodingQueue } from './encoding-queue';
import type { EnsureEncodedOptions } from './encoder';

export const RESOLUTION_4K = 2160;
export const RESOLUTION_1440P = 1440;
export const RESOLUTION_1080P = 1080;
export const RESOLUTION_720P = 720;
export const RESOLUTION_480P = 480;
export const RESOLUTION_360P = 360;
export const DEFAULT_RESOLUTIONS = [
	RESOLUTION_4K,
	RESOLUTION_1440P,
	RESOLUTION_1080P,
	RESOLUTION_720P,
	RESOLUTION_480P,
	RESOLUTION_360P
];
export const DEFAULT_FORMATS: VideoFormat[] = ['mp4', 'webm'];
export const HASH_SLICE_LENGTH = 10;
export const EXTERNAL_ENCODE_POLL_MS = 2000;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const TWO_HOURS = 2;
export const DEFAULT_LOCK_MAX_AGE_MS =
	TWO_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export interface VideoPluginOptions {
	resolutions?: number[];
	formats?: VideoFormat[];
	cacheDirectory?: string;
	maxJobs?: number;
	ffmpegPath?: string;
	ffprobePath?: string;
	lockMaxAgeMs?: number;
	/** Cap output frame rate at this value. Defaults to preserving the source fps. */
	fps?: number;
}

export interface VideoParameters {
	formats: VideoFormat[];
	resolutions: number[];
	cacheDirectory: string;
	ffmpegBin: string;
	ffprobeBin: string;
	lockMaxAgeMs: number;
	fps?: number;
}

export type EncodingPathPhase = 'encoding' | 'waiting';

export interface EncodingPathState {
	phase: EncodingPathPhase;
	encodeOptions: EnsureEncodedOptions;
}

export interface DevelopmentLoadState {
	pendingModuleIds: Set<string>;
	pathStates: Map<string, EncodingPathState>;
	encodingQueue: EncodingQueue;
	originalFiles: Map<string, string>;
	lockMaxAgeMs: number;
	hasWarnedAboutEncoding: boolean;
	warn: (message: string) => void;
	log: (message: string) => void;
	logError: (message: string, error: unknown) => void;
	/** Clears the dev-server polling interval. Set by setupDevelopmentServer. */
	dispose?: () => void;
}
