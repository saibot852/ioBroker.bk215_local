"use strict";
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
exports.SunEnergyXTTcpClient = void 0;
exports.isDataReport = isDataReport;
exports.isAck = isAck;
const net = __importStar(require("net"));
const constants_1 = require("./constants");
const parser_1 = require("./parser");
class SunEnergyXTTcpClient {
    constructor(cb) {
        this.cb = cb;
        this.socket = null;
        this.rx = "";
        this.connected = false;
        this.reconnectTimer = null;
        this.backoffMs = 2000;
    }
    isConnected() {
        return this.connected;
    }
    sendHandshake() {
        if (!this.socket || this.socket.destroyed)
            return;
        // Handshake wie in Python: {"code":DATA_REPORT,"data":{}} + "\r\n"
        const payload = JSON.stringify({ code: 0x6052, data: {} }) + "\r\n";
        this.socket.write(payload, "ascii");
    }
    connect(host, port, timeoutMs) {
        this.destroy();
        const sock = new net.Socket();
        this.socket = sock;
        sock.setNoDelay(true);
        sock.setTimeout(timeoutMs);
        sock.on("connect", () => {
            this.connected = true;
            this.backoffMs = 2000;
            this.cb.onConnect();
            // Handshake MUST have CRLF (like python)
            this.send({ code: constants_1.CODE_DATA_REPORT, data: {} }, true);
        });
        sock.on("data", (buf) => {
            // Device behaves like: 1 JSON per read, often without newline.
            this.rx += buf.toString("ascii");
            const { messages, rest } = (0, parser_1.extractJsonObjects)(this.rx);
            this.rx = rest;
            for (const m of messages)
                this.cb.onMessage(m);
        });
        sock.on("timeout", () => {
            // ignore - idle
        });
        sock.on("close", () => {
            this.connected = false;
            this.cb.onClose();
        });
        sock.on("error", (err) => {
            this.cb.onError(err);
        });
        sock.connect(port, host);
    }
    scheduleReconnect(host, port, timeoutMs) {
        if (this.reconnectTimer)
            return;
        const delay = this.backoffMs;
        this.backoffMs = Math.min(60000, Math.floor(this.backoffMs * 1.6));
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(host, port, timeoutMs);
        }, delay);
    }
    sendCommand(data) {
        this.send({ code: constants_1.CODE_COMMAND_SET, data }, false);
    }
    send(msg, crlf) {
        if (!this.socket)
            return;
        const payload = JSON.stringify(msg) + (crlf ? "\r\n" : "");
        this.socket.write(payload, "ascii");
    }
    destroy() {
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.connected = false;
        this.rx = "";
        if (this.socket) {
            try {
                this.socket.removeAllListeners();
                this.socket.destroy();
            }
            catch {
                // ignore
            }
        }
        this.socket = null;
    }
}
exports.SunEnergyXTTcpClient = SunEnergyXTTcpClient;
// Helpers for callers:
function isDataReport(code) {
    return code === constants_1.CODE_DATA_REPORT || code === constants_1.CODE_DATA_REPORT_ALT;
}
function isAck(code) {
    return code === constants_1.CODE_RESPONSE_ACK || code === 0; // handshake ack is often code 0
}
