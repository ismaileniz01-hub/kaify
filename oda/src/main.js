import { joinRoom } from "trystero";
import "./style.css";

const APP_ID = "oda.private.v1";
const NAME_KEY = "oda-name";
const VOICE_BITRATE = 256_000;
const SCREEN_BITRATE = 12_000_000;
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤔", "😅", "😢", "😭", "😡", "🤯", "😴", "🤗",
  "👍", "👎", "👏", "🙏", "💪", "👌", "✌️", "🤝",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🔥", "✨", "⭐", "💯", "🎉", "🎊", "💀", "👀",
  "🚀", "💎", "🎯", "⚡", "🌟", "✅", "❌", "⚠️",
  "😜", "🤩", "😇", "🥳", "😤", "😱", "🤫", "🫡",
  "☕", "🍕", "🎮", "🎧", "💻", "📱", "🌙", "☀️",
];

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
  ui: null,
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

function emojiOnly(text) {
  const compact = text.replace(/\s/g, "");
  if (!compact || compact.length > 16) return false;
  return /^(\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u.test(compact);
}

function toast(text) {
  const node = el("div", "toast", text);
  document.body.append(node);
  setTimeout(() => node.remove(), 1600);
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
  state.ui = null;
  app.replaceChildren();
  const gate = el("main", "gate");
  const card = el("section", "card");
  const mark = el("div", "mark");
  mark.append(el("span", "dot"), el("span", null, "İki kişi"));
  card.append(mark, el("h1", null, "Oda"), el("p", "lede", "Sadece ikiniz. Ses, yazı, ekran. Linki gönder, gir."));
  const field = el("label", null, "Adın");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 32;
  input.value = state.name;
  input.placeholder = "Adın";
  input.autocomplete = "nickname";
  field.append(input);
  card.append(field);
  if (message) card.append(el("p", "note", message));

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
  const linkField = document.createElement("input");
  linkField.readOnly = true;
  linkField.className = "link-field";
  linkField.value = location.href;
  linkField.setAttribute("aria-label", "Oda linki");
  const status = el("div", "status");
  status.append(el("span", "dot"), el("span", null, "Sinyal"));
  status.dataset.role = "status";
  top.append(brand, linkField, status);

  const stage = el("section", "stage");
  const people = el("div", "people");
  people.append(personNode("self", state.name), personNode("peer", "Bekleniyor"));
  const remoteVideo = document.createElement("video");
  remoteVideo.className = "screen";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  remoteVideo.hidden = true;
  const badge = el("div", "badge");
  badge.hidden = true;
  const preview = el("div", "preview");
  preview.hidden = true;
  const previewVideo = document.createElement("video");
  previewVideo.autoplay = true;
  previewVideo.muted = true;
  previewVideo.playsInline = true;
  const previewLabel = el("span", null, "Ekranın karşıya gidiyor");
  preview.append(previewVideo, previewLabel);
  const fullBtn = el("button", "full-btn", "Tam ekran");
  fullBtn.type = "button";
  fullBtn.hidden = true;
  stage.append(people, remoteVideo, badge, fullBtn, preview);

  const chat = el("aside", "chat");
  chat.append(el("header", null, "Yazışma"));
  const log = el("div", "log");
  log.dataset.role = "log";
  const composerWrap = el("div", "composer-wrap");
  const emojiPanel = el("div", "emoji-panel");
  emojiPanel.hidden = true;
  for (const emoji of EMOJIS) {
    const key = el("button", null, emoji);
    key.type = "button";
    key.addEventListener("click", () => insertEmoji(emoji));
    emojiPanel.append(key);
  }
  const composer = el("form", "composer");
  const emojiBtn = el("button", "emoji-btn", "😀");
  emojiBtn.type = "button";
  emojiBtn.setAttribute("aria-label", "Emoji");
  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.maxLength = 2000;
  chatInput.placeholder = "Mesaj yaz";
  chatInput.setAttribute("aria-label", "Mesaj");
  const send = el("button", "send-btn", "Gönder");
  send.type = "submit";
  composer.append(emojiBtn, chatInput, send);
  composerWrap.append(emojiPanel, composer);
  chat.append(log, composerWrap);

  const bar = el("footer", "bar");
  const micBtn = el("button", "icon-btn on", "Mikrofon açık");
  const screenBtn = el("button", "icon-btn", "Ekran paylaş");
  const linkBtn = el("button", "icon-btn", "Linki kopyala");
  const leaveBtn = el("button", "icon-btn warn", "Ayrıl");
  micBtn.type = screenBtn.type = linkBtn.type = leaveBtn.type = "button";
  bar.append(micBtn, screenBtn, linkBtn, leaveBtn);

  shell.append(top, stage, chat, bar);
  app.append(shell);

  emojiBtn.addEventListener("click", () => {
    emojiPanel.hidden = !emojiPanel.hidden;
    emojiBtn.setAttribute("aria-expanded", String(!emojiPanel.hidden));
  });

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !state.room) return;
    chatInput.value = "";
    emojiPanel.hidden = true;
    sendChat(text);
  });

  micBtn.addEventListener("click", () => toggleMute(micBtn));
  screenBtn.addEventListener("click", () => void toggleScreen(screenBtn, previewLabel));
  linkBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(location.href);
    toast("Link kopyalandı");
  });
  leaveBtn.addEventListener("click", hangup);
  fullBtn.addEventListener("click", () => toggleFullscreen(stage, fullBtn));
  remoteVideo.addEventListener("dblclick", () => {
    if (!remoteVideo.hidden) toggleFullscreen(stage, fullBtn);
  });
  const onFullscreen = () => syncFullscreenButton(stage, fullBtn);
  document.addEventListener("fullscreenchange", onFullscreen);
  state.cleanups.push(() => document.removeEventListener("fullscreenchange", onFullscreen));

  function insertEmoji(emoji) {
    const start = chatInput.selectionStart ?? chatInput.value.length;
    const end = chatInput.selectionEnd ?? start;
    chatInput.value = `${chatInput.value.slice(0, start)}${emoji}${chatInput.value.slice(end)}`;
    const caret = start + emoji.length;
    chatInput.focus();
    chatInput.setSelectionRange(caret, caret);
  }

  return { people, remoteVideo, preview, previewVideo, previewLabel, badge, fullBtn, micBtn, screenBtn };
}

