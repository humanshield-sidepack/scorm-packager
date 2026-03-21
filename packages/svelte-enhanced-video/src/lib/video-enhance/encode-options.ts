import type { EnsureEncodedOptions, VideoFormat } from './encoder.js';
import type { VideoParameters } from './plugin-types.js';

interface EncodeContext {
	inputPath: string;
	baseName: string;
	hash: string;
	sourceFps: number;
}

interface BuildEnsureEncodedOptionsArguments {
	context: EncodeContext;
	parameters: Pick<VideoParameters, 'cacheDirectory' | 'ffmpegBin' | 'fps'>;
	format: VideoFormat;
	resolution: number;
	cacheDirectoryOverride?: string;
}

export function buildEnsureEncodedOptions(
	arguments_: BuildEnsureEncodedOptionsArguments
): EnsureEncodedOptions {
	const { context, parameters, format, resolution, cacheDirectoryOverride } = arguments_;
	const { inputPath, baseName, hash, sourceFps } = context;
	return {
		inputPath,
		baseName,
		hash,
		resolution,
		format,
		cacheDirectory: cacheDirectoryOverride ?? parameters.cacheDirectory,
		ffmpegBin: parameters.ffmpegBin,
		sourceFps,
		fps: parameters.fps
	};
}
