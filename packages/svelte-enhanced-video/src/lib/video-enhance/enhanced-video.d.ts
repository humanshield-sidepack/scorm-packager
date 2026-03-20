declare module '*?enhanced' {
	interface EnhancedVideo {
		mp4: Record<string, string>;
		webm: Record<string, string>;
	}
	const video: EnhancedVideo;
	export default video;
}
