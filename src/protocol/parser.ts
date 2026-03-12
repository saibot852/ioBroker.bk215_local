/**
 * ioBroker.bk215_local - src/protocol/parser.ts
 *
 * Stream parser and value decoder for the bk215_local TCP protocol.
 * The device often sends JSON objects back-to-back without newline framing.
 */
 
 function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

import { MessageCode, UNAVAILABLE_VALUE, type DeviceMessage } from './constants';
import { READ_STATE_MAP, type ReadStateMapEntry } from './mapping';

/**
 * Result of parsing a chunk: extracted messages and remaining tail (incomplete JSON).
 */
export type ParseResult = {
	/** Successfully parsed device messages. */
	messages: DeviceMessage[];
	/** Remaining buffer tail (incomplete JSON / trailing fragment). */
	rest: string;
};

/**
 * A parsed ioBroker state update derived from a device data report.
 */
export type ParsedStateUpdate = {
	stateId: string;
	value: number | boolean;
};

const MAX_REST_LENGTH = 64 * 1024;

/**
 * Parse one chunk of text and extract complete JSON objects.
 *
 * @param rx - Current receive buffer plus new chunk as string
 * @returns Parsed messages and remaining rest buffer
 */
export function parseJsonStream(rx: string): ParseResult {
	const messages: DeviceMessage[] = [];

	if (!rx) {
		return { messages, rest: '' };
	}

	const firstOpen = rx.indexOf('{');
	if (firstOpen < 0) {
		return { messages, rest: '' };
	}

	// Drop garbage before first JSON object start
	rx = rx.slice(firstOpen);

	let inString = false;
	let escape = false;
	let depth = 0;

	let objStart = -1;
	let lastConsumedIndex = 0;

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

			if (depth === 0 && objStart >= 0) {
				const raw = rx.slice(objStart, i + 1);
				try {
					const msg = JSON.parse(raw) as DeviceMessage;
					messages.push(msg);
					lastConsumedIndex = i + 1;
				} catch {
					// Ignore invalid fragments but consume them from the stream
					lastConsumedIndex = i + 1;
				}
				objStart = -1;
			}
		}
	}

	let rest = '';

	if (depth > 0 && objStart >= 0) {
		rest = rx.slice(objStart);
	} else if (lastConsumedIndex < rx.length) {
		const trailing = rx.slice(lastConsumedIndex);
		const nextOpen = trailing.indexOf('{');
		rest = nextOpen >= 0 ? trailing.slice(nextOpen) : '';
	}

	if (rest.length > MAX_REST_LENGTH) {
		rest = rest.slice(-MAX_REST_LENGTH);
	}

	return { messages, rest };
}

/**
 * Returns true if a device message is a data report.
 */
export function isDataReport(msg: DeviceMessage): boolean {
	return msg.code === MessageCode.DATA_REPORT || msg.code === MessageCode.DATA_REPORT_ALT;
}

/**
 * Safely read a raw field value from a device message.
 */
export function getFieldValue(msg: DeviceMessage, field: string): unknown {
	return msg.data?.[field];
}

/**
 * Returns true if the raw value should be treated as unavailable / invalid.
 */
function isUnavailableRawValue(num: number): boolean {
	return !Number.isFinite(num) || num === UNAVAILABLE_VALUE || num === -1;
}

/**
 * Transform raw device values into ioBroker state values.
 */
export function transformReadValue(entry: ReadStateMapEntry, raw: unknown): number | boolean | null {
	if (raw === undefined || raw === null) {
		return null;
	}

	const num = Number(raw);
	if (isUnavailableRawValue(num)) {
		return null;
	}

	let value: number | boolean | null;

switch (entry.transform ?? 'none') {
	case 'none':
		value = entry.type === 'boolean' ? num === 1 : num;
		break;

	case 'x0.1':
		value = num * 0.1;
		break;

	case 'x0.01':
		value = num * 0.01;
		break;

	case 'x0.001':
		value = num * 0.001;
		break;

	case 'temp273':
		value = (num / 10) - 273.15;
		break;

	case 'bit':
		if (entry.bit === undefined) {
			return null;
		}
		value = ((num >> entry.bit) & 1) === 1;
		break;

	default:
		return null;
}

/* zentrale Rundung */
if (typeof value === 'number') {
	value = round1(value);
}

return value;
}

/**
 * Extract ioBroker state updates from a DATA_REPORT message.
 */
export function extractStateUpdates(msg: DeviceMessage): ParsedStateUpdate[] {
	if (!isDataReport(msg) || !msg.data) {
		return [];
	}

	const updates: ParsedStateUpdate[] = [];

	for (const entry of READ_STATE_MAP) {
		const raw = getFieldValue(msg, entry.field);
		if (raw === undefined) {
			continue;
		}

		const value = transformReadValue(entry, raw);
		if (value === null) {
			continue;
		}

		updates.push({
			stateId: entry.stateId,
			value,
		});
	}

	return updates;
}