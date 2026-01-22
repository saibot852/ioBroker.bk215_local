import type * as utils from "@iobroker/adapter-core";
type AdapterInstance = InstanceType<typeof utils.Adapter>;


async function ensureNumber(adapter: ioBroker.Adapter, id: string, name: string, role: string, unit?: string, write = false) {
  await adapter.setObjectNotExistsAsync(id, {
    type: "state",
    common: { name, type: "number", role, read: true, write, ...(unit ? { unit } : {}) },
    native: {},
  });
}

async function ensureBool(adapter: ioBroker.Adapter, id: string, name: string, write = false) {
  await adapter.setObjectNotExistsAsync(id, {
    type: "state",
    common: { name, type: "boolean", role: write ? "switch.enable" : "indicator", read: true, write },
    native: {},
  });
}

async function ensureText(adapter: ioBroker.Adapter, id: string, name: string) {
  await adapter.setObjectNotExistsAsync(id, {
    type: "state",
    common: { name, type: "string", role: "text", read: true, write: false },
    native: {},
  });
}

export async function ensureObjects(adapter: ioBroker.Adapter): Promise<void> {
  await adapter.setObjectNotExistsAsync("info", { type: "channel", common: { name: "Info" }, native: {} });
  await adapter.setObjectNotExistsAsync("status", { type: "channel", common: { name: "Status" }, native: {} });
  await adapter.setObjectNotExistsAsync("config", { type: "channel", common: { name: "Configuration" }, native: {} });
  await adapter.setObjectNotExistsAsync("modes", { type: "channel", common: { name: "Modes" }, native: {} });

  await ensureText(adapter, "info.connection", "Connection");
  await ensureBool(adapter, "info.connected", "Connected", false);
  await ensureNumber(adapter, "info.lastUpdate", "Last update", "value.time");
  await ensureText(adapter, "info.lastError", "Last error");
  await ensureBool(adapter, "info.readOnly", "Read-only", false);
  await ensureText(adapter, "status.raw_message", "Last raw message");

  // Battery SOC
  await ensureNumber(adapter, "status.overall_soc", "Overall SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.main_soc", "Main battery SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave1_soc", "Slave 1 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave2_soc", "Slave 2 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave3_soc", "Slave 3 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave4_soc", "Slave 4 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave5_soc", "Slave 5 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave6_soc", "Slave 6 SOC", "value.battery", "%");
  await ensureNumber(adapter, "status.slave7_soc", "Slave 7 SOC", "value.battery", "%");

  // BMS limits
  await ensureNumber(adapter, "status.main_bms_min", "Main BMS min limit", "value", "%");
  await ensureNumber(adapter, "status.main_bms_max", "Main BMS max limit", "value", "%");
  await ensureNumber(adapter, "status.slave1_bms_min", "Slave 1 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave1_bms_max", "Slave 1 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave2_bms_min", "Slave 2 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave2_bms_max", "Slave 2 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave3_bms_min", "Slave 3 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave3_bms_max", "Slave 3 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave4_bms_min", "Slave 4 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave4_bms_max", "Slave 4 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave5_bms_min", "Slave 5 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave5_bms_max", "Slave 5 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave6_bms_min", "Slave 6 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave6_bms_max", "Slave 6 BMS max", "value", "%");
  await ensureNumber(adapter, "status.slave7_bms_min", "Slave 7 BMS min", "value", "%");
  await ensureNumber(adapter, "status.slave7_bms_max", "Slave 7 BMS max", "value", "%");

  // Config RW
  await ensureNumber(adapter, "config.system_discharge_limit", "System discharge limit (min SOC)", "level", "%", true);
  await ensureNumber(adapter, "config.system_charge_limit", "System charge limit (max SOC)", "level", "%", true);
  await ensureNumber(adapter, "config.home_discharge_cutoff", "Home discharge cutoff", "level", "%", true);
  await ensureNumber(adapter, "config.car_discharge_cutoff", "Car discharge cutoff", "level", "%", true);
  await ensureNumber(adapter, "config.battery_charge_cutoff", "Battery charge cutoff", "level", "%", true);
  await ensureNumber(adapter, "config.system_charging_power", "System charging power", "level", "W", true);
  await ensureNumber(adapter, "config.idle_shutdown_time", "Idle shutdown time", "level", "min", true);
  await ensureNumber(adapter, "config.low_battery_shutdown_time", "Low battery shutdown time", "level", "min", true);

  // Modes RW
  await ensureBool(adapter, "modes.local_mode", "Local mode", true);
  await ensureBool(adapter, "modes.battery_charging_mode", "Battery charging mode", true);
  await ensureBool(adapter, "modes.car_charging_mode", "Car charging mode", true);
  await ensureBool(adapter, "modes.home_appliance_mode", "Home appliance mode", true);
  await ensureBool(adapter, "modes.ac_active_mode", "AC active mode", true);
}

