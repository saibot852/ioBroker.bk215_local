import type * as utils from "@iobroker/adapter-core";
import { UNAVAILABLE_VALUE, type Dict } from "../protocol/constants";
import { READ_STATE_MAP } from "../protocol/mapping";

type AdapterInstance = InstanceType<typeof utils.Adapter>;

export async function applyDataReport(adapter: AdapterInstance, data: Dict): Promise<void> {
  await adapter.setStateAsync("info.lastUpdate", { val: Date.now(), ack: true });

  for (const m of READ_STATE_MAP) {
    if (!(m.field in data)) continue;

    const raw = data[m.field];
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "number" && raw === UNAVAILABLE_VALUE) continue;

    if (m.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) continue;
      await adapter.setStateAsync(m.stateId, { val: n, ack: true });
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) continue;
      await adapter.setStateAsync(m.stateId, { val: n === 1, ack: true });
    }
  }
}
