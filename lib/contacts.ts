export type ContactId = "alex" | "maya" | "leo" | "kai";

export type CoachColor = {
  primary: string;
  primaryLight: string;
  secondary: string;
  text: string;
  ring: string;
  shadow: string;
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
      primary: "#ef4444",
      primaryLight: "#fca5a5",
      secondary: "#dc2626",
      text: "#fef2f2",
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
      primary: "#22c55e",
      primaryLight: "#86efac",
      secondary: "#16a34a",
      text: "#f0fdf4",
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
      primary: "#3b82f6",
      primaryLight: "#93c5fd",
      secondary: "#2563eb",
      text: "#eff6ff",
      ring: "rgba(59,130,246,0.3)",
      shadow: "rgba(59,130,246,0.4)",
    },
  },
  kai: {
    id: "kai",
    name: "Kai",
    role: "Teammate",
    avatar: "/kai-mascot-v2.png",
    preview: "Hey! How are you feeling today?",
    time: "14:04",
    color: {
      primary: "#a855f7",
      primaryLight: "#d8b4fe",
      secondary: "#7c3aed",
      text: "#faf5ff",
      ring: "rgba(168,85,247,0.3)",
      shadow: "rgba(168,85,247,0.4)",
    },
  },
};

export const CONTACT_LIST: ContactId[] = ["alex", "maya", "leo", "kai"];

type AnalysisCategory = {
  key: string;
  score: number;
  maxScore: number;
  color: string;
};

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes: string;
};

type WorkoutDay = {
  dayKey: string;
  focusKey: string;
  exercises: Exercise[];
};

export type WorkoutPlanData = {
  titleKey: string;
  durationKey: string;
  days: WorkoutDay[];
  tips: string[];
};

type MealItem = {
  name: string;
  calories: number;
};

type MealPlanData = {
  totalCalories: number;
  targetCalories: number;
  macros: {
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
  };
  meals: {
    labelKey: string;
    items: MealItem[];
  }[];
  tips: string[];
};

type DailySummaryData = {
  greeting: string;
  workout: {
    completed: string;
    next: string;
    status: string;
  };
  nutrition: {
    calories: { current: number; target: number };
    protein: { current: number; target: number };
    highlight: string;
  };
  bodyScore: {
    score: number;
    focus: string;
  };
  motivation: string;
};

type ChatMessage = {
  id: number;
  from: "contact" | "user";
  text: string;
  time: string;
  type?: "text" | "analysis" | "score" | "mealPlan" | "workoutPlan" | "dailySummary";
  analysis?: {
    overallScore: number;
    categories: AnalysisCategory[];
    extraCategories?: AnalysisCategory[];
    tips: string[];
  };
  mealPlan?: MealPlanData;
  workoutPlan?: WorkoutPlanData;
  dailySummary?: DailySummaryData;
};

