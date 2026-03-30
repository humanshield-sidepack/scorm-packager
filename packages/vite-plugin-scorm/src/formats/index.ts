import type { FormatContext, FormatResult } from '../types.js'

export type FormatHandler = (context: FormatContext) => FormatResult

export type FormatRegistry = Map<string, FormatHandler>

export function createFormatRegistry(): FormatRegistry {
	return new Map<string, FormatHandler>()
}
