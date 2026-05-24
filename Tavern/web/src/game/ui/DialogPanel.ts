import Phaser from "phaser";
import { withPublicBase } from "../data/assets";
import { streamNpcChat, type ChatRequest } from "../systems/apiClient";
import type { RoundState, SeatedNpc } from "../types";

const topicText = {
  greeting: "打个招呼",
  tablemate: "问问同桌",
  rumor: "江湖八卦"
} as const;

export class DialogPanel {
  private scene: Phaser.Scene;
  private dom?: Phaser.GameObjects.DOMElement;
  private current?: SeatedNpc;
  private round?: RoundState;
  private abort?: AbortController;
  private history = new Map<string, Array<{ role: "player" | "npc"; text: string }>>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  open(seated: SeatedNpc, round: RoundState): void {
    this.close();
    document.querySelectorAll(".dialog-panel").forEach((panel) => panel.remove());
    this.current = seated;
    this.round = round;
    const event = round.tableEvents[seated.tableId];
    const firstLine = Phaser.Utils.Array.GetRandom(seated.npc.presetLines);
    const avatarUrl = withPublicBase(`/images/npcs/${seated.npc.id}/avatar.png`);
    const panelUrl = withPublicBase("/images/ui/dialog-panel.png");
    const node = document.createElement("div");
    node.className = "dialog-panel";
    node.style.setProperty("--dialog-panel-image", `url("${panelUrl}")`);
    ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "mousedown", "mouseup", "click"].forEach((eventName) => {
      node.addEventListener(eventName, (event) => event.stopPropagation(), { passive: false });
    });
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    });
    node.innerHTML = `
      <div class="dialog-head">
        <div class="dialog-avatar-frame">
          <img class="dialog-avatar" src="${avatarUrl}" onerror="this.style.display='none'" alt="" />
        </div>
        <div>
          <h2 class="dialog-title">${seated.npc.name} <small>${seated.npc.title}</small></h2>
          <div class="dialog-meta">${seated.npc.personalityTag} · ${seated.tableId} 桌${event ? ` · ${event.name}` : ""}</div>
        </div>
        <button class="dialog-close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="dialog-reply">${firstLine}</div>
      <div class="dialog-topics">
        <button data-topic="greeting" type="button">${topicText.greeting}</button>
        <button data-topic="tablemate" type="button">${topicText.tablemate}</button>
        <button data-topic="rumor" type="button">${topicText.rumor}</button>
      </div>
      <div class="dialog-form">
        <input class="dialog-input" maxlength="120" placeholder="和大侠聊两句" />
        <button class="dialog-send" type="button">发送</button>
      </div>
    `;
    const x = 960;
    const y = Phaser.Math.Clamp(seated.y < 540 ? 650 : 500, 430, 690);
    this.dom = this.scene.add.dom(x, y, node).setOrigin(0.5).setDepth(5000);
    node.querySelector(".dialog-close")?.addEventListener("click", () => this.close());
    const input = node.querySelector<HTMLInputElement>(".dialog-input");
    input?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      input.focus();
    });
    input?.addEventListener("touchstart", (event) => {
      event.stopPropagation();
      input.focus();
    });
    input?.addEventListener("click", (event) => {
      event.stopPropagation();
      input.focus();
    });
    node.querySelectorAll<HTMLButtonElement>("[data-topic]").forEach((button) => {
      button.addEventListener("click", () => this.send(button.dataset.topic as keyof typeof topicText, topicText[button.dataset.topic as keyof typeof topicText]));
    });
    node.querySelector(".dialog-send")?.addEventListener("click", () => {
      const input = node.querySelector<HTMLInputElement>(".dialog-input");
      const message = input?.value.trim() || "";
      if (!message) return;
      if (input) input.value = "";
      this.send("free", message);
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        node.querySelector<HTMLButtonElement>(".dialog-send")?.click();
      }
    });
  }

  close(destroy = true): void {
    this.abort?.abort();
    this.abort = undefined;
    if (destroy) {
      this.dom?.destroy();
      this.dom = undefined;
      this.current = undefined;
    }
  }

  isOpen(): boolean {
    return Boolean(this.dom);
  }

  private send(topic: ChatRequest["topic"], message: string): void {
    if (!this.current || !this.round || !this.dom) return;
    this.abort?.abort();
    this.abort = new AbortController();
    const node = this.dom.node as HTMLElement;
    const reply = node.querySelector<HTMLElement>(".dialog-reply");
    const buttons = node.querySelectorAll<HTMLButtonElement>("button");
    buttons.forEach((button) => (button.disabled = true));
    if (reply) reply.textContent = "江湖信鸽飞去后厨了……";

    const seated = this.current;
    const tablemates = this.round.seatedNpcs
      .filter((item) => item.tableId === seated.tableId && item.npc.id !== seated.npc.id)
      .map((item) => ({ id: item.npc.id, name: item.npc.name, title: item.npc.title }));
    const event = this.round.tableEvents[seated.tableId];
    const recentMessages = (this.history.get(seated.npc.id) || []).slice(-6);
    const payload: ChatRequest = {
      npcId: seated.npc.id,
      npcName: seated.npc.name,
      message,
      topic,
      tableId: seated.tableId,
      tablemates,
      eventId: event?.id,
      eventName: event?.name,
      eventDescription: event?.description,
      recentMessages,
      clientTime: new Date().toISOString()
    };

    void streamNpcChat(payload, {
      signal: this.abort.signal,
      onDelta: (_delta, fullText) => {
        if (reply) reply.textContent = fullText;
      },
      onDone: (text) => {
        if (reply) reply.textContent = text;
        const next = [...recentMessages, { role: "player" as const, text: message }, { role: "npc" as const, text }];
        this.history.set(seated.npc.id, next.slice(-6));
        buttons.forEach((button) => (button.disabled = false));
      },
      onError: () => {
        if (reply) reply.textContent = "小馆后厨忙乱，稍后再问这位大侠吧。";
        buttons.forEach((button) => (button.disabled = false));
      }
    });
  }
}
