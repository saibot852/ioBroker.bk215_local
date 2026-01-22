"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const objects_1 = require("./iobroker/objects");
const applyData_1 = require("./iobroker/applyData");
const tcpClient_1 = require("./protocol/tcpClient");
const constants_1 = require("./protocol/constants");
const mapping_1 = require("./protocol/mapping");
class SunenergyxtAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({ ...options, name: "sunenergyxt" });
        this.tcp = null;
        this.deviceIp = "";
        this.devicePort = constants_1.DEFAULT_PORT;
        this.timeoutMs = Math.floor(constants_1.DEFAULT_TIMEOUT_SEC * 1000);
        this.cfgReadOnly = false;
        this.cfgDebug = false;
        // THROTTLE interval (seconds) for writing states
        this.updateIntervalSec = 5;
        // merged cache of latest device values
        this.latestData = {};
        this.latestDirty = false;
        // pending ACK by field
        this.pending = new Map();
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    async onReady() {
        const cfg = this.config;
        this.deviceIp = String(cfg.host || "").trim();
        this.devicePort = this.sanitizeNumber(cfg.port, constants_1.DEFAULT_PORT, 1, 65535);
        this.timeoutMs = this.sanitizeNumber(cfg.timeout, Math.floor(constants_1.DEFAULT_TIMEOUT_SEC * 1000), 500, 20000);
        this.cfgReadOnly = !!cfg.readOnly;
        this.cfgDebug = !!cfg.debug;
        // throttle for state updates
        this.updateIntervalSec = this.sanitizeNumber(cfg.updateInterval, 5, 0, 3600);
        await (0, objects_1.ensureObjects)(this);
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
        this.tcp = new tcpClient_1.SunEnergyXTTcpClient({
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
            onError: (err) => {
                void this.setStateAsync("info.lastError", { val: err.message, ack: true });
                this.log.warn(`Socket error: ${err.message}`);
            },
            onMessage: (msg) => {
                void this.handleDeviceMessage(msg);
            },
        });
        this.tcp.connect(this.deviceIp, this.devicePort, this.timeoutMs);
        this.log.info(`SunEnergyXT Adapter gestartet (${this.deviceIp}:${this.devicePort}). ` +
            `UpdateInterval (State-Throttle): ${this.updateIntervalSec}s (0=sofort).`);
    }
    onUnload(callback) {
        try {
            this.stopFlushTimer();
            this.failAllPending(new Error("Adapter unloading"));
            this.tcp?.destroy();
            this.tcp = null;
            callback();
        }
        catch {
            callback();
        }
    }
    // ------------------------
    // Throttle timer
    // ------------------------
    startFlushTimer() {
        this.stopFlushTimer();
        if (this.updateIntervalSec === 0) {
            if (this.cfgDebug)
                this.log.info("updateInterval=0 -> states will be written immediately.");
            return;
        }
        this.flushTimer = this.setInterval(() => {
            void this.flushLatest();
        }, this.updateIntervalSec * 1000);
        if (this.cfgDebug)
            this.log.info(`State flush timer started: every ${this.updateIntervalSec}s`);
    }
    stopFlushTimer() {
        if (this.flushTimer) {
            this.clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
    }
    async flushLatest() {
        if (!this.latestDirty)
            return;
        this.latestDirty = false;
        // IMPORTANT:
        // applyDataReport updates only states for fields present in `data`.
        // So we pass the full merged cache to ensure stable states even if a field
        // is not present in every incoming packet.
        await (0, applyData_1.applyDataReport)(this, this.latestData);
    }
    // ------------------------
    // Incoming device messages
    // ------------------------
    async handleDeviceMessage(msg) {
        if (this.cfgDebug) {
            await this.setStateAsync("status.raw_message", { val: JSON.stringify(msg), ack: true });
        }
        if ((0, tcpClient_1.isAck)(msg.code)) {
            const data = msg.data || {};
            // handshake ack can be {"code":0,"data":{}}
            if (!Object.keys(data).length) {
                this.log.debug("Handshake ACK received.");
                return;
            }
            for (const [field, rcRaw] of Object.entries(data)) {
                const p = this.pending.get(field);
                if (!p)
                    continue;
                clearTimeout(p.timer);
                this.pending.delete(field);
                const rc = Number(rcRaw);
                if (rc === constants_1.RESPONSE_SUCCESS)
                    p.resolve();
                else
                    p.reject(new Error(`Device rejected ${field}, rc=${String(rcRaw)}`));
            }
            return;
        }
        if ((0, tcpClient_1.isDataReport)(msg.code)) {
            const data = msg.data || {};
            // merge into cache
            Object.assign(this.latestData, data);
            this.latestDirty = true;
            // if throttling disabled -> write immediately only for current packet
            if (this.updateIntervalSec === 0) {
                await (0, applyData_1.applyDataReport)(this, data);
                this.latestDirty = false;
            }
            return;
        }
        this.log.debug(`Unknown message code: ${msg.code}`);
    }
    // ------------------------
    // Outgoing writes from ioBroker
    // ------------------------
    async onStateChange(id, state) {
        if (!state || state.ack)
            return;
        if (this.cfgReadOnly) {
            this.log.warn(`Read-only aktiv: ignoriere write auf ${id}`);
            return;
        }
        if (!this.tcp || !this.tcp.isConnected()) {
            this.log.warn(`Nicht verbunden: ignoriere write auf ${id}`);
            return;
        }
        const shortId = id.replace(`${this.namespace}.`, "");
        const field = mapping_1.WRITE_FIELD_MAP[shortId];
        if (!field)
            return;
        try {
            const valueToSend = this.validateAndConvert(shortId, state.val);
            await this.sendSetField(field, valueToSend);
        }
        catch (e) {
            const msg = this.errToString(e);
            await this.setStateAsync("info.lastError", { val: msg, ack: true });
            this.log.warn(`Write failed (${shortId}): ${msg}`);
        }
    }
    async sendSetField(field, value) {
        this.tcp?.sendCommand({ [field]: value });
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(field);
                reject(new Error(`Command timeout for ${field}`));
            }, this.timeoutMs);
            this.pending.set(field, { timer, resolve, reject });
        });
    }
    failAllPending(err) {
        for (const [field, p] of this.pending.entries()) {
            clearTimeout(p.timer);
            try {
                p.reject(err);
            }
            catch {
                // ignore
            }
            this.pending.delete(field);
        }
    }
    // ------------------------
    // Validation / helpers
    // ------------------------
    validateAndConvert(shortId, val) {
        const asInt = (v, label) => {
            const n = Number(v);
            if (!Number.isFinite(n) || !Number.isInteger(n))
                throw new Error(`${label}: must be an integer`);
            return n;
        };
        const inRange = (n, min, max, label) => {
            if (n < min || n > max)
                throw new Error(`${label}: ${n} out of range (${min}..${max})`);
        };
        if (shortId === "config.system_discharge_limit") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.MIN_DISCHARGE_SOC_MIN, constants_1.Limits.MIN_DISCHARGE_SOC_MAX, shortId);
            return n;
        }
        if (shortId === "config.system_charge_limit") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.MAX_CHARGE_SOC_MIN, constants_1.Limits.MAX_CHARGE_SOC_MAX, shortId);
            return n;
        }
        if (shortId === "config.home_discharge_cutoff") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.HOME_APPLIANCE_MIN_SOC_MIN, constants_1.Limits.HOME_APPLIANCE_MIN_SOC_MAX, shortId);
            return n;
        }
        if (shortId === "config.car_discharge_cutoff") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.EV_CHARGING_MIN_SOC_MIN, constants_1.Limits.EV_CHARGING_MIN_SOC_MAX, shortId);
            return n;
        }
        if (shortId === "config.battery_charge_cutoff") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.CHARGING_MAX_SOC_MIN, constants_1.Limits.CHARGING_MAX_SOC_MAX, shortId);
            return n;
        }
        if (shortId === "config.system_charging_power") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.SYSTEM_CHARGING_POWER_MIN, constants_1.Limits.SYSTEM_CHARGING_POWER_MAX, shortId);
            return n;
        }
        if (shortId === "config.idle_shutdown_time") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.NO_IO_SHUTDOWN_TIMEOUT_MIN, constants_1.Limits.NO_IO_SHUTDOWN_TIMEOUT_MAX, shortId);
            return n;
        }
        if (shortId === "config.low_battery_shutdown_time") {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.DOD_SHUTDOWN_TIMEOUT_MIN, constants_1.Limits.DOD_SHUTDOWN_TIMEOUT_MAX, shortId);
            return n;
        }
        // booleans (modes.*)
        return !!val ? 1 : 0;
    }
    sanitizeNumber(value, def, min, max) {
        const n = Number(value);
        if (!Number.isFinite(n))
            return def;
        return Math.min(max, Math.max(min, n));
    }
    errToString(e) {
        if (e instanceof Error)
            return e.message;
        try {
            return JSON.stringify(e);
        }
        catch {
            return String(e);
        }
    }
}
if (module.parent) {
    module.exports = (options) => new SunenergyxtAdapter(options);
}
else {
    // eslint-disable-next-line no-new
    new SunenergyxtAdapter();
}
