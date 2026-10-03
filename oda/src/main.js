import { joinRoom } from "trystero";
import "./style.css";

const APP_ID = "oda.private.v1";
const NAME_KEY = "oda-name";
const app = document.querySelector("#app");

const state = {
  room: null,
  roomId: new URLSearchParams(location.search).get("r") || "",
  name: localStorage.getItem(NAME_KEY) || "",
  peerId: null,
  peerName: "",
  micStream: null,
  screenStream: null,
  muted: false,
  audioCtx: null,
  outbox: [],
  cleanups: [],
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function roomCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function initial(name) {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Bekleniyor") return "·";
  return trimmed.slice(0, 1).toUpperCase();
}

function toast(text) {
  const node = el("div", "toast", text);
  document.body.append(node);
  setTimeout(() => node.remove(), 1800);
}

function cleanup() {
  for (const fn of state.cleanups) fn();
  state.cleanups = [];
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function renderGate(message) {
  cleanup();
  app.replaceChildren();
  const gate = el("main", "gate");
  const card = el("section", "card");
  const mark = el("div", "mark");
  mark.append(el("span", "dot"), el("span", null, "Özel oda"));
  card.append(mark, el("h1", null, "Oda"));
  card.append(
    el(
      "p",
      "lede",
      "Linki karşı tarafa yolla. İkiniz de girince ses, yazı ve ekran paylaşımı açılır.",
    ),
  );

  const field = el("label", null, "Adın");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 32;
  input.value = state.name;
  input.placeholder = "Adın";
  input.autocomplete = "nickname";
  field.append(input);
  card.append(field);

  if (message) card.append(el("p", "lede", message));

  const button = el("button", "primary", state.roomId ? "Odaya gir" : "Oda aç");
  button.type = "button";
  button.addEventListener("click", () => {
    state.name = input.value.trim().slice(0, 32) || "Ben";
    localStorage.setItem(NAME_KEY, state.name);
    if (!state.roomId) {
      state.roomId = roomCode();
      history.pushState({}, "", `?r=${state.roomId}`);
    }
    void enterRoom();
  });
  card.append(button);
  gate.append(card);
  app.append(gate);
  input.focus();
}

function renderShell() {
  app.replaceChildren();
  const shell = el("main", "shell");

  const top = el("header", "top");
  const brand = el("div", "mark");
  brand.append(el("span", "dot live"), el("span", null, "Oda"));
  const status = el("div", "status");
  status.append(el("span", "dot"), el("span", null, "Sinyal aranıyor"));
  status.dataset.role = "status";
  const linkField = document.createElement("input");
  linkField.readOnly = true;
  linkField.className = "link-field";
  linkField.value = location.href;
  linkField.setAttribute("aria-label", "Oda linki");
  top.append(brand, linkField, status);

  const stage = el("section", "stage");
  const people = el("div", "people");
  people.append(personNode("self", state.name), personNode("peer", "Bekleniyor"));
  const remoteVideo = document.createElement("video");
  remoteVideo.className = "screen";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  remoteVideo.hidden = true;
  const preview = el("div", "preview");
  preview.hidden = true;
  const previewVideo = document.createElement("video");
  previewVideo.autoplay = true;
  previewVideo.muted = true;
  previewVideo.playsInline = true;
  preview.append(previewVideo, el("span", null, "Ekranın karşıya gidiyor"));
  stage.append(people, remoteVideo, preview);

  const chat = el("aside", "chat");
  chat.append(el("header", null, "Yazışma"));
  const log = el("div", "log");
  log.dataset.role = "log";
  const composer = el("form", "composer");
  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.maxLength = 2000;
  chatInput.placeholder = "Mesaj yaz";
  chatInput.setAttribute("aria-label", "Mesaj");
  const send = el("button", null, "Gönder");
  send.type = "submit";
  composer.append(chatInput, send);
  chat.append(log, composer);

  const bar = el("footer", "bar");
  const micBtn = el("button", "icon-btn on", "Mikrofon açık");
  const screenBtn = el("button", "icon-btn", "Ekran paylaş");
  const linkBtn = el("button", "icon-btn", "Linki kopyala");
  const leaveBtn = el("button", "icon-btn warn", "Ayrıl");
  micBtn.type = screenBtn.type = linkBtn.type = leaveBtn.type = "button";
  bar.append(micBtn, screenBtn, linkBtn, leaveBtn);

  shell.append(top, stage, chat, bar);
  app.append(shell);

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !state.room) return;
    chatInput.value = "";
    sendChat(text);
  });

  micBtn.addEventListener("click", () => toggleMute(micBtn));
  screenBtn.addEventListener("click", () => void toggleScreen(screenBtn));
  linkBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(location.href);
    toast("Link kopyalandı");
  });
  leaveBtn.addEventListener("click", hangup);

  return { status, people, remoteVideo, preview, previewVideo, log, micBtn, screenBtn };
}

