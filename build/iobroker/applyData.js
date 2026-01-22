"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDataReport = applyDataReport;
const mapping_1 = require("../protocol/mapping");
const constants_1 = require("../protocol/constants");
/**
 * Applies a device data report to ioBroker states.
 *
 * @param adapter The adapter instance
 * @param data The decoded "data" object from the device message
 */
async function applyDataReport(adapter, data) {
    await adapter.setStateAsync('info.lastUpdate', { val: Date.now(), ack: true });
    for (const m of mapping_1.READ_STATE_MAP) {
        if (!(m.field in data)) {
            continue;
        }
        const raw = data[m.field];
        if (raw === null || raw === undefined) {
            continue;
        }
        if (typeof raw === 'number' && raw === constants_1.UNAVAILABLE_VALUE) {
            continue;
        }
        if (m.type === 'number') {
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) {
                continue;
            }
            await adapter.setStateAsync(m.stateId, { val: n, ack: true });
        }
        else {
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) {
                continue;
            }
            await adapter.setStateAsync(m.stateId, { val: n === 1, ack: true });
        }
    }
}
