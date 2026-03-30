import type { CourseMetadata } from './types.js'

const MIN_SCORE = 0
const MAX_SCORE = 100

function validateRequiredStrings(
	course: Partial<CourseMetadata>,
	errors: string[],
): void {
	if (!course.id || typeof course.id !== 'string') {
		errors.push('Field "id" is required and must be a string.')
	}
	if (!course.title || typeof course.title !== 'string') {
		errors.push('Field "title" is required and must be a string.')
	}
}

function validateScores(
	course: Partial<CourseMetadata>,
	errors: string[],
): void {
	if (typeof course.minScore !== 'number') {
		errors.push('Field "minScore" is required and must be a number.')
	}
	if (typeof course.maxScore !== 'number') {
		errors.push('Field "maxScore" is required and must be a number.')
	}
	if (typeof course.masteryScore === 'undefined') return
	if (typeof course.masteryScore !== 'number' || Number.isNaN(course.masteryScore)) {
		errors.push('Field "masteryScore" must be a number when provided.')
		return
	}
	if (course.masteryScore < MIN_SCORE || course.masteryScore > MAX_SCORE) {
		errors.push(`Field "masteryScore" must be between ${MIN_SCORE} and ${MAX_SCORE}.`)
	}
}

export function validateCourseMetadata(course: unknown): CourseMetadata {
	if (!course || typeof course !== 'object') {
		throw new Error('Course definition must be an object.')
	}

	const errors: string[] = []
	const partial = course as Partial<CourseMetadata>

	validateRequiredStrings(partial, errors)
	validateScores(partial, errors)

	if (errors.length > 0) {
		throw new Error(`Invalid course definition:\n- ${errors.join('\n- ')}`)
	}

	return course as CourseMetadata
}
