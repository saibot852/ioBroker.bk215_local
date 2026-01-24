/**
 * ioBroker.bk215_local - src/protocol/tcpClient.ts
 *
 * TCP client for bk215_local/BK215 JSON protocol.
 * - Connects via net.Socket
 * - Sends handshake on connect: {"code":0x6052,"data":{}} + CRLF
 * - Parses incoming stream as concatenated JSON objects (no newline framing)
 */

import net from 'net';
import type { DeviceMessage } from './constants';
import { parseJsonStream } from './parser';

/**
 * Callbacks for TCP client events.
 */
export type TcpClientCallbacks = {
	/**
	 * Called when TCP connection is established.
	 */
	onConnect?: () => void;

	/**
	 * Called when TCP connection closes.
	 */
	onClose?: () => void;

	/**
	 * Called on socket error.
	 *
	 * @param err - The underlying socket error
	 */
	onError?: (err: Error) => void;

	/**
	 * Called for each parsed device message.
	 *
	 * @param msg - Parsed message from device
	 */
	onMessage?: (msg: DeviceMessage) => void;
};

/**
 * TCP client implementation for BK215 local protocol.
 */
export class bk215_localTcpClient {
	private socket: net.Socket | null = null;

	private rx = '';

	private reconnectTimer: NodeJS.Timeout | null = null;

	private callbacks: TcpClientCallbacks;

	private lastRxTs = 0;

	private watchdog: NodeJS.Timeout | null = null;

	/**
	 * Create a new TCP client.
	 *
	 * @param callbacks - Optional event callbacks
	 */
	public constructor(callbacks: TcpClientCallbacks = {}) {
		this.callbacks = callbacks;
	}

	/**
	 * Returns true if socket is connected.
	 *
	 * @returns True if connected, false otherwise
	 */
	public isConnected(): boolean {
		return !!this.socket && !this.socket.destroyed;
	}

	/**
	 * Connect to device.
	 *
	 * @param host - Device IP/hostname
	 * @param port - Device TCP port
	 * @param timeoutMs - Connection/idle timeout in milliseconds (used as baseline)
	 */
	public connect(host: string, port: number, timeoutMs: number): void {
		this.destroy();

		const sock = new net.Socket();
		this.socket = sock;

		sock.setNoDelay(true);
		sock.setKeepAlive(true, 30_000);

		// Idle timeout (wenn lange keine Daten kommen -> offline/reconnect)
		// Wir nehmen max(60s, timeoutMs) damit kleine timeouts nicht zu aggressiv sind.
		const idleTimeoutMs = Math.max(60_000, timeoutMs);
		sock.setTimeout(idleTimeoutMs);

		this.lastRxTs = Date.now();
		this.startWatchdog(idleTimeoutMs + 5_000);

		sock.on('connect', () => {
			this.callbacks.onConnect?.();
			this.sendHandshake();
		});

		sock.on('data', buf => {
			this.lastRxTs = Date.now();
			this.rx += buf.toString('ascii');

			const parsed = parseJsonStream(this.rx);
			this.rx = parsed.rest;

			for (const msg of parsed.messages) {
				this.callbacks.onMessage?.(msg);
			}
		});

		// Wenn wirklich lange nix kommt → Verbindung killen, damit Adapter reconnect triggert
		sock.on('timeout', () => {
			this.callbacks.onError?.(new Error('Socket idle timeout'));
			try {
				sock.destroy(new Error('Socket idle timeout'));
			} catch {
				// ignore
			}
		});

		sock.on('close', () => {
			this.stopWatchdog();
			this.socket = null;
			this.callbacks.onClose?.();
		});

		sock.on('error', err => {
			this.callbacks.onError?.(err);
		});

		sock.connect(port, host);
	}

	/**
	 * Send a handshake packet.
	 */
	public sendHandshake(): void {
		this.sendMessage(
			{
				code: 0x6052,
				data: {},
			},
			true,
		);
	}

	/**
	 * Send a command payload (0x6056).
	 *
	 * @param data - Field/value map to send to the device
	 */
	public sendCommand(data: Record<string, any>): void {
		this.sendMessage(
			{
				code: 0x6056,
				data,
			},
			false,
		);
	}

	/**
	 * Send any message to device.
	 *
	 * @param msg - Message object to send
	 * @param crlf - Append CRLF after JSON payload
	 */
	public sendMessage(msg: DeviceMessage, crlf: boolean): void {
		if (!this.socket || this.socket.destroyed) {
			return;
		}

		const payload = `${JSON.stringify(msg)}${crlf ? '\r\n' : ''}`;
		this.socket.write(payload, 'ascii');
	}

	/**
	 * Schedule reconnect attempt.
	 *
	 * @param host - Device IP/hostname
	 * @param port - Device TCP port
	 * @param timeoutMs - Timeout in milliseconds
	 * @param delayMs - Delay before reconnect attempt (ms)
	 */
	public scheduleReconnect(host: string, port: number, timeoutMs: number, delayMs = 5000): void {
		this.clearReconnect();

		this.reconnectTimer = setTimeout(() => {
			this.connect(host, port, timeoutMs);
		}, delayMs);
	}

	/**
	 * Destroy socket and clear timers.
	 */
	public destroy(): void {
		this.clearReconnect();
		this.rx = '';

		if (this.socket) {
			this.socket.removeAllListeners();
			try {
				this.socket.destroy();
			} catch {
				// ignore
			}
			this.socket = null;
		}

		this.stopWatchdog();
	}

	private clearReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private startWatchdog(maxIdleMs: number): void {
		this.stopWatchdog();

		this.watchdog = setInterval(() => {
			const sock = this.socket;
			if (!sock || sock.destroyed) {
				return;
			}

			const idle = Date.now() - this.lastRxTs;
			if (idle > maxIdleMs) {
				this.callbacks.onError?.(new Error(`No RX for ${idle}ms -> reconnect`));
				try {
					sock.destroy(new Error('RX watchdog timeout'));
				} catch {
					// ignore
				}
			}
		}, 5_000);
	}

	private stopWatchdog(): void {
		if (this.watchdog) {
			clearInterval(this.watchdog);
			this.watchdog = null;
		}
	}
}

/**
 * Check whether a message code represents an ACK message.
 * ACK codes are 0 (handshake ack) and 0x6057 (response ack).
 *
 * @param code - Message code from device
 * @returns True if ACK, otherwise false
 */
export function isAck(code: number): boolean {
	return code === 0 || code === 0x6057;
}

/**
 * Check whether a message code represents a data report.
 * Data report codes seen are 0x6052, 0x6053 and 0x6055.
 *
 * @param code - Message code from device
 * @returns True if data report, otherwise false
 */
export function isDataReport(code: number): boolean {
	return code === 0x6052 || code === 0x6053 || code === 0x6055;
}
