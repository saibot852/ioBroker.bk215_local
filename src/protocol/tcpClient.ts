import * as net from "net";
import type { DeviceMessage } from "./constants";
import {
  CODE_DATA_REPORT,
  CODE_DATA_REPORT_ALT,
  CODE_COMMAND_SET,
  CODE_RESPONSE_ACK,
  DEFAULT_TIMEOUT_SEC,
} from "./constants";
import { extractJsonObjects } from "./parser";

export type TcpClientCallbacks = {
  onConnect: () => void;
  onClose: () => void;
  onError: (err: Error) => void;
  onMessage: (msg: DeviceMessage) => void;
};

export class SunEnergyXTTcpClient {
  private socket: net.Socket | null = null;
  private rx = "";
  private connected = false;

  private reconnectTimer: NodeJS.Timeout | null = null;
  private backoffMs = 2000;

  constructor(private cb: TcpClientCallbacks) {}

  public isConnected(): boolean {
    return this.connected;
  }

public sendHandshake(): void {
  if (!this.socket || this.socket.destroyed) return;

  // Handshake wie in Python: {"code":DATA_REPORT,"data":{}} + "\r\n"
  const payload = JSON.stringify({ code: 0x6052, data: {} }) + "\r\n";
  this.socket.write(payload, "ascii");
}


  public connect(host: string, port: number, timeoutMs: number): void {
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
      this.send({ code: CODE_DATA_REPORT, data: {} }, true);
    });

    sock.on("data", (buf: Buffer) => {
      // Device behaves like: 1 JSON per read, often without newline.
      this.rx += buf.toString("ascii");
      const { messages, rest } = extractJsonObjects(this.rx);
      this.rx = rest;
      for (const m of messages) this.cb.onMessage(m);
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

  public scheduleReconnect(host: string, port: number, timeoutMs: number): void {
    if (this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(60000, Math.floor(this.backoffMs * 1.6));

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(host, port, timeoutMs);
    }, delay);
  }

  public sendCommand(data: Record<string, any>): void {
    this.send({ code: CODE_COMMAND_SET, data }, false);
  }

  public send(msg: DeviceMessage, crlf: boolean): void {
    if (!this.socket) return;
    const payload = JSON.stringify(msg) + (crlf ? "\r\n" : "");
    this.socket.write(payload, "ascii");
  }

  public destroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;

    this.connected = false;
    this.rx = "";

    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch {
        // ignore
      }
    }
    this.socket = null;
  }
}

// Helpers for callers:
export function isDataReport(code: number): boolean {
  return code === CODE_DATA_REPORT || code === CODE_DATA_REPORT_ALT;
}
export function isAck(code: number): boolean {
  return code === CODE_RESPONSE_ACK || code === 0; // handshake ack is often code 0
}
