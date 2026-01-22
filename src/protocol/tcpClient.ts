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

	// connect-timeout only (separate from idle timeout!)
	private connectTimer: NodeJS.Timeout | null = null;

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
	 * timeoutMs is used as CONNECT timeout, not as idle timeout.
	 *
	 * @param host - Device IP/hostname
	 * @param port - Device TCP port
	 * @param timeoutMs - Socket timeout in milliseconds
	 */
	public connect(host: string, port: number, timeoutMs: number): void {
		this.destroy();

		const sock = new net.Socket();
		this.socket = sock;

		sock.setNoDelay(true);
		sock.setTimeout(timeoutMs);

		sock.on('connect', () => {
			if (this.callbacks.onConnect) {
				this.callbacks.onConnect();
			}

			this.sendMessage(
				{
					code: 0x6052,
					data: {},
				},
				true,
			);
		});

		sock.on('data', buf => {
			this.rx += buf.toString('ascii');

			const parsed = parseJsonStream(this.rx);
			this.rx = parsed.rest;

			for (const msg of parsed.messages) {
				if (this.callbacks.onMessage) {
					this.callbacks.onMessage(msg);
				}
			}
		});

		sock.on('timeout', () => {
			// ignore (idle)
		});

		sock.on('close', () => {
			this.socket = null;

			if (this.callbacks.onClose) {
				this.callbacks.onClose();
			}
		});

		sock.on('error', err => {
			if (this.callbacks.onError) {
				this.callbacks.onError(err);
			}
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
	 * @param timeoutMs - Socket timeout in milliseconds
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
		this.clearConnectTimer();
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
	}

	private clearReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private clearConnectTimer(): void {
		if (this.connectTimer) {
			clearTimeout(this.connectTimer);
			this.connectTimer = null;
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
 * Data report codes seen are 0x6052 and 0x6055.
 *
 * @param code - Message code from device
 * @returns True if data report, otherwise false
 */
export function isDataReport(code: number): boolean {
	return code === 0x6052 || code === 0x6055;
}
