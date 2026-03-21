import { execFileSync } from 'node:child_process';

export interface VideoProbeDeps {
	ffprobeBin?: string;
	readCommand?: (program: string, commandArguments: string[]) => string;
}

export type VideoHeightDeps = VideoProbeDeps;

function runFfprobe(inputPath: string, entry: string, deps: VideoProbeDeps): string {
	const readCommand =
		deps.readCommand ??
		((program: string, commandArguments: string[]) =>
			execFileSync(program, commandArguments).toString());
	return readCommand(deps.ffprobeBin ?? 'ffprobe', [
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		entry,
		'-of',
		'csv=p=0',
		inputPath
	]).trim();
}

export interface VideoInfo {
	height: number;
	fps: number;
}

export function getVideoInfo(inputPath: string, deps: VideoProbeDeps = {}): VideoInfo {
	const output = runFfprobe(inputPath, 'stream=height,avg_frame_rate', deps);
	const commaIndex = output.indexOf(',');
	const heightString = commaIndex === -1 ? output : output.slice(0, commaIndex);
	const fpsString = commaIndex === -1 ? '' : output.slice(commaIndex + 1);
	const height = Number.parseInt(heightString, 10);
	if (Number.isNaN(height)) throw new Error(`Could not determine video height for: ${inputPath}`);
	const parts = fpsString.split('/');
	const numerator = Number(parts[0]);
	const denominator = Number(parts[1]);
	if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0 || numerator <= 0) {
		throw new Error(`Could not determine video fps for: ${inputPath}`);
	}
	return { height, fps: numerator / denominator };
}

export function getVideoHeight(inputPath: string, deps: VideoProbeDeps = {}): number {
	const output = runFfprobe(inputPath, 'stream=height', deps);
	const height = Number.parseInt(output, 10);
	if (Number.isNaN(height)) throw new Error(`Could not determine video height for: ${inputPath}`);
	return height;
}

export function getVideoFps(inputPath: string, deps: VideoProbeDeps = {}): number {
	const output = runFfprobe(inputPath, 'stream=avg_frame_rate', deps);
	const parts = output.split('/');
	const numerator = Number(parts[0]);
	const denominator = Number(parts[1]);
	if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0 || numerator <= 0) {
		throw new Error(`Could not determine video fps for: ${inputPath}`);
	}
	return numerator / denominator;
}
