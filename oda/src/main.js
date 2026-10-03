import mqtt from "mqtt";
import { joinRoom } from "@trystero-p2p/mqtt";
import "./style.css";

const APP_ID = "oda.private.v1";
const BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"];
const ROOM_TOPIC = "oda/v2/rooms/";
const RELAY = { urls: BROKERS };
let rejoinAfter = 0;
const NAME_KEY = "oda-name";
const HOST_KEY = "oda-hosted";
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

function loadHost() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "null");
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.password !== "string") return null;
    return {
      id: parsed.id.slice(0, 64),
      name: String(parsed.name || "Oda").slice(0, 40),
      password: String(parsed.password).slice(0, 80),
    };
  } catch {
    return null;
  }
}

const state = {
  lobby: null,
  announce: null,
  listings: new Map(),
  hosted: loadHost(),
  selectedId: "",
  directory: [],
  joinError: "",
  checking: false,
  view: "home",
  room: null,
  roomId: "",
  roomTitle: "",
  roomPassword: "",
  name: localStorage.getItem(NAME_KEY) || "",
  peerId: null,
  peerName: "",
  micStream: null,
  screenStream: null,
  muted: false,
  audioCtx: null,
  outbox: [],
  photoOutbox: [],
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

function currentName() {
  return state.name.trim().slice(0, 32) || "Ben";
}

function saveName(value) {
  state.name = value.trim().slice(0, 32);
  localStorage.setItem(NAME_KEY, state.name);
  publishHosted();
}

function visibleRooms() {
  const map = new Map(state.listings);
  if (state.hosted) {
    map.set(state.hosted.id, {
      id: state.hosted.id,
      name: state.hosted.name,
      host: currentName(),
      self: true,
      at: Date.now(),
    });
  }
  return [...map.values()].sort((a, b) => Number(Boolean(b.self)) - Number(Boolean(a.self)) || a.name.localeCompare(b.name, "tr"));
}

function paintList() {
  const list = app.querySelector("[data-role=rooms]");
  if (!list) return;
  list.replaceChildren();
  const rooms = visibleRooms();
  if (!rooms.length) {
    list.append(el("p", "empty", "Açık oda yok. Oda kur, karşı taraf burada görsün."));
    return;
  }
  for (const room of rooms) {
    const button = el("button", room.self ? "room mine" : "room");
    button.type = "button";
    button.dataset.id = room.id;
    const title = el("strong", null, room.name);
    const meta = el("span", null, room.self ? "Senin odan · şifresiz gir" : room.host);
    button.append(title, meta);
    list.append(button);
  }
}

function paintAsk() {
  const ask = app.querySelector("[data-role=ask]");
  if (!ask) return;
  const room = visibleRooms().find((item) => item.id === state.selectedId && !item.self);
  if (!room) {
    ask.hidden = true;
    return;
  }
  ask.hidden = false;
  const title = ask.querySelector("[data-role=ask-name]");
  if (title) title.textContent = room.name;
  const error = ask.querySelector("[data-role=ask-error]");
  if (error) {
    error.hidden = !state.joinError;
    error.textContent = state.joinError;
  }
  const submit = ask.querySelector("button.primary");
  if (submit) {
    submit.disabled = state.checking;
    submit.textContent = state.checking ? "Kontrol ediliyor" : "Gir";
  }
}

function renderHome(message) {
  state.view = "home";
  state.ui = null;
  if (message) state.joinError = message;
  app.replaceChildren();
  const home = el("main", "home");
  const card = el("section", "card wide");
  const mark = el("div", "mark");
  mark.append(el("span", "dot live"), el("span", null, "İki kişi"));
  card.append(mark, el("h1", null, "Oda"));
  card.append(el("p", "lede", "Bir oda kur ya da listeden gir. Şifreyi sadece ikiniz bilin."));

  const nameField = el("label", null, "Adın");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 32;
  nameInput.value = state.name;
  nameInput.placeholder = "Adın";
  nameInput.autocomplete = "nickname";
  nameInput.addEventListener("change", () => saveName(nameInput.value));
  nameField.append(nameInput);
  card.append(nameField);

  const head = el("div", "list-head");
  head.append(el("h2", null, "Odalar"));
  const createBtn = el("button", "ghost", "Oda kur");
  createBtn.type = "button";
  head.append(createBtn);
  card.append(head);

  const list = el("div", "rooms");
  list.dataset.role = "rooms";
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const id = button.dataset.id;
    if (state.hosted?.id === id) {
      void enterVoice({
        id,
        password: state.hosted.password,
        title: state.hosted.name,
        reveal: true,
      });
      return;
    }
    state.selectedId = id;
    state.joinError = "";
    state.checking = false;
    paintAsk();
    askInput?.focus();
  });
  card.append(list);

  const create = el("form", "create");
  create.hidden = true;
  const roomLabel = el("label", null, "Oda adı");
  const roomInput = document.createElement("input");
  roomInput.type = "text";
  roomInput.maxLength = 40;
  roomInput.required = true;
  roomInput.placeholder = "Örneğin akşam";
  roomLabel.append(roomInput);
  const passLabel = el("label", null, "Şifre");
  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.maxLength = 80;
  passInput.required = true;
  passInput.placeholder = "Karşı tarafa söyleyeceğin şifre";
  passInput.autocomplete = "new-password";
  passLabel.append(passInput);
  const createSubmit = el("button", "primary", "Kur ve gir");
  createSubmit.type = "submit";
  const createNameLabel = el("label", null, "Adın");
  const createName = document.createElement("input");
  createName.type = "text";
  createName.maxLength = 32;
  createName.required = true;
  createName.value = state.name;
  createName.placeholder = "Adın";
  createName.autocomplete = "nickname";
  createNameLabel.append(createName);
  create.prepend(createNameLabel);
  create.append(roomLabel, passLabel, createSubmit);
  card.append(create);

  const ask = el("form", "ask");
  ask.dataset.role = "ask";
  ask.hidden = true;
  const askTitle = el("p", "lede");
  askTitle.dataset.role = "ask-name";
  const askLabel = el("label", null, "Şifre");
  const askInput = document.createElement("input");
  askInput.type = "password";
  askInput.maxLength = 80;
  askInput.required = true;
  askInput.autocomplete = "current-password";
  askLabel.append(askInput);
  const askError = el("p", "note");
  askError.dataset.role = "ask-error";
  askError.hidden = true;
  const askSubmit = el("button", "primary", "Gir");
  askSubmit.type = "submit";
  ask.append(askTitle, askLabel, askError, askSubmit);
  card.append(ask);

  createBtn.addEventListener("click", () => {
    create.hidden = !create.hidden;
    if (!create.hidden) roomInput.focus();
  });
  create.addEventListener("submit", (event) => {
    event.preventDefault();
    const displayName = createName.value.trim();
    const name = roomInput.value.trim().slice(0, 40);
    const password = passInput.value;
    if (!displayName || !name || !password) return;
    saveName(displayName);
    const id = roomCode();
    state.hosted = { id, name, password };
    localStorage.setItem(HOST_KEY, JSON.stringify(state.hosted));
    publishHosted();
    void enterVoice({ id, password, title: name, reveal: true });
  });
  ask.addEventListener("submit", (event) => {
    event.preventDefault();
    const room = visibleRooms().find((item) => item.id === state.selectedId && !item.self);
    if (!room) return;
    saveName(nameInput.value);
    state.checking = true;
    state.joinError = "";
    paintAsk();
    void enterVoice({
      id: room.id,
      password: askInput.value,
      title: room.name,
      reveal: false,
    });
  });

  home.append(card);
  app.append(home);
  paintList();
  paintAsk();
}