function personNode(role, name) {
  const wrap = el("div", "person");
  wrap.dataset.who = role;
  wrap.append(el("div", "avatar", initial(name)), el("div", "pname", name));
  return wrap;
}

function toggleFullscreen(stage, button) {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
  if (request) void request.call(stage);
  syncFullscreenButton(stage, button);
}

function syncFullscreenButton(stage, button) {
  if (!button) return;
  const open = document.fullscreenElement === stage;
  button.textContent = open ? "Küçült" : "Tam ekran";
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
  if (emojiOnly(text)) item.classList.add("jumbo");
  item.append(el("span", "who", name), document.createTextNode(text));
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

function showBadge(text) {
  const badge = state.ui?.badge;
  if (!badge || !text) return;
  badge.hidden = false;
  badge.textContent = text;
}

function watchLevel(stream, onLevel) {
  if (!state.audioCtx) state.audioCtx = new AudioContext({ sampleRate: 48000 });
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
  for (const peerId of peers) scheduleBoost(peerId);
}

async function boostQuality(pc) {
  if (!pc?.getSenders) return;
  for (const sender of pc.getSenders()) {
    const track = sender.track;
    if (!track) continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) continue;
    const encoding = params.encodings[0];
    if (track.kind === "audio") {
      encoding.maxBitrate = VOICE_BITRATE;
      encoding.priority = "high";
    }
    if (track.kind === "video") {
      encoding.maxBitrate = SCREEN_BITRATE;
      encoding.maxFramerate = 60;
      encoding.priority = "high";
      encoding.scaleResolutionDownBy = 1;
      params.degradationPreference = "balanced";
    }
    try {
      await sender.setParameters(params);
    } catch {
      /* Browser rejects an encoding field it does not support. */
    }
  }
}

