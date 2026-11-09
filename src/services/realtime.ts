import {
  ackSchema,
  eventSchema,
  type Snapshot,
  type TrialEvent,
} from "./contracts";
import { websocketUrl } from "./urls";
export type ConnectionState =
  "connecting" | "resyncing" | "ready" | "reconnecting" | "terminal" | "closed";
export type Command =
  | { type: "user_text"; text: string }
  | { type: "present_exhibit"; exhibitId: string }
  | { type: "continue" };
export type TransportCallbacks = {
  onState: (s: ConnectionState) => void;
  onSnapshot: (s: Snapshot) => void;
  onEvent: (e: TrialEvent) => void;
  onError: (s: string) => void;
};
/** Protocol v1 proposal. Backend must confirm it before real deployment. */
export class ServerTrialTransport {
  private socket?: WebSocket;
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private disposed = false;
  private syncing = true;
  private seen = new Set<string>();
  private buffered: TrialEvent[] = [];
  private seq = 0;
  private pending = new Map<
    string,
    {
      resolve: () => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(
    private trialId: string,
    private fetchSnapshot: () => Promise<Snapshot>,
    private cb: TransportCallbacks,
    private socketFactory: (url: string) => WebSocket = (url) =>
      new WebSocket(url),
  ) {}
  async connect() {
    if (this.disposed) return;
    this.cb.onState(this.attempts ? "reconnecting" : "connecting");
    try {
      this.syncing = true;
      this.buffered = [];
      const snapshot = await this.fetchSnapshot();
      if (this.disposed) return;
      if (snapshot.id !== this.trialId)
        throw new Error("Le serveur a renvoyé une autre audience.");
      if (!snapshot.websocketUrl)
        throw new Error("L’adresse WebSocket n’a pas été fournie par Django.");
      this.cb.onSnapshot(snapshot);
      this.seq = snapshot.seq;
      const socket = this.socketFactory(websocketUrl(snapshot.websocketUrl));
      this.socket = socket;
      socket.onopen = () => {
        void this.synchronize();
      };
      socket.onmessage = (e) => {
        if (typeof e.data === "string") this.receive(e.data);
      };
      socket.onerror = () =>
        this.cb.onError("Le canal temps réel rencontre une erreur.");
      socket.onclose = (e) => {
        if (this.disposed) return;
        this.rejectPending(
          "Connexion interrompue. Réessayez explicitement votre message.",
        );
        if ([1008, 4401, 4403].includes(e.code)) {
          this.cb.onState("terminal");
          this.cb.onError("Session expirée ou accès refusé. Reconnectez-vous.");
          return;
        }
        this.schedule();
      };
    } catch (error) {
      this.cb.onError(
        error instanceof Error ? error.message : "Connexion impossible.",
      );
      this.schedule();
    }
  }
  private async synchronize() {
    this.cb.onState("resyncing");
    try {
      const snapshot = await this.fetchSnapshot();
      if (this.disposed || this.socket?.readyState !== WebSocket.OPEN) return;
      if (snapshot.id !== this.trialId)
        throw new Error("Audience incohérente.");
      this.seq = snapshot.seq;
      this.cb.onSnapshot(snapshot);
      this.syncing = false;
      const buffered = this.buffered.sort((a, b) => a.seq - b.seq);
      this.buffered = [];
      for (const event of buffered) {
        if (event.seq <= this.seq) continue;
        if (event.seq !== this.seq + 1) throw new Error("Snapshot incomplet.");
        this.receive(JSON.stringify(event));
      }
      this.attempts = 0;
      this.cb.onState("ready");
    } catch {
      this.socket?.close(1011, "resync failed");
    }
  }
  private schedule() {
    if (this.disposed) return;
    if (this.attempts >= 5) {
      this.cb.onState("terminal");
      this.cb.onError(
        "Reconnexion impossible après cinq tentatives. Utilisez Réessayer.",
      );
      return;
    }
    this.cb.onState("reconnecting");
    const delay =
      Math.min(15000, 500 * 2 ** this.attempts++) *
      (0.75 + Math.random() * 0.5);
    this.timer = setTimeout(() => void this.connect(), delay);
  }
  receive(raw: string) {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const ack = ackSchema.safeParse(data);
    if (ack.success) {
      const pending = this.pending.get(ack.data.clientMessageId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(ack.data.clientMessageId);
        if (ack.data.accepted) pending.resolve();
        else
          pending.reject(
            new Error(ack.data.reason || "Le serveur a refusé cette action."),
          );
      }
      return;
    }
    const event = eventSchema.safeParse(data);
    if (!event.success) {
      this.cb.onError("Un événement non pris en charge a été ignoré.");
      return;
    }
    const value = event.data;
    if (this.syncing) {
      if (this.buffered.length >= 100) {
        this.socket?.close(1011, "event buffer exceeded");
        return;
      }
      this.buffered.push(value);
      return;
    }
    if (this.seen.has(value.eventId) || value.seq <= this.seq) return;
    if (value.type === "snapshot" && value.snapshot.id !== this.trialId) {
      this.cb.onError("Un snapshot d’une autre audience a été ignoré.");
      return;
    }
    if (value.seq !== this.seq + 1) {
      this.syncing = true;
      this.buffered.push(value);
      void this.synchronize();
      return;
    }
    this.seq = value.seq;
    this.seen.add(value.eventId);
    if (this.seen.size > 500)
      this.seen.delete(this.seen.values().next().value!);
    this.cb.onEvent(value);
  }
  send(command: Command, clientMessageId: string) {
    return this.transmit(
      {
        ...command,
        version: 1,
        trialId: this.trialId,
        clientMessageId,
        timestamp: new Date().toISOString(),
      },
      clientMessageId,
    );
  }
  sendAudio(blob: Blob, clientMessageId: string, accepted: string[]) {
    if (!accepted.includes(blob.type))
      return Promise.reject(
        new Error(
          "Le codec de cette capture n’est pas accepté par le serveur.",
        ),
      );
    if (blob.size > 8 * 1024 * 1024)
      return Promise.reject(new Error("La capture dépasse 8 Mo."));
    return this.transmit(
      {
        type: "user_audio",
        version: 1,
        trialId: this.trialId,
        clientMessageId,
        mimeType: blob.type,
        byteLength: blob.size,
        final: true,
      },
      clientMessageId,
      blob,
    );
  }
  private transmit(payload: unknown, id: string, binary?: Blob) {
    if (
      this.disposed ||
      this.syncing ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return Promise.reject(
        new Error("Le canal n’est pas prêt. Aucun envoi effectué."),
      );
    if (this.pending.has(id) || this.pending.size >= 10)
      return Promise.reject(new Error("Un envoi est déjà en attente."));
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            "Accusé de réception non reçu. Vous pouvez réessayer avec le même identifiant.",
          ),
        );
      }, 12000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.socket!.send(JSON.stringify(payload));
        if (binary) this.socket!.send(binary);
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error("Envoi interrompu."));
      }
    });
  }
  reconnect() {
    if (this.disposed) return;
    clearTimeout(this.timer);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.attempts = 0;
    this.rejectPending("Reconnexion demandée.");
    void this.connect();
  }
  private rejectPending(reason: string) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
  }
  close() {
    this.disposed = true;
    this.buffered = [];
    clearTimeout(this.timer);
    this.rejectPending("Audience quittée.");
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.cb.onState("closed");
  }
}
