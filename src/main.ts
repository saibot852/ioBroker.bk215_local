/**
 * ioBroker.sunenergyxt - src/main.ts
 *
 * IMPORTANT:
 * The device PUSHES data continuously after handshake.
 * Therefore updateInterval is implemented as a THROTTLE for writing ioBroker states:
 * - incoming reports are cached/merged
 * - states are written every updateInterval seconds
 * - if updateInterval = 0 => write immediately on every report (no throttling)
 */

import * as utils from "@iobroker/adapter-core";

import { ensureObjects } from "./iobroker/objects";
import { applyDataReport } from "./iobroker/applyData";

import { SunEnergyXTTcpClient, isAck, isDataReport } from "./protocol/tcpClient";
import {
  DEFAULT_PORT,
  DEFAULT_TIMEOUT_SEC,
  RESPONSE_SUCCESS,
  Limits,
  type DeviceMessage,
  type Dict,
} from "./protocol/constants";

import { WRITE_FIELD_MAP } from "./protocol/mapping";

class SunenergyxtAdapter extends utils.Adapter {
  private tcp: SunEnergyXTTcpClient | null = null;

  private deviceIp = "";
  private devicePort = DEFAULT_PORT;
  private timeoutMs = Math.floor(DEFAULT_TIMEOUT_SEC * 1000);

  private cfgReadOnly = false;
  private cfgDebug = false;

  // THROTTLE interval (seconds) for writing states
  private updateIntervalSec = 5;

  // merged cache of latest device values
  private latestData: Dict = {};
  private latestDirty = false;

  // flush timer
  private flushTimer: ioBroker.Interval | undefined;

  // pending ACK by field
  private pending = new Map<string, { timer: NodeJS.Timeout; resolve: () => void; reject: (e: Error) => void }>();

