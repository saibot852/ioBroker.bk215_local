"use strict";
/**
 * ioBroker.bk215_local - src/protocol/parser.ts
 *
 * Stream parser and value decoder for the bk215_local TCP protocol.
 * The device often sends JSON objects back-to-back without newline framing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonStream = parseJsonStream;
exports.isDataReport = isDataReport;
exports.getFieldValue = getFieldValue;
exports.transformReadValue = transformReadValue;
exports.extractStateUpdates = extractStateUpdates;
const constants_1 = require("./constants");
const mapping_1 = require("./mapping");
const MAX_REST_LENGTH = 64 * 1024;
/**
 * Parse one chunk of text and extract complete JSON objects.
 *
 * @param rx - Current receive buffer plus new chunk as string
 * @returns Parsed messages and remaining rest buffer
 */
function parseJsonStream(rx) {
    const messages = [];
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
                    const msg = JSON.parse(raw);
                    messages.push(msg);
                    lastConsumedIndex = i + 1;
                }
                catch {
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
    }
    else if (lastConsumedIndex < rx.length) {
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
 *
 * @param msg
 */
function isDataReport(msg) {
    return (msg.code === constants_1.MessageCode.DATA_REPORT ||
        msg.code === constants_1.MessageCode.DATA_REPORT_ALT ||
        msg.code === constants_1.MessageCode.DATA_REPORT_EXT);
}
/**
 * Safely read a raw field value from a device message.
 *
 * @param msg
 * @param field
 */
function getFieldValue(msg, field) {
    return msg.data?.[field];
}
/**
 * Transform raw device values into ioBroker state values.
 */
function transformReadValue(entry, raw) {
    if (raw === undefined || raw === null) {
        return null;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num === constants_1.UNAVAILABLE_VALUE || num === -1) {
        return null;
    }
    let value;
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
            value = num - 273.15;
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
    if (typeof value === 'number') {
        switch (entry.transform) {
            case 'x0.001': // energy
                value = Math.round(value * 1000) / 1000;
                break;
            case 'temp273':
            case 'x0.1':
                value = Math.round(value * 10) / 10;
                break;
            default:
                value = Math.round(value);
        }
    }
    return value;
}
/**
 * Extract ioBroker state updates from a DATA_REPORT message.
 *
 * @param msg
 */
function extractStateUpdates(msg) {
    if (!isDataReport(msg) || !msg.data) {
        return [];
    }
    const updates = [];
    for (const entry of mapping_1.READ_STATE_MAP) {
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
