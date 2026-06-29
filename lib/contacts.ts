export type ContactId = "alex" | "maya" | "leo" | "kai";

export type CoachColor = {
  primary: string;      // Ana renk (bubble bg)
  primaryLight: string; // Açık ton (hover/glow)
  secondary: string;    // İkincil renk (gradient)
  text: string;         // Yazı rengi
  ring: string;         // Ring/highlight
  shadow: string;       // Gölge
};

export type Contact = {
  id: ContactId;
  name: string;
  role: string;
  avatar: string;
  preview: string;
  time: string;
  badge?: number;
  color: CoachColor;
};

export const CONTACTS: Record<ContactId, Contact> = {
  alex: {
    id: "alex",
    name: "Alex",
    role: "Fitness Coach",
    avatar: "/avatars/alex.png",
    preview: "Great session today! Keep the momentum 💪",
    time: "09:32",
    badge: 2,
    color: {
      primary: "#ef4444",       // red-500
      primaryLight: "#fca5a5",  // red-300
      secondary: "#dc2626",     // red-600
      text: "#fef2f2",          // red-50
      ring: "rgba(239,68,68,0.3)",
      shadow: "rgba(239,68,68,0.4)",
    },
  },
  maya: {
    id: "maya",
    name: "Dr. Maya",
    role: "Nutritionist",
    avatar: "/avatars/dr maya 1.png",
    preview: "Your meal plan is ready 🥗",
    time: "08:15",
    badge: 1,
    color: {
      primary: "#22c55e",       // green-500
      primaryLight: "#86efac",  // green-300
      secondary: "#16a34a",     // green-600
      text: "#f0fdf4",          // green-50
      ring: "rgba(34,197,94,0.3)",
      shadow: "rgba(34,197,94,0.4)",
    },
  },
  leo: {
    id: "leo",
    name: "Leo",
    role: "Body rater",
    avatar: "/avatars/leo.png",
    preview: "Your posture scan results are in 📋",
    time: "Yesterday",
    color: {
      primary: "#3b82f6",       // blue-500
      primaryLight: "#93c5fd",  // blue-300
      secondary: "#2563eb",     // blue-600
      text: "#eff6ff",          // blue-50
      ring: "rgba(59,130,246,0.3)",
      shadow: "rgba(59,130,246,0.4)",
    },
  },
  kai: {
    id: "kai",
    name: "Kai",
    role: "Teammate",
    avatar: "/kai-mascot-v2.png",
    preview: "Selam! Bugün nasıl hissediyorsun?",
    time: "14:04",
    color: {
      primary: "#a855f7",       // purple-500
      primaryLight: "#d8b4fe",  // purple-300
      secondary: "#7c3aed",     // purple-600
      text: "#faf5ff",          // purple-50
      ring: "rgba(168,85,247,0.3)",
      shadow: "rgba(168,85,247,0.4)",
    },
  },
};

export const CONTACT_LIST: ContactId[] = ["alex", "maya", "leo", "kai"];

type ChatMessage = {
  id: number;
  from: "contact" | "user";
  text: string;
  time: string;
};

export const CHAT_THREADS: Record<ContactId, ChatMessage[]> = {
  alex: [
    { id: 1, from: "contact", text: "Great session today! Keep the momentum 💪", time: "09:30" },
    { id: 2, from: "user", text: "Thanks Alex! Leg day was tough.", time: "09:31" },
    { id: 3, from: "contact", text: "You hit every set. Tomorrow we focus on recovery.", time: "09:32" },
  ],
  maya: [
    { id: 1, from: "contact", text: "Your meal plan is ready 🥗", time: "08:14" },
    { id: 2, from: "user", text: "Perfect, any changes for lunch?", time: "08:14" },
    { id: 3, from: "contact", text: "Added more protein on training days.", time: "08:15" },
  ],
  leo: [
    { id: 1, from: "contact", text: "Your posture scan results are in 📋", time: "Yesterday" },
    { id: 2, from: "user", text: "How did I score overall?", time: "Yesterday" },
    { id: 3, from: "contact", text: "Upper body 8.2/10 — shoulders need mobility work.", time: "Yesterday" },
  ],
  kai: [
    { id: 1, from: "contact", text: "Selam! Ben Kai 👋 Bugün nasılsın?", time: "14:02" },
    { id: 2, from: "user", text: "İyiyim, teşekkürler! Sen ne yapıyorsun?", time: "14:03" },
    { id: 3, from: "contact", text: "Sana eşlik etmek için buradayım. İstersen bir şeyler konuşalım.", time: "14:03" },
    { id: 4, from: "user", text: "Harika, hadi sohbet edelim 🙌", time: "14:04" },
    { id: 5, from: "contact", text: "Tamam! Ne hakkında konuşmak istersin?", time: "14:04" },
  ],
};

export function getContact(id: string): Contact | undefined {
  return CONTACTS[id as ContactId];
}
