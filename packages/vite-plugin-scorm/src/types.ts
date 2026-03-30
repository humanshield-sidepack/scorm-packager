export type CourseMetadata = {
	id: string
	title: string
	description?: string
	masteryScore?: number
	minScore: number
	maxScore: number
}

export type LessonMetadata = {
	id: string
	title: string
	description?: string
	slides: SlideMetadata[]
}

export type SlideMetadata = {
	id: string
}

export type DistributionFile = {
	diskPath: string
	relativePath: string
}

export type FormatContext = {
	metadata: CourseMetadata
	entry: string
	distFiles: DistributionFile[]
}

export type FormatResult = {
	manifest: string
	suffix: string
}

export type ScormPackagerOptions = {
	/**
	 * Path to the TypeScript course definition file, relative to the Vite project root.
	 * @default 'src/course.ts'
	 */
	courseFile?: string
	/**
	 * Entry HTML filename as it appears in the Vite dist output.
	 * @default 'index.html'
	 */
	entry?: string
	/**
	 * Which SCORM version(s) to package.
	 * @default 'both'
	 */
	target?: '1.2' | '2004' | 'both'
	/**
	 * Output directory for generated ZIP files, relative to the project root.
	 * @default 'scorm-packages'
	 */
	outputDir?: string
	/**
	 * Custom course loader. Receives the absolute project root path.
	 * When omitted, uses the built-in Svelte loader (esbuild + Node VM).
	 */
	loadCourse?: (root: string) => Promise<CourseMetadata>

}