function roomTopic(id) {
  return `${ROOM_TOPIC}${id}`;
}

function publishHosted() {
  if (!state.hosted) return;
  const body = JSON.stringify({
    id: state.hosted.id,
    name: state.hosted.name,
    host: currentName(),
    ts: Date.now(),
  });
  for (const client of state.directory) {
    if (client.connected) client.publish(roomTopic(state.hosted.id), body, { retain: true, qos: 1 });
  }
}

function clearHosted() {
  if (!state.hosted) return;
  for (const client of state.directory) {
    if (client.connected) client.publish(roomTopic(state.hosted.id), "", { retain: true, qos: 1 });
  }
}

function applyDirectoryMessage(topic, payload) {
  if (!topic.startsWith(ROOM_TOPIC)) return;
  const id = topic.slice(ROOM_TOPIC.length);
  const text = payload.toString();
  if (!text) {
    state.listings.delete(id);
  } else {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    if (!data || data.left || typeof data.id !== "string" || typeof data.name !== "string") {
      state.listings.delete(id);
    } else {
      state.listings.set(data.id, {
        id: data.id.slice(0, 64),
        name: data.name.slice(0, 40),
        host: typeof data.host === "string" && data.host.trim() ? data.host.trim().slice(0, 32) : "Birisi",
        at: Number(data.ts) || Date.now(),
      });
    }
  }
  if (state.view === "home") {
    paintList();
    paintAsk();
  }
}