  public constructor(options: Partial<utils.AdapterOptions> = {}) {
    super({ ...options, name: "sunenergyxt" });

    this.on("ready", this.onReady.bind(this));
    (this as any).on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  private async onReady(): Promise<void> {
    const cfg = this.config as any;

    this.deviceIp = String(cfg.host || "").trim();
    this.devicePort = this.sanitizeNumber(cfg.port, DEFAULT_PORT, 1, 65535);
    this.timeoutMs = this.sanitizeNumber(cfg.timeout, Math.floor(DEFAULT_TIMEOUT_SEC * 1000), 500, 20000);
    this.cfgReadOnly = !!cfg.readOnly;
    this.cfgDebug = !!cfg.debug;

    // throttle for state updates
    this.updateIntervalSec = this.sanitizeNumber(cfg.updateInterval, 5, 0, 3600);

    await ensureObjects(this);

    await this.setStateAsync("info.connection", { val: `${this.deviceIp}:${this.devicePort}`, ack: true });
    await this.setStateAsync("info.readOnly", { val: this.cfgReadOnly, ack: true });
    await this.setStateAsync("info.connected", { val: false, ack: true });
    await this.setStateAsync("info.lastError", { val: "", ack: true });

    if (!this.deviceIp) {
      this.log.error("Kein Host konfiguriert. Bitte Geräte-IP (host) in der Instanz setzen.");
      return;
    }

    this.subscribeStates("config.*");
    this.subscribeStates("modes.*");

    this.tcp = new SunEnergyXTTcpClient({
      onConnect: () => {
        void this.setStateAsync("info.connected", { val: true, ack: true });
        void this.setStateAsync("info.lastError", { val: "", ack: true });

        this.log.info("TCP connected. Sending handshake...");
        this.tcp?.sendHandshake();

        this.startFlushTimer();
      },

      onClose: () => {
        void this.setStateAsync("info.connected", { val: false, ack: true });

        this.stopFlushTimer();
        this.failAllPending(new Error("Connection closed"));

        this.log.warn("TCP connection closed. Reconnecting...");
        this.tcp?.scheduleReconnect(this.deviceIp, this.devicePort, this.timeoutMs);
      },

      onError: (err: Error) => {
        void this.setStateAsync("info.lastError", { val: err.message, ack: true });
        this.log.warn(`Socket error: ${err.message}`);
      },

      onMessage: (msg: DeviceMessage) => {
        void this.handleDeviceMessage(msg);
      },
    });

    this.tcp.connect(this.deviceIp, this.devicePort, this.timeoutMs);

    this.log.info(
      `SunEnergyXT Adapter gestartet (${this.deviceIp}:${this.devicePort}). ` +
        `UpdateInterval (State-Throttle): ${this.updateIntervalSec}s (0=sofort).`,
    );
  }

  private onUnload(callback: () => void): void {
    try {
      this.stopFlushTimer();
      this.failAllPending(new Error("Adapter unloading"));

      this.tcp?.destroy();
      this.tcp = null;

      callback();
    } catch {
      callback();
    }
  }

  // ------------------------
  // Throttle timer
  // ------------------------
  private startFlushTimer(): void {
    this.stopFlushTimer();

    if (this.updateIntervalSec === 0) {
      if (this.cfgDebug) this.log.info("updateInterval=0 -> states will be written immediately.");
      return;
    }

    this.flushTimer = this.setInterval(() => {
      void this.flushLatest();
    }, this.updateIntervalSec * 1000);

    if (this.cfgDebug) this.log.info(`State flush timer started: every ${this.updateIntervalSec}s`);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      this.clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async flushLatest(): Promise<void> {
    if (!this.latestDirty) return;
    this.latestDirty = false;

    // IMPORTANT:
    // applyDataReport updates only states for fields present in `data`.
    // So we pass the full merged cache to ensure stable states even if a field
    // is not present in every incoming packet.
    await applyDataReport(this as any, this.latestData);
  }

  // ------------------------
  // Incoming device messages
  // ------------------------
  private async handleDeviceMessage(msg: DeviceMessage): Promise<void> {
    if (this.cfgDebug) {
      await this.setStateAsync("status.raw_message", { val: JSON.stringify(msg), ack: true });
    }

    if (isAck(msg.code)) {
      const data = msg.data || {};

      // handshake ack can be {"code":0,"data":{}}
      if (!Object.keys(data).length) {
        this.log.debug("Handshake ACK received.");
        return;
      }

      for (const [field, rcRaw] of Object.entries(data)) {
        const p = this.pending.get(field);
        if (!p) continue;

        clearTimeout(p.timer);
        this.pending.delete(field);

        const rc = Number(rcRaw);
        if (rc === RESPONSE_SUCCESS) p.resolve();
        else p.reject(new Error(`Device rejected ${field}, rc=${String(rcRaw)}`));
      }
      return;
    }

    if (isDataReport(msg.code)) {
      const data = msg.data || {};

      // merge into cache
      Object.assign(this.latestData, data);
      this.latestDirty = true;

      // if throttling disabled -> write immediately only for current packet
      if (this.updateIntervalSec === 0) {
        await applyDataReport(this as any, data);
        this.latestDirty = false;
      }

      return;
    }

    this.log.debug(`Unknown message code: ${msg.code}`);
  }

  // ------------------------
  // Outgoing writes from ioBroker
  // ------------------------
  private async onStateChange(id: string, state: ioBroker.State | null): Promise<void> {
    if (!state || state.ack) return;

    if (this.cfgReadOnly) {
      this.log.warn(`Read-only aktiv: ignoriere write auf ${id}`);
      return;
    }
    if (!this.tcp || !this.tcp.isConnected()) {
      this.log.warn(`Nicht verbunden: ignoriere write auf ${id}`);
      return;
    }

    const shortId = id.replace(`${this.namespace}.`, "");
    const field = WRITE_FIELD_MAP[shortId];
    if (!field) return;

    try {
      const valueToSend = this.validateAndConvert(shortId, state.val);
      await this.sendSetField(field, valueToSend);
    } catch (e) {
      const msg = this.errToString(e);
      await this.setStateAsync("info.lastError", { val: msg, ack: true });
      this.log.warn(`Write failed (${shortId}): ${msg}`);
    }
  }

  private async sendSetField(field: string, value: number): Promise<void> {
    this.tcp?.sendCommand({ [field]: value });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(field);
        reject(new Error(`Command timeout for ${field}`));
      }, this.timeoutMs);

      this.pending.set(field, { timer, resolve, reject });
    });
  }

  private failAllPending(err: Error): void {
    for (const [field, p] of this.pending.entries()) {
      clearTimeout(p.timer);
      try {
        p.reject(err);
      } catch {
        // ignore
      }
      this.pending.delete(field);
    }
  }

  // ------------------------
  // Validation / helpers
  // ------------------------
  private validateAndConvert(shortId: string, val: any): number {
    const asInt = (v: any, label: string): number => {
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${label}: must be an integer`);
      return n;
    };
    const inRange = (n: number, min: number, max: number, label: string): void => {
      if (n < min || n > max) throw new Error(`${label}: ${n} out of range (${min}..${max})`);
    };

    if (shortId === "config.system_discharge_limit") {
      const n = asInt(val, shortId);
      inRange(n, Limits.MIN_DISCHARGE_SOC_MIN, Limits.MIN_DISCHARGE_SOC_MAX, shortId);
      return n;
    }
    if (shortId === "config.system_charge_limit") {
      const n = asInt(val, shortId);
      inRange(n, Limits.MAX_CHARGE_SOC_MIN, Limits.MAX_CHARGE_SOC_MAX, shortId);
      return n;
    }
    if (shortId === "config.home_discharge_cutoff") {
      const n = asInt(val, shortId);
      inRange(n, Limits.HOME_APPLIANCE_MIN_SOC_MIN, Limits.HOME_APPLIANCE_MIN_SOC_MAX, shortId);
      return n;
    }
    if (shortId === "config.car_discharge_cutoff") {
      const n = asInt(val, shortId);
      inRange(n, Limits.EV_CHARGING_MIN_SOC_MIN, Limits.EV_CHARGING_MIN_SOC_MAX, shortId);
      return n;
    }
    if (shortId === "config.battery_charge_cutoff") {
      const n = asInt(val, shortId);
      inRange(n, Limits.CHARGING_MAX_SOC_MIN, Limits.CHARGING_MAX_SOC_MAX, shortId);
      return n;
    }
    if (shortId === "config.system_charging_power") {
      const n = asInt(val, shortId);
      inRange(n, Limits.SYSTEM_CHARGING_POWER_MIN, Limits.SYSTEM_CHARGING_POWER_MAX, shortId);
      return n;
    }
    if (shortId === "config.idle_shutdown_time") {
      const n = asInt(val, shortId);
      inRange(n, Limits.NO_IO_SHUTDOWN_TIMEOUT_MIN, Limits.NO_IO_SHUTDOWN_TIMEOUT_MAX, shortId);
      return n;
    }
    if (shortId === "config.low_battery_shutdown_time") {
      const n = asInt(val, shortId);
      inRange(n, Limits.DOD_SHUTDOWN_TIMEOUT_MIN, Limits.DOD_SHUTDOWN_TIMEOUT_MAX, shortId);
      return n;
    }

    // booleans (modes.*)
    return !!val ? 1 : 0;
  }

  private sanitizeNumber(value: any, def: number, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  }

  private errToString(e: unknown): string {
    if (e instanceof Error) return e.message;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
}

if (module.parent) {
  module.exports = (options: Partial<utils.AdapterOptions>) => new SunenergyxtAdapter(options);
} else {
  // eslint-disable-next-line no-new
  new SunenergyxtAdapter();
}
