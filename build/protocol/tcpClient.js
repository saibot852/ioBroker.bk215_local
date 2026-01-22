"use strict";
/**
 * ioBroker.bk215_local - src/protocol/tcpClient.ts
 *
 * TCP client for bk215_local/BK215 JSON protocol.
 * - Connects via net.Socket
 * - Sends handshake on connect: {"code":0x6052,"data":{}} + CRLF
 * - Parses incoming stream as concatenated JSON objects (no newline framing)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bk215_localTcpClient = void 0;
exports.isAck = isAck;
exports.isDataReport = isDataReport;
const net_1 = __importDefault(require("net"));
const parser_1 = require("./parser");
/**
 * TCP client implementation for BK215 local protocol.
 */
class bk215_localTcpClient {
    /**
     * Create a new TCP client.
     *
     * @param callbacks - Optional event callbacks
     */
    constructor(callbacks = {}) {
        this.socket = null;
        this.rx = '';
        this.reconnectTimer = null;
        // connect-timeout only (separate from idle timeout!)
        this.connectTimer = null;
        this.callbacks = callbacks;
    }
    /**
     * Returns true if socket is connected.
     *
     * @returns True if connected, false otherwise
     */
    isConnected() {
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
    connect(host, port, timeoutMs) {
        this.destroy();
        const sock = new net_1.default.Socket();
        this.socket = sock;
        sock.setNoDelay(true);
        sock.setTimeout(timeoutMs);
        sock.on('connect', () => {
            if (this.callbacks.onConnect) {
                this.callbacks.onConnect();
            }
            this.sendMessage({
                code: 0x6052,
                data: {},
            }, true);
        });
        sock.on('data', buf => {
            this.rx += buf.toString('ascii');
            const parsed = (0, parser_1.parseJsonStream)(this.rx);
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
    sendHandshake() {
        this.sendMessage({
            code: 0x6052,
            data: {},
        }, true);
    }
    /**
     * Send a command payload (0x6056).
     *
     * @param data - Field/value map to send to the device
     */
    sendCommand(data) {
        this.sendMessage({
            code: 0x6056,
            data,
        }, false);
    }
    /**
     * Send any message to device.
     *
     * @param msg - Message object to send
     * @param crlf - Append CRLF after JSON payload
     */
    sendMessage(msg, crlf) {
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
    scheduleReconnect(host, port, timeoutMs, delayMs = 5000) {
        this.clearReconnect();
        this.reconnectTimer = setTimeout(() => {
            this.connect(host, port, timeoutMs);
        }, delayMs);
    }
    /**
     * Destroy socket and clear timers.
     */
    destroy() {
        this.clearReconnect();
        this.clearConnectTimer();
        this.rx = '';
        if (this.socket) {
            this.socket.removeAllListeners();
            try {
                this.socket.destroy();
            }
            catch {
                // ignore
            }
            this.socket = null;
        }
    }
    clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    clearConnectTimer() {
        if (this.connectTimer) {
            clearTimeout(this.connectTimer);
            this.connectTimer = null;
        }
    }
}
exports.bk215_localTcpClient = bk215_localTcpClient;
/**
 * Check whether a message code represents an ACK message.
 * ACK codes are 0 (handshake ack) and 0x6057 (response ack).
 *
 * @param code - Message code from device
 * @returns True if ACK, otherwise false
 */
function isAck(code) {
    return code === 0 || code === 0x6057;
}
/**
 * Check whether a message code represents a data report.
 * Data report codes seen are 0x6052 and 0x6055.
 *
 * @param code - Message code from device
 * @returns True if data report, otherwise false
 */
function isDataReport(code) {
    return code === 0x6052 || code === 0x6055;
}
