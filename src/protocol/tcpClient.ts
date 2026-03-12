/**
 * ioBroker.bk215_local - src/protocol/tcpClient.ts
 *
 * TCP client for bk215_local/BK215 JSON protocol.
 * - Connects via net.Socket
 * - Sends handshake on connect: {"code":0x6052,"data":{}} + CRLF
 * - Parses incoming stream as concatenated JSON objects (no newline framing)
 */

import net from 'net';
import { MessageCode, type DeviceMessage } from './constants';
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
	private callbacks: TcpClientCallbacks;
	private connectTimer: NodeJS.Timeout | null = null;
	private isClosing = false;
	private hasConnectedOnce = false;

	/**
	 * Create a new TCP client.
	 *
	 * @param callbacks - Optional event callbacks
	 */
	public constructor(callbacks: TcpClientCallbacks = {}) {
		this.callbacks = callbacks;
	}

	/**
	 * Returns true if socket is really connected.
	 *
	 * @returns True if connected, false otherwise
	 */
	public isConnected(): boolean {
		return !!this.socket && !this.socket.destroyed && this.socket.connecting === false;
	}

	/**
	 * Connect to device.
	 * timeoutMs is used as connect timeout, not as idle timeout.
	 *
	 * @param host - Device IP/hostname
	 * @param port - Device TCP port
	 * @param timeoutMs - Connect timeout in milliseconds
	 */
	public connect(host: string, port: number, timeoutMs: number): void {
		this.destroy();

		const sock = new net.Socket();
		this.socket = sock;
		this.rx = '';
		this.isClosing = false;
		this.hasConnectedOnce = false;

		sock.setNoDelay(true);

		this.connectTimer = setTimeout(() => {
			if (!this.hasConnectedOnce && this.socket === sock && !sock.destroyed) {
				this.safeEmitError(new Error(`Connect timeout after ${timeoutMs}ms`));
				this.safeCloseSocket(sock);
			}
		}, timeoutMs);

		sock.on('connect', () => {
			this.hasConnectedOnce = true;
			this.clearConnectTimer();

			this.callbacks.onConnect?.();

			this.sendHandshake();
		});

		sock.on('data', buf => {
			this.rx += buf.toString('utf8');

			const parsed = parseJsonStream(this.rx);
			this.rx = parsed.rest;

			for (const msg of parsed.messages) {
				this.callbacks.onMessage?.(msg);
			}
		});

		sock.on('timeout', () => {
			// no idle-timeout handling here
		});

		sock.on('close', () => {
			const wasActiveSocket = this.socket === sock;

			this.clearConnectTimer();
			if (wasActiveSocket) {
				this.socket = null;
			}
			this.rx = '';

			if (!this.isClosing) {
				this.callbacks.onClose?.();
			}
		});

		sock.on('error', err => {
			this.clearConnectTimer();
			this.safeEmitError(err);
		});

		sock.connect(port, host);
	}

	/**
	 * Send a handshake packet.
	 */
	public sendHandshake(): void {
		this.sendMessage(
			{
				code: MessageCode.DATA_REPORT,
				data: {},
			},
			true,
		);
	}

	/**
	 * Send a command payload.
	 *
	 * @param data - Field/value map to send to the device
	 */
	public sendCommand(data: Record<string, any>): void {
		this.sendMessage(
			{
				code: MessageCode.COMMAND_SET,
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
		if (!this.socket || this.socket.destroyed || this.socket.connecting) {
			return;
		}

		const payload = `${JSON.stringify(msg)}${crlf ? '\r\n' : ''}`;
		this.socket.write(payload, 'utf8');
	}

	/**
	 * Destroy socket and clear timers.
	 */
	public destroy(): void {
		this.isClosing = true;
		this.clearConnectTimer();
		this.rx = '';

		if (this.socket) {
			const sock = this.socket;
			this.socket = null;

			try {
				sock.removeAllListeners();
			} catch {
				// ignore
			}

			try {
				sock.end();
			} catch {
				// ignore
			}

			try {
				sock.destroy();
			} catch {
				// ignore
			}
		}
	}

	private safeEmitError(err: Error): void {
		if (!this.isClosing) {
			this.callbacks.onError?.(err);
		}
	}

	private safeCloseSocket(sock: net.Socket): void {
		try {
			sock.end();
		} catch {
			// ignore
		}

		try {
			sock.destroy();
		} catch {
			// ignore
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
	return code === MessageCode.DATA_REPORT || code === 0x6055 || code === MessageCode.DATA_REPORT_ALT || code === 0x6060;
}