export const CHAT_THREADS: Record<ContactId, ChatMessage[]> = {
  alex: [
    {
      id: 1, from: "contact", time: "09:30",
      type: "workoutPlan",
      text: "Your weekly program is ready! 💪",
      workoutPlan: {
        titleKey: "workout.program_title",
        durationKey: "workout.3day_split",
        days: [
          {
            dayKey: "workout.day1",
            focusKey: "workout.chest_triceps",
            exercises: [
              { name: "Bench Press", sets: 4, reps: "8-10", notes: "Most effective exercise for chest mass. Keep elbows at 45°." },
              { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", notes: "Ideal for upper chest development." },
              { name: "Cable Fly", sets: 3, reps: "12-15", notes: "Control the movement, focus on chest contraction." },
              { name: "Triceps Pushdown", sets: 3, reps: "12-15", notes: "Keep elbows fixed, only forearms should move." },
              { name: "Overhead Triceps Extension", sets: 3, reps: "10-12", notes: "Targets the long head of the triceps." },
            ],
          },
          {
            dayKey: "workout.day2",
            focusKey: "workout.back_biceps",
            exercises: [
              { name: "Pull-Up", sets: 3, reps: "6-10", notes: "Add weight if ready. Feel the back contraction." },
              { name: "Barbell Row", sets: 4, reps: "8-10", notes: "Keep your back straight, squeeze shoulder blades." },
              { name: "Lat Pulldown", sets: 3, reps: "10-12", notes: "Pull the bar to your chest, squeeze your lats." },
              { name: "Dumbbell Biceps Curl", sets: 3, reps: "10-12", notes: "Keep elbows fixed, only forearms should move." },
              { name: "Hammer Curl", sets: 3, reps: "10-12", notes: "Targets the brachialis muscle for thicker arms." },
            ],
          },
          {
            dayKey: "workout.day3",
            focusKey: "workout.legs_shoulders",
            exercises: [
              { name: "Squat", sets: 4, reps: "8-10", notes: "Don't let knees pass toes, keep your back straight." },
              { name: "Romanian Deadlift", sets: 3, reps: "10-12", notes: "For hamstrings and glutes. Push hips back." },
              { name: "Leg Press", sets: 3, reps: "10-12", notes: "Push through your heels, focus on quads." },
              { name: "Standing Calf Raise", sets: 4, reps: "15-20", notes: "Hold at the top for 1 second for max contraction." },
              { name: "Shoulder Press", sets: 4, reps: "8-10", notes: "Target all shoulder heads, keep elbows slightly bent." },
              { name: "Lateral Raise", sets: 3, reps: "12-15", notes: "Light weight, controlled movement for side delts." },
            ],
          },
        ],
        tips: [
          "Don't forget to warm up for 10 minutes before training",
          "Rest 60-90 seconds between sets",
          "Stretch for 5-10 minutes after each workout",
          "Add at least 2 rest days per week",
        ],
      },
    },
    { id: 2, from: "user", text: "Thanks Alex! Leg day was tough.", time: "09:31" },
    { id: 3, from: "contact", text: "You hit every set. Tomorrow we focus on recovery.", time: "09:32" },
  ],
  maya: [
    {
      id: 1, from: "contact", time: "08:14",
      type: "mealPlan",
      text: "Your daily meal plan is ready 🥗",
      mealPlan: {
        totalCalories: 1840,
        targetCalories: 2100,
        macros: {
          protein: { current: 98, target: 150 },
          carbs: { current: 180, target: 250 },
          fat: { current: 42, target: 65 },
        },
        meals: [
          {
            labelKey: "meal.breakfast",
            items: [
              { name: "Oatmeal", calories: 200 },
              { name: "Eggs (2 pcs)", calories: 140 },
            ],
          },
          {
            labelKey: "meal.lunch",
            items: [
              { name: "Chicken Salad", calories: 450 },
            ],
          },
          {
            labelKey: "meal.dinner",
            items: [
              { name: "Grilled Salmon", calories: 520 },
              { name: "Steamed Vegetables", calories: 120 },
            ],
          },
          {
            labelKey: "meal.snack",
            items: [
              { name: "Almonds (30g)", calories: 180 },
              { name: "Yogurt", calories: 110 },
            ],
          },
        ],
        tips: [
          "Increase protein intake at dinner",
          "Don't forget to drink 2 liters of water throughout the day",
          "Pay attention to carb intake after workouts",
        ],
      },
    },
    { id: 2, from: "user", text: "Perfect, any changes for lunch?", time: "08:14" },
    { id: 3, from: "contact", text: "Added more protein on training days.", time: "08:15" },
  ],
  leo: [
    { 
      id: 1, from: "contact", time: "Yesterday",
      type: "analysis",
      text: "Your posture scan results are in 📋",
      analysis: {
        overallScore: 8.2,
        categories: [
          { key: "analysis.shoulders", score: 7.5, maxScore: 10, color: "#f59e0b" },
          { key: "analysis.chest", score: 8.5, maxScore: 10, color: "#3b82f6" },
          { key: "analysis.back", score: 9.0, maxScore: 10, color: "#10b981" },
          { key: "analysis.bicepsAndTriceps", score: 8.0, maxScore: 10, color: "#8b5cf6" },
          { key: "analysis.forearms", score: 7.0, maxScore: 10, color: "#ec4899" },
          { key: "analysis.core", score: 8.8, maxScore: 10, color: "#ef4444" },
        ],
        tips: [
          "Add shoulder mobility stretches to your routine",
          "Rowing exercises are recommended to strengthen your back",
          "Do 10 minutes of core exercises daily",
        ],
      },
    },
    { id: 2, from: "user", text: "How did I score overall?", time: "Yesterday" },
    { 
      id: 3, from: "contact", time: "Yesterday",
      type: "score",
      text: "Upper body 8.2/10 — shoulders need mobility work.",
    },
  ],
  kai: [
    {
      id: 1, from: "contact", time: "20:00",
      type: "dailySummary",
      text: "Hey! How was your day? I've been looking forward to talking with you! 🤗",
      dailySummary: {
        greeting: "Hey buddy! Today was an amazing day for you! 🎉",
        workout: {
          completed: "Chest & Triceps",
          next: "Back & Biceps (tomorrow)",
          status: "3/3 workouts completed! Perfect week! 🔥",
        },
        nutrition: {
          calories: { current: 1840, target: 2100 },
          protein: { current: 98, target: 150 },
          highlight: "Chicken salad for lunch was a great choice! You'll catch up on protein with salmon at dinner 💪",
        },
        bodyScore: {
          score: 8.2,
          focus: "Pay a bit more attention to shoulder mobility. Alex's Lateral Raises in the program will help!",
        },
        motivation: "You burned 1,840 calories today and you have a 4-day streak! You're getting better every single day. I'm so proud of you buddy! 🤝🔥 Tomorrow is a new day, let's crush it again! 💪",
      },
    },
  ],
};

export function getContact(id: string): Contact | undefined {
  return CONTACTS[id as ContactId];
}