function scheduleBoost(peerId) {
  for (const wait of [250, 1000, 2500]) {
    const timer = setTimeout(() => {
      const pc = state.room?.getPeers?.()[peerId];
      if (pc) void boostQuality(pc);
    }, wait);
    state.cleanups.push(() => clearTimeout(timer));
  }
}

function sendChat(text) {
  const payload = { name: state.name, text };
  addMessage(state.name, text, true);
  if (state.peerId) state.chat.send(payload, { target: state.peerId });
  else state.outbox.push(payload);
}

async function openMic() {
  const base = {
    echoCancellation: true,
    autoGainControl: true,
    noiseSuppression: false,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 16,
  };
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { ...base, voiceIsolation: true },
      video: false,
    });
  } catch (error) {
    if (error?.name === "NotAllowedError" || error?.name === "NotFoundError") throw error;
    return navigator.mediaDevices.getUserMedia({ audio: base, video: false });
  }
}

async function sharpenScreen(stream) {
  const video = stream.getVideoTracks()[0];
  if (video) {
    video.contentHint = "motion";
    try {
      await video.applyConstraints({
        frameRate: { ideal: 60, max: 60 },
        width: { ideal: 2560, max: 3840 },
        height: { ideal: 1440, max: 2160 },
      });
    } catch {
      /* The display source keeps the resolution the browser already granted. */
    }
  }
  const audio = stream.getAudioTracks()[0];
  if (audio) {
    audio.contentHint = "music";
    try {
      await audio.applyConstraints({
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 2,
      });
    } catch {
      /* System audio stays on the browser default. */
    }
  }
  return video?.getSettings?.() || {};
}

function formatCapture(settings) {
  const width = settings.width;
  const height = settings.height;
  const fps = settings.frameRate ? Math.round(settings.frameRate) : null;
  if (!width || !height) return "";
  return fps ? `${width}×${height} · ${fps} fps` : `${width}×${height}`;
}

async function captureScreen() {
  const video = {
    frameRate: { ideal: 60, max: 60 },
    width: { ideal: 2560, max: 3840 },
    height: { ideal: 1440, max: 2160 },
    cursor: "always",
  };
  const audio = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 48000,
    channelCount: 2,
  };
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video,
      audio,
      systemAudio: "include",
      selfBrowserSurface: "exclude",
    });
  } catch (error) {
    if (error?.name === "NotAllowedError") throw error;
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video, audio: true });
    } catch (second) {
      if (second?.name === "NotAllowedError") throw second;
      return navigator.mediaDevices.getDisplayMedia({ video: true });
    }
  }
}