function personNode(role, name) {
  const wrap = el("div", "person");
  wrap.dataset.who = role;
  wrap.append(el("div", "avatar", initial(name)), el("div", "pname", name));
  return wrap;
}

function setStatus(text, live) {
  const status = app.querySelector("[data-role=status]");
  if (!status) return;
  status.replaceChildren(el("span", live ? "dot live" : "dot"), el("span", null, text));
}

function setPerson(role, name, speaking) {
  const node = app.querySelector(`[data-who="${role}"]`);
  if (!node) return;
  node.classList.toggle("speaking", Boolean(speaking));
  node.querySelector(".avatar").textContent = initial(name);
  node.querySelector(".pname").textContent = name;
}

function addMessage(name, text, mine) {
  const log = app.querySelector("[data-role=log]");
  if (!log) return;
  const item = el("div", mine ? "msg mine" : "msg");
  item.append(el("span", "who", name), document.createTextNode(text));
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

function watchLevel(stream, onLevel) {
  if (!state.audioCtx) state.audioCtx = new AudioContext();
  const source = state.audioCtx.createMediaStreamSource(stream);
  const analyser = state.audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let frame = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const sample = (value - 128) / 128;
      sum += sample * sample;
    }
    onLevel(Math.sqrt(sum / data.length));
    frame = requestAnimationFrame(tick);
  };
  tick();
  state.cleanups.push(() => {
    cancelAnimationFrame(frame);
    source.disconnect();
  });
}

function publish(stream, metadata) {
  const peers = Object.keys(state.room.getPeers());
  if (peers.length === 0) return;
  state.room.addStream(stream, { metadata, target: peers });
}

function sendChat(text) {
  const payload = { name: state.name, text };
  addMessage(state.name, text, true);
  if (state.peerId) state.chat.send(payload, { target: state.peerId });
  else state.outbox.push(payload);
}