function pruneListings() {
  const now = Date.now();
  let changed = false;
  for (const [id, room] of state.listings) {
    if (id !== state.hosted?.id && now - room.at > 45000) {
      state.listings.delete(id);
      changed = true;
    }
  }
  if (changed && state.view === "home") paintList();
}

function startDirectory() {
  if (state.directory.length) return;
  state.directory = BROKERS.map((url) => {
    const client = mqtt.connect(url, {
      clientId: `oda${Math.random().toString(16).slice(2, 12)}`,
      reconnectPeriod: 2000,
      connectTimeout: 8000,
      keepalive: 30,
      clean: true,
      protocolVersion: 4,
    });
    client.on("connect", () => {
      client.subscribe(`${ROOM_TOPIC}#`, { qos: 1 }, () => publishHosted());
    });
    client.on("message", applyDirectoryMessage);
    client.on("error", () => {});
    return client;
  });
  const timer = setInterval(() => {
    publishHosted();
    pruneListings();
  }, 15000);
  window.addEventListener("pagehide", () => {
    clearInterval(timer);
    clearHosted();
  });
}

function renderShell() {
  app.replaceChildren();
  const shell = el("main", "shell");

  const top = el("header", "top");
  const brand = el("div", "mark");
  brand.append(el("span", "dot live"), el("span", null, state.roomTitle || "Oda"));
  const status = el("div", "status");
  status.append(el("span", "dot"), el("span", null, "Sinyal"));
  status.dataset.role = "status";
  top.append(brand, status);

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
  const photoBtn = el("button", "emoji-btn", "📷");
  photoBtn.type = "button";
  photoBtn.setAttribute("aria-label", "Fotoğraf");
  const photoInput = document.createElement("input");
  photoInput.type = "file";
  photoInput.accept = "image/*";
  photoInput.hidden = true;
  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.maxLength = 2000;
  chatInput.placeholder = "Mesaj yaz";
  chatInput.setAttribute("aria-label", "Mesaj");
  const send = el("button", "send-btn", "Gönder");
  send.type = "submit";
  composer.append(emojiBtn, photoBtn, photoInput, chatInput, send);
  composerWrap.append(emojiPanel, composer);
  chat.append(log, composerWrap);

  const bar = el("footer", "bar");
  const micBtn = el("button", "icon-btn on", "Mikrofon açık");
  const screenBtn = el("button", "icon-btn", "Ekran paylaş");
  const leaveBtn = el("button", "icon-btn warn", "Ayrıl");
  micBtn.type = screenBtn.type = leaveBtn.type = "button";
  bar.append(micBtn, screenBtn, leaveBtn);

  shell.append(top, stage, chat, bar);
  app.append(shell);

  emojiBtn.addEventListener("click", () => {
    emojiPanel.hidden = !emojiPanel.hidden;
    emojiBtn.setAttribute("aria-expanded", String(!emojiPanel.hidden));
  });
  photoBtn.addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    photoInput.value = "";
    if (file) void sendPhoto(file);
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

function addPhoto(name, src, mine) {
  const log = app.querySelector("[data-role=log]");
  if (!log || typeof src !== "string" || !src.startsWith("data:image/")) return;
  const item = el("div", mine ? "msg mine" : "msg");
  const image = document.createElement("img");
  image.className = "chat-photo";
  image.src = src;
  image.alt = "Fotoğraf";
  image.addEventListener("click", () => openPhoto(src));
  item.append(el("span", "who", name), image);
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

function openPhoto(src) {
  const overlay = el("button", "lightbox");
  overlay.type = "button";
  overlay.setAttribute("aria-label", "Fotoğrafı kapat");
  const image = document.createElement("img");
  image.src = src;
  image.alt = "Fotoğraf";
  overlay.append(image);
  overlay.addEventListener("click", () => overlay.remove());
  document.body.append(overlay);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const attempts = [
    { max: 1280, quality: 0.72 },
    { max: 960, quality: 0.6 },
    { max: 720, quality: 0.5 },
  ];
  let dataUrl = "";
  try {
    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.max / Math.max(bitmap.width, bitmap.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", attempt.quality));
      if (!blob) continue;
      dataUrl = await blobToDataUrl(blob);
      if (dataUrl.length < 480000) break;
    }
  } finally {
    bitmap.close?.();
  }
  return dataUrl;
}

async function sendPhoto(file) {
  if (!file.type.startsWith("image/") || !state.room) return;
  let src = "";
  try {
    src = await compressImage(file);
  } catch {
    toast("Fotoğraf açılamadı");
    return;
  }
  if (!src.startsWith("data:image/") || src.length > 700000) {
    toast("Fotoğraf çok büyük");
    return;
  }
  addPhoto(currentName(), src, true);
  const payload = { src };
  if (state.peerId && state.photo) state.photo.send(payload, { target: state.peerId });
  else state.photoOutbox.push(payload);
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

function revealCall() {
  if (state.view === "call" && state.ui) return;
  state.view = "call";
  state.checking = false;
  state.joinError = "";
  const ui = renderShell();
  state.ui = ui;
  void startMic(ui);
}

async function startMic(ui) {
  if (state.micStream) {
    publish(state.micStream, { kind: "mic" });
    return;
  }
  try {
    state.micStream = await openMic();
    const micTrack = state.micStream.getAudioTracks()[0];
    if (micTrack) micTrack.contentHint = "speech";
    publish(state.micStream, { kind: "mic" });
    watchLevel(state.micStream, (level) => setPerson("self", currentName(), level > 0.06 && !state.muted));
    if (state.audioCtx?.state === "suspended") await state.audioCtx.resume();
    setStatus("Bekleniyor");
  } catch {
    ui.micBtn.classList.remove("on");
    ui.micBtn.textContent = "Mikrofon kapalı";
    setStatus("Mikrofon yok");
  }
}

function rejectJoin(message, failedRoom) {
  if (failedRoom && state.room && state.room !== failedRoom) return;
  state.checking = false;
  state.joinError = message;
  cleanup();
  const room = state.room;
  state.room = null;
  state.roomId = "";
  state.peerId = null;
  room?.leave();
  rejoinAfter = Date.now() + 1600;
  stopStream(state.micStream);
  stopStream(state.screenStream);
  state.micStream = null;
  state.screenStream = null;
  state.view = "home";
  renderHome();
}

async function enterVoice({ id, password, title, reveal }) {
  const pause = rejoinAfter - Date.now();
  if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  state.roomTitle = title;
  state.roomPassword = password;
  if (state.room && state.roomId === id) {
    state.checking = false;
    if (reveal) revealCall();
    return;
  }
  if (state.room) {
    cleanup();
    state.room.leave();
    state.room = null;
    stopStream(state.micStream);
    stopStream(state.screenStream);
    state.micStream = null;
    state.screenStream = null;
  }
  state.roomId = id;
  state.outbox = [];
  state.photoOutbox = [];
  state.peerId = null;
  state.peerName = "";
  state.checking = !reveal;
  state.joinError = "";
  if (reveal) revealCall();
  else if (state.view === "home") paintAsk();

  const owner = state.hosted?.id === id;
  if (!reveal && !owner) {
    const joinTimeout = setTimeout(() => {
      if (state.ui || state.roomId !== id) return;
      rejectJoin("Bağlanılamadı. Şifreyi ve odanın açık olduğunu kontrol et.", room);
    }, 25000);
    state.cleanups.push(() => clearTimeout(joinTimeout));
  }

  const room = joinRoom({ appId: APP_ID, password, relayConfig: RELAY }, id, {
    onPeerHandshake: async () => {
      if (Object.keys(room.getPeers()).length >= 1) throw new Error("oda-dolu");
    },
    onJoinError(details) {
      const message = String(details?.error?.message || details?.error || "");
      const wrong = /incorrect|password/i.test(message);
      const full = !wrong && (message.includes("oda-dolu") || message.includes("handshake"));
      const owner = state.hosted?.id === id;
      if (wrong) {
        if (owner) return;
        rejectJoin("Şifre yanlış.", room);
        return;
      }
      if (full) {
        if (owner || (state.ui && state.peerId)) return;
        rejectJoin("Bu oda dolu. Aynı anda iki kişi girebilir.", room);
        return;
      }
      if (state.ui) setStatus("Bağlanamadı");
      else rejectJoin("Bağlanılamadı. Şifreyi ve odanın açık olduğunu kontrol et.", room);
    },
  });
  state.room = room;
  state.chat = room.makeAction("chat");
  state.photo = room.makeAction("photo");
  const names = room.makeAction("name");
  const quality = room.makeAction("quality");
  state.quality = quality;

  state.chat.onMessage = (payload, { peerId }) => {
    if (!payload || typeof payload.text !== "string") return;
    if (peerId !== state.peerId) return;
    addMessage(state.peerName || "Karşı taraf", payload.text.slice(0, 2000), false);
  };

  state.photo.onMessage = (payload, { peerId }) => {
    if (!payload || typeof payload.src !== "string") return;
    if (peerId !== state.peerId) return;
    addPhoto(state.peerName || "Karşı taraf", payload.src, false);
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
    if (!state.ui) revealCall();
    state.peerId = peerId;
    setStatus("Bağlanıyor");
    setPerson("peer", state.peerName || "Karşı taraf");
    names.send(currentName(), { target: peerId });
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
    for (const payload of state.photoOutbox) state.photo.send(payload, { target: peerId });
    state.photoOutbox = [];
    const pc = room.getPeers()[peerId];
    const reflect = () => {
      const ice = pc?.iceConnectionState;
      const conn = pc?.connectionState;
      if (ice === "connected" || ice === "completed" || conn === "connected") {
        setStatus("Bağlı", true);
        void boostQuality(pc);
      } else if (ice === "failed" || conn === "failed") setStatus("Bağlanamadı");
      else if (ice === "disconnected" || conn === "disconnected") setStatus("Koptu");
      else setStatus("Bağlanıyor");
    };
    pc?.addEventListener("iceconnectionstatechange", reflect);
    pc?.addEventListener("connectionstatechange", reflect);
    reflect();
    scheduleBoost(peerId);
  };

  room.onPeerLeave = (peerId) => {
    if (peerId !== state.peerId) return;
    state.peerId = null;
    state.peerName = "";
    const ui = state.ui;
    if (!ui) return;
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
    if (!state.ui) revealCall();
    const ui = state.ui;
    if (!ui) return;
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

  if (state.ui) setStatus(state.peerId ? "Bağlı" : "Bekleniyor", Boolean(state.peerId));
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
  history.replaceState({}, "", location.pathname);
  state.roomId = "";
  renderHome(typeof message === "string" ? message : "");
  publishHosted();
}

window.addEventListener("pagehide", () => {
  clearHosted();
  state.room?.leave();
  stopStream(state.micStream);
  stopStream(state.screenStream);
});

history.replaceState({}, "", location.pathname);
renderHome();
startDirectory();
