import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ServerTrialTransport, type ConnectionState } from "./realtime";
import { snapshotSchema, type TrialEvent } from "./contracts";
const snapshot = snapshotSchema.parse({
  id: "trial-1",
  caseId: "limete",
  roleId: "defense",
  step: 1,
  entries: [],
  seen: [],
  presented: [],
  objection: false,
  finished: false,
  canResume: true,
  allowedActions: ["user_text"],
  activeSpeaker: "president",
  startedAt: "2026-01-01T00:00:00Z",
  websocketUrl: "ws://localhost/ws/trial-1",
  seq: 0,
});
class FakeSocket {
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: unknown) {
    this.sent.push(data);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}
beforeEach(() => {
  vi.stubGlobal("WebSocket", { OPEN: 1 });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function fixture() {
  const socket = new FakeSocket();
  const states: ConnectionState[] = [];
  const events: TrialEvent[] = [];
  const error = vi.fn();
  const fetch = vi.fn().mockResolvedValue(snapshot);
  const transport = new ServerTrialTransport(
    "trial-1",
    fetch,
    {
      onState: (s) => states.push(s),
      onSnapshot: () => {},
      onEvent: (e) => events.push(e),
      onError: error,
    },
    () => socket as unknown as WebSocket,
  );
  await transport.connect();
  socket.open();
  await vi.waitFor(() => expect(states.at(-1)).toBe("ready"));
  return { transport, socket, states, events, error, fetch };
}
it("attend une acceptation et préserve l’identifiant lors du réessai", async () => {
  const { transport, socket } = await fixture();
  const sent = transport.send(
    { type: "user_text", text: "Argument" },
    "stable-id",
  );
  expect(socket.sent).toHaveLength(1);
  transport.receive(
    JSON.stringify({
      type: "ack",
      clientMessageId: "stable-id",
      accepted: true,
    }),
  );
  await expect(sent).resolves.toBeUndefined();
  expect(JSON.parse(String(socket.sent[0])).clientMessageId).toBe("stable-id");
  transport.close();
});
it("ne rejoue pas un message après déconnexion", async () => {
  const { transport, socket } = await fixture();
  const promise = transport.send({ type: "user_text", text: "Argument" }, "id");
  const rejected = expect(promise).rejects.toThrow("interrompue");
  socket.close(1006);
  await rejected;
  expect(socket.sent).toHaveLength(1);
  transport.close();
});
it("ignore un doublon et resynchronise une séquence incomplète", async () => {
  const { transport, events, fetch } = await fixture();
  const event = {
    type: "turn",
    eventId: "e1",
    seq: 1,
    turnId: "t",
    speaker: "president",
    text: "Question",
  };
  transport.receive(JSON.stringify(event));
  transport.receive(JSON.stringify(event));
  expect(events).toHaveLength(1);
  transport.receive(JSON.stringify({ ...event, eventId: "e3", seq: 3 }));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(events).toHaveLength(1);
  transport.close();
});
it("traite un événement inconnu sans crash", async () => {
  const { transport, error } = await fixture();
  expect(() => transport.receive("{invalid")).not.toThrow();
  transport.receive(
    JSON.stringify({ type: "unexpected", secret: "not logged" }),
  );
  expect(error).toHaveBeenCalledWith(
    "Un événement non pris en charge a été ignoré.",
  );
  transport.close();
});
it("rend une expiration de session terminale", async () => {
  const { transport, socket, states } = await fixture();
  socket.close(4401);
  expect(states.at(-1)).toBe("terminal");
  transport.close();
});
it("refuse un audio sans codec négocié", async () => {
  const { transport } = await fixture();
  await expect(
    transport.sendAudio(new Blob(["x"], { type: "audio/webm" }), "id", []),
  ).rejects.toThrow("codec");
  transport.close();
});
it("conserve les événements reçus pendant le chargement du snapshot", async () => {
  const socket = new FakeSocket();
  const events: TrialEvent[] = [];
  const states: ConnectionState[] = [];
  let resolveSnapshot: (s: typeof snapshot) => void = () => {};
  let calls = 0;
  const fetch = () => {
    calls++;
    return calls === 1
      ? Promise.resolve(snapshot)
      : new Promise<typeof snapshot>((resolve) => {
          resolveSnapshot = resolve;
        });
  };
  const transport = new ServerTrialTransport(
    "trial-1",
    fetch,
    {
      onState: (s) => states.push(s),
      onSnapshot: () => {},
      onEvent: (e) => events.push(e),
      onError: () => {},
    },
    () => socket as unknown as WebSocket,
  );
  await transport.connect();
  socket.open();
  transport.receive(
    JSON.stringify({
      type: "turn",
      eventId: "during-resync",
      seq: 1,
      turnId: "t",
      speaker: "clerk",
      text: "Message pendant la resynchronisation",
    }),
  );
  expect(events).toHaveLength(0);
  resolveSnapshot(snapshot);
  await vi.waitFor(() => expect(states.at(-1)).toBe("ready"));
  expect(events).toHaveLength(1);
  transport.close();
});
