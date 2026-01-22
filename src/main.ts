/**
 * ioBroker.bk215_local - src/main.ts
 *
 * Adapter for bk215_local/BK215 TCP JSON protocol.
 */

import * as utils from '@iobroker/adapter-core';
import { ensureObjects } from './iobroker/objects';
import { applyDataReport } from './iobroker/applyData';
import { bk215_localTcpClient, isAck, isDataReport } from './protocol/tcpClient';
import { DEFAULT_PORT, DEFAULT_TIMEOUT_SEC, RESPONSE_SUCCESS, Limits, type DeviceMessage } from './protocol/constants';
import { WRITE_FIELD_MAP } from './protocol/mapping';

type PendingCmd = {
	timer: ReturnType<typeof setTimeout>;
	resolve: () => void;
	reject: (e: Error) => void;
};

class bk215_localAdapter extends utils.Adapter {
	private tcp: bk215_localTcpClient | null = null;

	private deviceHost = '';
	private devicePort = DEFAULT_PORT;
	private timeoutMs = Math.floor(DEFAULT_TIMEOUT_SEC * 1000);
	private cfgReadOnly = false;
	private cfgDebug = false;

	private pending = new Map<string, PendingCmd>();

	private reconnectDelayMs = 5000;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'bk215_local',
		});

		this.on('ready', this.onReady.bind(this));
		(this as any).on('stateChange', this.onStateChange.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	private async onReady(): Promise<void> {
		const cfg = this.config as any;

		this.deviceHost = String(cfg.host || '').trim();
		this.devicePort = this.sanitizeNumber(cfg.port, DEFAULT_PORT, 1, 65535);
		this.timeoutMs = this.sanitizeNumber(cfg.timeout, Math.floor(DEFAULT_TIMEOUT_SEC * 1000), 500, 600000);
		this.cfgReadOnly = !!cfg.readOnly;
		this.cfgDebug = !!cfg.debug;

		await ensureObjects(this);

		// Standard ioBroker connection flag (ampel/rot-gruen)
		await this.safeSetState('info.connection', false);
		await this.safeSetState('info.lastError', '');
		await this.safeSetState('info.readOnly', this.cfgReadOnly);
		await this.safeSetState('info.lastUpdate', 0);

		if (this.deviceHost) {
			await this.safeSetState('info.endpoint', `${this.deviceHost}:${this.devicePort}`);
		} else {
			await this.safeSetState('info.endpoint', 'Kein Host konfiguriert');
		}

		if (!this.deviceHost) {
			this.log.error('Kein Host konfiguriert. Bitte Geräte-IP (host) in der Instanz setzen.');
			return;
		}

		this.subscribeStates('config.*');
		this.subscribeStates('modes.*');

		this.reconnectDelayMs = 5000;

		this.tcp = new bk215_localTcpClient({
			onConnect: () => {
				void this.onTcpConnected();
			},
			onClose: () => {
				void this.onTcpDisconnected('TCP connection closed');
				this.scheduleReconnect();
			},
			onError: err => {
				void this.onTcpDisconnected(`Socket error: ${err.message}`);
				this.scheduleReconnect();
			},
			onMessage: (msg: DeviceMessage) => {
				void this.handleDeviceMessage(msg);
			},
		});

		this.tcp.connect(this.deviceHost, this.devicePort, this.timeoutMs);

		this.log.info(`bk215_local TCP Adapter gestartet (${this.deviceHost}:${this.devicePort}).`);
	}

	private scheduleReconnect(): void {
		if (!this.tcp) {
			return;
		}

		// Backoff bis max 60s (verhindert "Schutz/Rate-Limit" am Gerät)
		const delay = this.reconnectDelayMs;
		this.reconnectDelayMs = Math.min(60000, Math.floor(this.reconnectDelayMs * 1.5));

		if (this.cfgDebug) {
			this.log.debug(`Reconnect scheduled in ${delay}ms`);
		}

		this.tcp.scheduleReconnect(this.deviceHost, this.devicePort, this.timeoutMs, delay);
	}

	private async onTcpConnected(): Promise<void> {
		// Reset Backoff bei Erfolg
		this.reconnectDelayMs = 5000;

		await this.safeSetState('info.connection', true);
		await this.safeSetState('info.endpoint', `${this.deviceHost}:${this.devicePort}`);
		await this.safeSetState('info.lastError', '');

		this.log.info('TCP connected.');
	}

	private async onTcpDisconnected(reason: string): Promise<void> {
		// Das ist der entscheidende Teil: Ampel gelb/rot in Admin UI + Verbindung rot
		await this.safeSetState('info.connection', false);
		await this.safeSetState('info.endpoint', 'Keine Verbindung');
		await this.safeSetState('info.lastError', reason);

		this.failAllPending(new Error(reason));
		this.log.warn(`TCP disconnected: ${reason}`);
	}

	private onUnload(callback: () => void): void {
		try {
			this.failAllPending(new Error('Adapter unloading'));
			this.tcp?.destroy();
			this.tcp = null;
			callback();
		} catch {
			callback();
		}
	}

	private async handleDeviceMessage(msg: DeviceMessage): Promise<void> {
		if (this.cfgDebug) {
			await this.safeSetState('status.raw_message', JSON.stringify(msg));
			this.log.info(JSON.stringify(msg));
		}

		if (isAck(msg.code)) {
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
				if (rc === RESPONSE_SUCCESS) {
					p.resolve();
				} else {
					p.reject(new Error(`Device rejected ${field}, rc=${String(rcRaw)}`));
				}
			}
			return;
		}

		if (isDataReport(msg.code)) {
			await applyDataReport(this as any, msg.data || {});
			return;
		}

		if (this.cfgDebug) {
			this.log.debug(`Unknown message code: ${msg.code}`);
		}
	}

	private async onStateChange(id: string, state: ioBroker.State | null): Promise<void> {
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
		const field = WRITE_FIELD_MAP[shortId];
		if (!field) {
			return;
		}

		try {
			const valueToSend = this.validateAndConvert(shortId, state.val);
			await this.sendSetField(field, valueToSend);
		} catch (e) {
			const msg = this.errToString(e);
			await this.safeSetState('info.lastError', msg);
			this.log.warn(`Write failed (${shortId}): ${msg}`);
		}
	}

	private async sendSetField(field: string, value: number): Promise<void> {
		this.tcp?.sendCommand({
			[field]: value,
		});

		await new Promise<void>((resolve, reject) => {
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

	private failAllPending(err: Error): void {
		for (const [field, p] of this.pending.entries()) {
			clearTimeout(p.timer);
			p.reject(err);
			this.pending.delete(field);
		}
	}

	private validateAndConvert(shortId: string, val: any): number {
		const asInt = (v: any, label: string): number => {
			const n = Number(v);
			if (!Number.isFinite(n) || !Number.isInteger(n)) {
				throw new Error(`${label}: must be an integer`);
			}
			return n;
		};

		const inRange = (n: number, min: number, max: number, label: string): void => {
			if (n < min || n > max) {
				throw new Error(`${label}: ${n} out of range (${min}..${max})`);
			}
		};

		if (shortId === 'config.system_discharge_limit') {
			const n = asInt(val, shortId);
			inRange(n, Limits.MIN_DISCHARGE_SOC_MIN, Limits.MIN_DISCHARGE_SOC_MAX, shortId);
			return n;
		}
		if (shortId === 'config.system_charge_limit') {
			const n = asInt(val, shortId);
			inRange(n, Limits.MAX_CHARGE_SOC_MIN, Limits.MAX_CHARGE_SOC_MAX, shortId);
			return n;
		}
		if (shortId === 'config.home_discharge_cutoff') {
			const n = asInt(val, shortId);
			inRange(n, Limits.HOME_APPLIANCE_MIN_SOC_MIN, Limits.HOME_APPLIANCE_MIN_SOC_MAX, shortId);
			return n;
		}
		if (shortId === 'config.car_discharge_cutoff') {
			const n = asInt(val, shortId);
			inRange(n, Limits.EV_CHARGING_MIN_SOC_MIN, Limits.EV_CHARGING_MIN_SOC_MAX, shortId);
			return n;
		}
		if (shortId === 'config.battery_charge_cutoff') {
			const n = asInt(val, shortId);
			inRange(n, Limits.CHARGING_MAX_SOC_MIN, Limits.CHARGING_MAX_SOC_MAX, shortId);
			return n;
		}
		if (shortId === 'config.system_charging_power') {
			const n = asInt(val, shortId);
			inRange(n, Limits.SYSTEM_CHARGING_POWER_MIN, Limits.SYSTEM_CHARGING_POWER_MAX, shortId);
			return n;
		}
		if (shortId === 'config.idle_shutdown_time') {
			const n = asInt(val, shortId);
			inRange(n, Limits.NO_IO_SHUTDOWN_TIMEOUT_MIN, Limits.NO_IO_SHUTDOWN_TIMEOUT_MAX, shortId);
			return n;
		}
		if (shortId === 'config.low_battery_shutdown_time') {
			const n = asInt(val, shortId);
			inRange(n, Limits.DOD_SHUTDOWN_TIMEOUT_MIN, Limits.DOD_SHUTDOWN_TIMEOUT_MAX, shortId);
			return n;
		}

		// booleans (modes.*)
		return val ? 1 : 0;
	}

	private sanitizeNumber(value: any, def: number, min: number, max: number): number {
		const n = Number(value);
		if (!Number.isFinite(n)) {
			return def;
		}
		return Math.min(max, Math.max(min, n));
	}

	private errToString(e: unknown): string {
		if (e instanceof Error) {
			return e.message;
		}
		try {
			return JSON.stringify(e);
		} catch {
			return String(e);
		}
	}

	private async safeSetState(id: string, val: any): Promise<void> {
		try {
			await this.setStateAsync(id, {
				val,
				ack: true,
			});
		} catch (e) {
			if (this.cfgDebug) {
				this.log.debug(`setState failed for ${id}: ${this.errToString(e)}`);
			}
		}
	}
}

if (module.parent) {
	module.exports = (options: Partial<utils.AdapterOptions>) => new bk215_localAdapter(options);
} else {
	new bk215_localAdapter();
}
