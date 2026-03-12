"use strict";
/**
 * ioBroker.bk215_local - src/main.ts
 *
 * Adapter for bk215_local/BK215 TCP JSON protocol.
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
const tcpClient_1 = require("./protocol/tcpClient");
const constants_1 = require("./protocol/constants");
const mapping_1 = require("./protocol/mapping");
const parser_1 = require("./protocol/parser");
class bk215_localAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'bk215_local',
        });
        this.tcp = null;
        this.deviceHost = '';
        this.devicePort = constants_1.DEFAULT_PORT;
        this.timeoutMs = Math.floor(constants_1.DEFAULT_TIMEOUT_SEC * 1000);
        this.cfgReadOnly = false;
        this.cfgDebug = false;
        this.pending = new Map();
        this.reconnectDelayMs = 5000;
        this.reconnectTimer = null;
        this.connectInProgress = false;
        this.isShuttingDown = false;
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    async onReady() {
        const cfg = this.config;
        this.deviceHost = String(cfg.host || '').trim();
        this.devicePort = this.sanitizeNumber(cfg.port, constants_1.DEFAULT_PORT, 1, 65535);
        this.timeoutMs = this.sanitizeNumber(cfg.timeout, Math.floor(constants_1.DEFAULT_TIMEOUT_SEC * 1000), 500, 600000);
        this.cfgReadOnly = !!cfg.readOnly;
        this.cfgDebug = !!cfg.debug;
        this.isShuttingDown = false;
        await (0, objects_1.ensureObjects)(this);
        await this.safeSetState('info.connection', false);
        await this.safeSetState('info.lastError', '');
        await this.safeSetState('info.readOnly', this.cfgReadOnly);
        await this.safeSetState('info.lastUpdate', 0);
        if (this.deviceHost) {
            await this.safeSetState('info.endpoint', `${this.deviceHost}:${this.devicePort}`);
        }
        else {
            await this.safeSetState('info.endpoint', 'Kein Host konfiguriert');
        }
        if (!this.deviceHost) {
            this.log.error('Kein Host konfiguriert. Bitte Geräte-IP (host) in der Instanz setzen.');
            return;
        }
        this.subscribeStates('config.*');
        this.subscribeStates('modes.*');
        this.reconnectDelayMs = 5000;
        this.clearReconnectTimer();
        this.createTcpClient();
        this.connectTcp();
        this.log.info(`bk215_local TCP Adapter gestartet (${this.deviceHost}:${this.devicePort}).`);
    }
    createTcpClient() {
        try {
            this.tcp?.destroy();
        }
        catch {
            // ignore
        }
        this.tcp = new tcpClient_1.bk215_localTcpClient({
            onConnect: () => {
                this.connectInProgress = false;
                void this.onTcpConnected();
            },
            onClose: () => {
                this.connectInProgress = false;
                void this.onTcpDisconnected('TCP connection closed');
                this.scheduleReconnect();
            },
            onError: err => {
                this.connectInProgress = false;
                void this.onTcpDisconnected(`Socket error: ${err.message}`);
                this.scheduleReconnect();
            },
            onMessage: (msg) => {
                void this.handleDeviceMessage(msg);
            },
        });
    }
    connectTcp() {
        if (this.isShuttingDown) {
            return;
        }
        if (!this.tcp || this.connectInProgress) {
            return;
        }
        if (this.tcp.isConnected()) {
            return;
        }
        this.connectInProgress = true;
        try {
            this.tcp.connect(this.deviceHost, this.devicePort, this.timeoutMs);
        }
        catch (e) {
            this.connectInProgress = false;
            void this.onTcpDisconnected(`Connect failed: ${this.errToString(e)}`);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.isShuttingDown) {
            return;
        }
        if (!this.deviceHost) {
            return;
        }
        if (this.reconnectTimer) {
            return;
        }
        const delay = this.reconnectDelayMs;
        this.reconnectDelayMs = Math.min(60000, Math.floor(this.reconnectDelayMs * 1.5));
        if (this.cfgDebug) {
            this.log.debug(`Reconnect scheduled in ${delay}ms`);
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.isShuttingDown) {
                return;
            }
            if (this.cfgDebug) {
                this.log.debug('Reconnect attempt started');
            }
            this.createTcpClient();
            this.connectTcp();
        }, delay);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    async onTcpConnected() {
        this.clearReconnectTimer();
        this.reconnectDelayMs = 5000;
        await this.safeSetState('info.connection', true);
        await this.safeSetState('info.endpoint', `${this.deviceHost}:${this.devicePort}`);
        await this.safeSetState('info.lastError', '');
        this.log.info('TCP connected.');
    }
    async onTcpDisconnected(reason) {
        await this.safeSetState('info.connection', false);
        await this.safeSetState('info.endpoint', 'Keine Verbindung');
        await this.safeSetState('info.lastError', reason);
        this.failAllPending(new Error(reason));
        this.log.warn(`TCP disconnected: ${reason}`);
    }
    onUnload(callback) {
        try {
            this.isShuttingDown = true;
            this.connectInProgress = false;
            this.clearReconnectTimer();
            this.failAllPending(new Error('Adapter unloading'));
            try {
                this.tcp?.destroy();
            }
            catch {
                // ignore
            }
            this.tcp = null;
            callback();
        }
        catch {
            callback();
        }
    }
    async handleDeviceMessage(msg) {
        if (this.cfgDebug) {
            await this.safeSetState('status.raw_message', JSON.stringify(msg));
            this.log.info(JSON.stringify(msg));
        }
        if ((0, tcpClient_1.isAck)(msg.code)) {
            await this.handleAckMessage(msg);
            return;
        }
        if (msg.code === constants_1.MessageCode.DATA_REPORT ||
            msg.code === constants_1.MessageCode.DATA_REPORT_ALT ||
            msg.code === constants_1.MessageCode.DATA_REPORT_EXT) {
            await this.handleDataReport(msg);
            return;
        }
        if (this.cfgDebug) {
            this.log.debug(`Unknown message code: ${msg.code}`);
        }
    }
    async handleAckMessage(msg) {
        const data = msg.data || {};
        // handshake ACK: {"code":0,"data":{}}
        if (!Object.keys(data).length) {
            if (this.cfgDebug) {
                this.log.debug('Handshake ACK received.');
            }
            return;
        }
        // command ACK: {"code":0x6040,"data":{"tXXX":0}}
        for (const [field, rcRaw] of Object.entries(data)) {
            const p = this.pending.get(field);
            if (!p) {
                continue;
            }
            clearTimeout(p.timer);
            this.pending.delete(field);
            const rc = Number(rcRaw);
            if (rc === constants_1.RESPONSE_SUCCESS) {
                p.resolve();
            }
            else {
                p.reject(new Error(`Device rejected ${field}, rc=${String(rcRaw)}`));
            }
        }
    }
    async handleDataReport(msg) {
        const updates = (0, parser_1.extractStateUpdates)(msg);
        for (const update of updates) {
            await this.safeSetState(update.stateId, update.value);
        }
        await this.safeSetState('info.lastUpdate', Date.now());
        await this.safeSetState('info.lastError', '');
    }
    async onStateChange(id, state) {
        if (!state || state.ack) {
            return;
        }
        if (this.cfgReadOnly) {
            this.log.warn(`Read-only aktiv: ignoriere write auf ${id}`);
            return;
        }
        if (!this.tcp || !this.tcp.isConnected()) {
            this.log.warn(`Nicht verbunden: ignoriere write auf ${id}`);
            return;
        }
        const shortId = id.replace(`${this.namespace}.`, '');
        const field = mapping_1.WRITE_FIELD_MAP[shortId];
        if (!field) {
            return;
        }
        try {
            const valueToSend = this.validateAndConvert(shortId, state.val);
            await this.sendSetField(field, valueToSend);
        }
        catch (e) {
            const msg = this.errToString(e);
            await this.safeSetState('info.lastError', msg);
            this.log.warn(`Write failed (${shortId}): ${msg}`);
        }
    }
    async sendSetField(field, value) {
        this.tcp?.sendCommand({
            [field]: value,
        });
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(field);
                reject(new Error(`Command timeout for ${field}`));
            }, this.timeoutMs);
            this.pending.set(field, {
                timer,
                resolve,
                reject,
            });
        });
    }
    failAllPending(err) {
        for (const [field, p] of this.pending.entries()) {
            clearTimeout(p.timer);
            p.reject(err);
            this.pending.delete(field);
        }
    }
    validateAndConvert(shortId, val) {
        const asInt = (v, label) => {
            const n = Number(v);
            if (!Number.isFinite(n) || !Number.isInteger(n)) {
                throw new Error(`${label}: must be an integer`);
            }
            return n;
        };
        const inRange = (n, min, max, label) => {
            if (n < min || n > max) {
                throw new Error(`${label}: ${n} out of range (${min}..${max})`);
            }
        };
        if (shortId === 'config.system_discharge_limit') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.MIN_DISCHARGE_SOC_MIN, constants_1.Limits.MIN_DISCHARGE_SOC_MAX, shortId);
            return n;
        }
        if (shortId === 'config.system_charge_limit') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.MAX_CHARGE_SOC_MIN, constants_1.Limits.MAX_CHARGE_SOC_MAX, shortId);
            return n;
        }
        if (shortId === 'config.home_discharge_cutoff') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.HOME_APPLIANCE_MIN_SOC_MIN, constants_1.Limits.HOME_APPLIANCE_MIN_SOC_MAX, shortId);
            return n;
        }
        if (shortId === 'config.car_discharge_cutoff') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.EV_CHARGING_MIN_SOC_MIN, constants_1.Limits.EV_CHARGING_MIN_SOC_MAX, shortId);
            return n;
        }
        if (shortId === 'config.battery_charge_cutoff') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.CHARGING_MAX_SOC_MIN, constants_1.Limits.CHARGING_MAX_SOC_MAX, shortId);
            return n;
        }
        if (shortId === 'config.system_charging_power') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.SYSTEM_CHARGING_POWER_MIN, constants_1.Limits.SYSTEM_CHARGING_POWER_MAX, shortId);
            return n;
        }
        if (shortId === 'config.idle_shutdown_time') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.NO_IO_SHUTDOWN_TIMEOUT_MIN, constants_1.Limits.NO_IO_SHUTDOWN_TIMEOUT_MAX, shortId);
            return n;
        }
        if (shortId === 'config.low_battery_shutdown_time') {
            const n = asInt(val, shortId);
            inRange(n, constants_1.Limits.DOD_SHUTDOWN_TIMEOUT_MIN, constants_1.Limits.DOD_SHUTDOWN_TIMEOUT_MAX, shortId);
            return n;
        }
        // booleans (modes.*)
        return val ? 1 : 0;
    }
    sanitizeNumber(value, def, min, max) {
        const n = Number(value);
        if (!Number.isFinite(n)) {
            return def;
        }
        return Math.min(max, Math.max(min, n));
    }
    errToString(e) {
        if (e instanceof Error) {
            return e.message;
        }
        try {
            return JSON.stringify(e);
        }
        catch {
            return String(e);
        }
    }
    async safeSetState(id, val) {
        try {
            await this.setStateAsync(id, {
                val,
                ack: true,
            });
        }
        catch (e) {
            if (this.cfgDebug) {
                this.log.debug(`setState failed for ${id}: ${this.errToString(e)}`);
            }
        }
    }
}
if (module.parent) {
    module.exports = (options) => new bk215_localAdapter(options);
}
else {
    new bk215_localAdapter();
}
