export type ContactId = "alex" | "maya" | "leo" | "kai";

export type Contact = {
  id: ContactId;
  name: string;
  role: string;
  avatar: string;
  preview: string;
  time: string;
  badge?: number;
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
  },
  maya: {
    id: "maya",
    name: "Dr. Maya",
    role: "Nutritionist",
    avatar: "/avatars/dr maya 1.png",
    preview: "Your meal plan is ready 🥗",
    time: "08:15",
    badge: 1,
  },
  leo: {
    id: "leo",
    name: "Leo",
    role: "Body rater",
    avatar: "/avatars/leo.png",
    preview: "Your posture scan results are in 📋",
    time: "Yesterday",
  },
  kai: {
    id: "kai",
    name: "Kai",
    role: "Teammate",
    avatar: "/kai-mascot-v2.png",


    preview: "Selam! Bugün nasıl hissediyorsun?",
    time: "14:04",
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