async function enterRoom() {
  const ui = renderShell();
  state.ui = ui;
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
      setStatus("Bağlanamadı");
    },
  });
  state.room = room;
  state.chat = room.makeAction("chat");
  const names = room.makeAction("name");
  const quality = room.makeAction("quality");
  state.quality = quality;

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

  quality.onMessage = (incoming, { peerId }) => {
    if (peerId !== state.peerId || typeof incoming !== "string") return;
    showBadge(incoming.slice(0, 48));
  };

  room.onPeerJoin = (peerId) => {
    state.peerId = peerId;
    setStatus("Bağlanıyor");
    setPerson("peer", state.peerName || "Karşı taraf");
    names.send(state.name, { target: peerId });
    if (state.micStream) {
      const track = state.micStream.getAudioTracks()[0];
      if (track) track.contentHint = "speech";
      room.addStream(state.micStream, { target: peerId, metadata: { kind: "mic" } });
    }
    if (state.screenStream) {
      room.addStream(state.screenStream, { target: peerId, metadata: { kind: "screen" } });
      if (state.captureLabel) quality.send(state.captureLabel, { target: peerId });
    }
    for (const payload of state.outbox) state.chat.send(payload, { target: peerId });
    state.outbox = [];
    const pc = room.getPeers()[peerId];
    const reflect = () => {
      const ice = pc?.iceConnectionState;
      if (ice === "connected" || ice === "completed") {
        setStatus("Bağlı", true);
        void boostQuality(pc);
      } else if (ice === "failed") setStatus("Bağlanamadı");
      else if (ice === "disconnected") setStatus("Koptu");
      else setStatus("Bağlanıyor");
    };
    pc?.addEventListener("iceconnectionstatechange", reflect);
    reflect();
    scheduleBoost(peerId);
  };

  room.onPeerLeave = (peerId) => {
    if (peerId !== state.peerId) return;
    state.peerId = null;
    state.peerName = "";
    ui.remoteVideo.hidden = true;
    ui.remoteVideo.srcObject = null;
    ui.badge.hidden = true;
    ui.fullBtn.hidden = true;
    ui.people.hidden = false;
    if (document.fullscreenElement) void document.exitFullscreen();
    setPerson("peer", "Bekleniyor");
    setStatus("Ayrıldı");
    for (const audio of app.querySelectorAll("audio[data-peer]")) audio.remove();
  };

  room.onPeerStream = (stream, peerId, metadata) => {
    if (peerId !== state.peerId && state.peerId) return;
    state.peerId = peerId;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0 || metadata?.kind === "screen") {
      ui.people.hidden = true;
      ui.remoteVideo.hidden = false;
      ui.fullBtn.hidden = false;
      ui.remoteVideo.muted = true;
      ui.remoteVideo.srcObject = stream;
      void ui.remoteVideo.play().catch(() => {});
      const track = videoTracks[0];
      if (track) {
        track.addEventListener("ended", () => {
          ui.remoteVideo.hidden = true;
          ui.remoteVideo.srcObject = null;
          ui.badge.hidden = true;
          ui.fullBtn.hidden = true;
          ui.people.hidden = false;
          if (document.fullscreenElement) void document.exitFullscreen();
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

  setStatus("Bekleniyor");

  try {
    state.micStream = await openMic();
    const micTrack = state.micStream.getAudioTracks()[0];
    if (micTrack) micTrack.contentHint = "speech";
    publish(state.micStream, { kind: "mic" });
    watchLevel(state.micStream, (level) => setPerson("self", state.name, level > 0.06 && !state.muted));
    if (state.audioCtx?.state === "suspended") await state.audioCtx.resume();
  } catch {
    ui.micBtn.classList.remove("on");
    ui.micBtn.textContent = "Mikrofon kapalı";
    setStatus("Mikrofon yok");
  }
}

function toggleMute(button) {
  const track = state.micStream?.getAudioTracks()[0];
  if (!track) return;
  state.muted = !state.muted;
  track.enabled = !state.muted;
  button.classList.toggle("on", !state.muted);
  button.textContent = state.muted ? "Sessiz" : "Mikrofon açık";
}

async function toggleScreen(button, previewLabel) {
  if (state.screenStream) {
    stopScreen(button);
    return;
  }
  let stream;
  try {
    stream = await captureScreen();
  } catch {
    return;
  }
  const settings = await sharpenScreen(stream);
  state.captureLabel = formatCapture(settings);
  state.screenStream = stream;
  publish(stream, { kind: "screen" });
  if (state.peerId && state.captureLabel) state.quality?.send(state.captureLabel, { target: state.peerId });
  const preview = state.ui?.preview;
  const video = state.ui?.previewVideo;
  if (preview && video) {
    preview.hidden = false;
    video.srcObject = stream;
    previewLabel.textContent = state.captureLabel || "Ekran gidiyor";
  }
  button.classList.add("on");
  button.textContent = "Paylaşımı bırak";
  stream.getVideoTracks()[0]?.addEventListener("ended", () => stopScreen(button));
}

function stopScreen(button) {
  if (state.screenStream && state.room) state.room.removeStream(state.screenStream);
  stopStream(state.screenStream);
  state.screenStream = null;
  state.captureLabel = "";
  const preview = state.ui?.preview;
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
