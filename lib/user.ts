import { DEFAULT_GEM_STATE, type GemState } from "./gems";

/** Prototip — gerçek auth bağlanınca dinamik olacak */
export const DEMO_USER_NAME = "Joe";

export type UserProfile = {
  name: string;
  avatar: string;
  isNatural: boolean;
  gender: string;
  height: string;
  weight: string;
  location: string;
  bio: string;
};

/** Demo kullanıcı profili */
export const DEMO_USER_PROFILE: UserProfile = {
  name: "Joe",
  avatar: "/kaify-logo.png",
  isNatural: true,
  gender: "Erkek",
  height: "178 cm",
  weight: "75 kg",
  location: "İstanbul, Türkiye",
  bio: "Fitness yolculuğuma yeni başladım. Hedefim daha güçlü ve sağlıklı bir vücut!",
};

/** Demo gem state — başlangıç bakiyesi 1000 💎 */
export const DEMO_GEM_STATE: GemState = {
  ...DEFAULT_GEM_STATE,
  balance: 1000,
  totalEarned: 1240,
  totalSpent: 240,
  history: [
    {
      id: "gem_demo_1",
      amount: 10,
      type: "weekly_goal",
      description: "Haftalık hedef +10 💎",
      timestamp: Date.now() - 86400000,
    },
    {
      id: "gem_demo_2",
      amount: 5,
      type: "workout_complete",
      description: "Antrenman tamamlandı +5 💎",
      timestamp: Date.now() - 86400000 * 2,
    },
    {
      id: "gem_demo_3",
      amount: 2,
      type: "chat_message",
      description: "Sohbet ödülü +2 💎",
      timestamp: Date.now() - 86400000 * 3,
    },
    {
      id: "gem_demo_4",
      amount: -25,
      type: "gem_spend",
      description: "Özel antrenman programı satın alındı",
      timestamp: Date.now() - 86400000 * 5,
    },
  ],
};
