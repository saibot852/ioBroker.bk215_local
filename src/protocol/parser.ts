import type { DeviceMessage } from "./constants";

export function extractJsonObjects(buffer: string): { messages: DeviceMessage[]; rest: string } {
  const messages: DeviceMessage[] = [];
  let rx = buffer;

  while (true) {
    const start = rx.indexOf("{");
    if (start < 0) return { messages, rest: "" };
    if (start > 0) rx = rx.slice(start);

    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = 0; i < rx.length; i++) {
      const c = rx[i];

      if (inString) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }

      if (c === '"') {
        inString = true;
        continue;
      }

      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end < 0) return { messages, rest: rx }; // wait for more

    const jsonStr = rx.slice(0, end + 1).trim();
    rx = rx.slice(end + 1);

    try {
      messages.push(JSON.parse(jsonStr) as DeviceMessage);
    } catch {
      // ignore malformed
    }
  }
}
