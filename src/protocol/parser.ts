/**
 * ioBroker.bk215_local - src/protocol/parser.ts
 *
 * Stream parser for the bk215_local TCP protocol.
 * The device often sends JSON objects back-to-back without newline framing.
 */

import type { DeviceMessage } from './constants';

/**
 * Result of parsing a chunk: extracted messages and remaining tail (incomplete JSON).
 */
export type ParseResult = {
	/** Successfully parsed device messages. */
	messages: DeviceMessage[];
	/** Remaining buffer tail (incomplete JSON / trailing garbage). */
	rest: string;
};

/**
 * Parse one chunk of text and extract complete JSON objects.
 *
 * @param rx - The current receive buffer + new chunk as string
 * @returns Parsed messages and remaining rest buffer
 */
export function parseJsonStream(rx: string): ParseResult {
	const messages: DeviceMessage[] = [];

	// find first potential JSON object start
	const start = rx.indexOf('{');
	if (start < 0) {
		return { messages, rest: '' };
	}

	// drop any garbage before first '{'
	rx = rx.slice(start);

	let inString = false;
	let escape = false;
	let depth = 0;

	let objStart = 0;

	for (let i = 0; i < rx.length; i++) {
		const c = rx[i];

		if (inString) {
			if (escape) {
				escape = false;
				continue;
			}
			if (c === '\\') {
				escape = true;
				continue;
			}
			if (c === '"') {
				inString = false;
			}
			continue;
		}

		// not in string
		if (c === '"') {
			inString = true;
			continue;
		}

		if (c === '{') {
			if (depth === 0) {
				objStart = i;
			}
			depth++;
			continue;
		}

		if (c === '}') {
			if (depth > 0) {
				depth--;
			}

			if (depth === 0) {
				const raw = rx.slice(objStart, i + 1);
				try {
					const msg = JSON.parse(raw) as DeviceMessage;
					messages.push(msg);
				} catch {
					// ignore broken JSON fragments
				}
			}
		}
	}

	// whatever is left after last complete object boundary
	// if depth > 0, we have an incomplete JSON tail -> keep it
	if (depth > 0) {
		// keep from last object start to end
		return { messages, rest: rx.slice(objStart) };
	}

	// depth == 0: we may still have garbage after last object; keep only from last '{' if any, else empty
	const lastOpen = rx.lastIndexOf('{');
	const lastClose = rx.lastIndexOf('}');
	if (lastOpen > lastClose) {
		return { messages, rest: rx.slice(lastOpen) };
	}

	return { messages, rest: '' };
}
