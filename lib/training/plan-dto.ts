import type { SetPrescription } from "@/lib/training/progression";

export type WorkoutPlanItemDTO = SetPrescription & {
  dayIndex: number;
  sortOrder: number;
  labelKey: string;
  substitutes: string[];
};

export type WorkoutPlanDTO = {
  id: string;
  templateSlug: string;
  titleKey: string;
  place: "gym" | "home";
  version: number;
  status: "active" | "paused" | "deload" | "completed";
  today: WorkoutPlanItemDTO[];
  templates: Array<{ slug: string; titleKey: string; place: "gym" | "home" }>;
  available: boolean;
};