async function enterRoom() {
  const ui = renderShell();
  state.outbox = [];
  state.peerId = null;
  state.peerName = "";

  const room = joinRoom({ appId: APP_ID, password: state.roomId }, state.roomId, {
    onPeerHandshake: async () => {
      if (Object.keys(room.getPeers()).length >= 1) throw new Error("oda-dolu");
    },
    onJoinError(details) {
      const message = String(details?.error?.message || details?.error || "");
      if (message.includes("oda-dolu") || message.includes("handshake")) {
        hangup("Bu oda dolu. Aynı anda iki kişi girebilir.");
        return;
      }
      setStatus("Doğrudan bağlanılamadı");
    },
  });
  state.room = room;
  state.chat = room.makeAction("chat");
  const names = room.makeAction("name");

  state.chat.onMessage = (payload, { peerId }) => {
    if (!payload || typeof payload.text !== "string") return;
    if (peerId !== state.peerId) return;
    addMessage(state.peerName || "Karşı taraf", payload.text.slice(0, 2000), false);
  };

  names.onMessage = (incoming, { peerId }) => {
    if (peerId !== state.peerId || typeof incoming !== "string") return;
    state.peerName = incoming.trim().slice(0, 32) || "Karşı taraf";
    setPerson("peer", state.peerName);
  };

  room.onPeerJoin = (peerId) => {
    state.peerId = peerId;
    setStatus("Bağlanıyor");
    setPerson("peer", state.peerName || "Karşı taraf");
    names.send(state.name, { target: peerId });
    if (state.micStream) room.addStream(state.micStream, { target: peerId, metadata: { kind: "mic" } });
    if (state.screenStream) {
      room.addStream(state.screenStream, { target: peerId, metadata: { kind: "screen" } });
    }
    for (const payload of state.outbox) state.chat.send(payload, { target: peerId });
    state.outbox = [];
    const pc = room.getPeers()[peerId];
    const reflect = () => {
      const ice = pc?.iceConnectionState;
      if (ice === "connected" || ice === "completed") setStatus("Bağlı", true);
      else if (ice === "failed") setStatus("Bağlantı kurulamadı");
      else if (ice === "disconnected") setStatus("Bağlantı koptu");
      else setStatus("Bağlanıyor");
    };
    pc?.addEventListener("iceconnectionstatechange", reflect);
    reflect();
  };

  room.onPeerLeave = (peerId) => {
    if (peerId !== state.peerId) return;
    state.peerId = null;
    state.peerName = "";
    ui.remoteVideo.hidden = true;
    ui.remoteVideo.srcObject = null;
    ui.people.hidden = false;
    setPerson("peer", "Bekleniyor");
    setStatus("Karşı taraf ayrıldı");
    for (const audio of app.querySelectorAll("audio[data-peer]")) audio.remove();
  };

  room.onPeerStream = (stream, peerId, metadata) => {
    if (peerId !== state.peerId && state.peerId) return;
    state.peerId = peerId;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0 || metadata?.kind === "screen") {
      ui.people.hidden = true;
      ui.remoteVideo.hidden = false;
      ui.remoteVideo.muted = true;
      ui.remoteVideo.srcObject = stream;
      void ui.remoteVideo.play().catch(() => {});
      const track = videoTracks[0];
      if (track) {
        track.addEventListener("ended", () => {
          ui.remoteVideo.hidden = true;
          ui.remoteVideo.srcObject = null;
          ui.people.hidden = false;
        });
      }
    }
    if (stream.getAudioTracks().length > 0) {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.dataset.peer = peerId;
      audio.srcObject = stream;
      app.append(audio);
      void audio.play().catch(() => {});
      if (metadata?.kind !== "screen") {
        watchLevel(stream, (level) => setPerson("peer", state.peerName || "Karşı taraf", level > 0.06));
      }
    }
  };

  setStatus("Karşı taraf bekleniyor");

  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    publish(state.micStream, { kind: "mic" });
    watchLevel(state.micStream, (level) => setPerson("self", state.name, level > 0.06 && !state.muted));
    if (state.audioCtx?.state === "suspended") await state.audioCtx.resume();
  } catch {
    ui.micBtn.classList.remove("on");
    ui.micBtn.textContent = "Mikrofon kapalı";
    setStatus("Mikrofon izni yok, yazışma açık");
  }

}

function toggleMute(button) {
  const track = state.micStream?.getAudioTracks()[0];
  if (!track) return;
  state.muted = !state.muted;
  track.enabled = !state.muted;
  button.classList.toggle("on", !state.muted);
  button.textContent = state.muted ? "Mikrofon kapalı" : "Mikrofon açık";
}

async function toggleScreen(button) {
  if (state.screenStream) {
    stopScreen(button);
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch (error) {
    if (error?.name === "NotAllowedError") return;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return;
    }
  }
  state.screenStream = stream;
  publish(stream, { kind: "screen" });
  const preview = app.querySelector(".preview");
  const video = preview?.querySelector("video");
  if (preview && video) {
    preview.hidden = false;
    video.srcObject = stream;
  }
  button.classList.add("on");
  button.textContent = "Paylaşımı bırak";
  stream.getVideoTracks()[0]?.addEventListener("ended", () => stopScreen(button));
}

function stopScreen(button) {
  if (state.screenStream && state.room) state.room.removeStream(state.screenStream);
  stopStream(state.screenStream);
  state.screenStream = null;
  const preview = app.querySelector(".preview");
  if (preview) {
    preview.hidden = true;
    const video = preview.querySelector("video");
    if (video) video.srcObject = null;
  }
  if (button) {
    button.classList.remove("on");
    button.textContent = "Ekran paylaş";
  }
}

function hangup(message) {
  if (message?.type === "beforeunload") {
    state.room?.leave();
    stopStream(state.micStream);
    stopStream(state.screenStream);
    return;
  }
  state.room?.leave();
  state.room = null;
  stopStream(state.micStream);
  stopStream(state.screenStream);
  state.micStream = null;
  state.screenStream = null;
  state.peerId = null;
  cleanup();
  state.audioCtx?.close().catch(() => {});
  state.audioCtx = null;
  history.pushState({}, "", location.pathname);
  state.roomId = "";
  renderGate(typeof message === "string" ? message : "");
}

window.addEventListener("beforeunload", hangup);

renderGate();
