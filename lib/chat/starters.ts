import type { ContactId } from "@/lib/contacts";

export type CoachStarter = {
  id: string;
  promptKey: string;
};

export const COACH_STARTERS: Record<ContactId, CoachStarter[]> = {
  alex: [
    { id: "alex-plan", promptKey: "chat.starter.alex.plan" },
    { id: "alex-form", promptKey: "chat.starter.alex.form" },
    { id: "alex-swap", promptKey: "chat.starter.alex.swap" },
  ],
  maya: [
    { id: "maya-meal", promptKey: "chat.starter.maya.meal" },
    { id: "maya-protein", promptKey: "chat.starter.maya.protein" },
    { id: "maya-water", promptKey: "chat.starter.maya.water" },
  ],
  leo: [
    { id: "leo-scan", promptKey: "chat.starter.leo.scan" },
    { id: "leo-posture", promptKey: "chat.starter.leo.posture" },
    { id: "leo-progress", promptKey: "chat.starter.leo.progress" },
  ],
  kai: [
    { id: "kai-today", promptKey: "chat.starter.kai.today" },
    { id: "kai-stuck", promptKey: "chat.starter.kai.stuck" },
    { id: "kai-win", promptKey: "chat.starter.kai.win" },
  ],
};
