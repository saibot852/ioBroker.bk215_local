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
const constants_1 = require("./constants");
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
        this.connectTimer = null;
        this.isClosing = false;
        this.hasConnectedOnce = false;
        this.callbacks = callbacks;
    }
    /**
     * Returns true if socket is really connected.
     *
     * @returns True if connected, false otherwise
     */
    isConnected() {
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
    connect(host, port, timeoutMs) {
        this.destroy();
        const sock = new net_1.default.Socket();
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
            const parsed = (0, parser_1.parseJsonStream)(this.rx);
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
    sendHandshake() {
        this.sendMessage({
            code: constants_1.MessageCode.DATA_REPORT,
            data: {},
        }, true);
    }
    /**
     * Send a command payload.
     *
     * @param data - Field/value map to send to the device
     */
    sendCommand(data) {
        this.sendMessage({
            code: constants_1.MessageCode.COMMAND_SET,
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
        if (!this.socket || this.socket.destroyed || this.socket.connecting) {
            return;
        }
        const payload = `${JSON.stringify(msg)}${crlf ? '\r\n' : ''}`;
        this.socket.write(payload, 'utf8');
    }
    /**
     * Destroy socket and clear timers.
     */
    destroy() {
        this.isClosing = true;
        this.clearConnectTimer();
        this.rx = '';
        if (this.socket) {
            const sock = this.socket;
            this.socket = null;
            try {
                sock.removeAllListeners();
            }
            catch {
                // ignore
            }
            try {
                sock.end();
            }
            catch {
                // ignore
            }
            try {
                sock.destroy();
            }
            catch {
                // ignore
            }
        }
    }
    safeEmitError(err) {
        if (!this.isClosing) {
            this.callbacks.onError?.(err);
        }
    }
    safeCloseSocket(sock) {
        try {
            sock.end();
        }
        catch {
            // ignore
        }
        try {
            sock.destroy();
        }
        catch {
            // ignore
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
    return (code === constants_1.MessageCode.DATA_REPORT || code === 0x6055 || code === constants_1.MessageCode.DATA_REPORT_ALT || code === 0x6060);
}
