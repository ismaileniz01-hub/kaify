export type ExerciseGroupId =
  | "chest"
  | "shoulders"
  | "back"
  | "legs"
  | "arms"
  | "core";

export type ExerciseEntry = {
  /** i18n key under library.ex.* */
  key: string;
};

export type ExerciseGroup = {
  id: ExerciseGroupId;
  exercises: ExerciseEntry[];
};

export const HOME_EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    id: "chest",
    exercises: [
      { key: "library.ex.home.wide_grip_pushups" },
      { key: "library.ex.home.diamond_pushups" },
      { key: "library.ex.home.decline_pushups" },
      { key: "library.ex.home.archer_pushups" },
      { key: "library.ex.home.floor_press" },
    ],
  },
  {
    id: "shoulders",
    exercises: [
      { key: "library.ex.home.pike_pushups" },
      { key: "library.ex.home.wall_walk" },
      { key: "library.ex.home.dolphin_pushups" },
      { key: "library.ex.home.side_lateral_raise" },
      { key: "library.ex.home.front_raise" },
    ],
  },
  {
    id: "back",
    exercises: [
      { key: "library.ex.home.superman" },
      { key: "library.ex.home.reverse_snow_angels" },
      { key: "library.ex.home.doorway_rows" },
      { key: "library.ex.home.inverted_rows" },
      { key: "library.ex.home.swimmers" },
    ],
  },
  {
    id: "legs",
    exercises: [
      { key: "library.ex.home.wall_sit" },
      { key: "library.ex.home.jump_squats" },
      { key: "library.ex.home.curtsy_lunges" },
      { key: "library.ex.home.side_lunges" },
      { key: "library.ex.home.glute_bridges" },
    ],
  },
  {
    id: "arms",
    exercises: [
      { key: "library.ex.home.triceps_dips" },
      { key: "library.ex.home.chair_pushups" },
      { key: "library.ex.home.bicep_curls" },
      { key: "library.ex.home.hammer_curls" },
    ],
  },
  {
    id: "core",
    exercises: [
      { key: "library.ex.home.bicycle_crunches" },
      { key: "library.ex.home.leg_raises" },
      { key: "library.ex.home.flutter_kicks" },
      { key: "library.ex.home.mountain_climbers" },
      { key: "library.ex.home.plank_jacks" },
    ],
  },
];

export const GYM_EXERCISE_GROUPS: ExerciseGroup[] = [
  {
    id: "chest",
    exercises: [
      { key: "library.ex.gym.bench_press" },
      { key: "library.ex.gym.incline_bench_press" },
      { key: "library.ex.gym.decline_bench_press" },
      { key: "library.ex.gym.dumbbell_fly" },
      { key: "library.ex.gym.cable_crossover" },
      { key: "library.ex.gym.chest_press_machine" },
      { key: "library.ex.gym.pec_deck_machine" },
    ],
  },
  {
    id: "back",
    exercises: [
      { key: "library.ex.gym.deadlift" },
      { key: "library.ex.gym.pull_up" },
      { key: "library.ex.gym.lat_pulldown" },
      { key: "library.ex.gym.bent_over_row" },
      { key: "library.ex.gym.seated_cable_row" },
      { key: "library.ex.gym.t_bar_row" },
      { key: "library.ex.gym.single_arm_dumbbell_row" },
      { key: "library.ex.gym.straight_arm_pulldown" },
    ],
  },
  {
    id: "shoulders",
    exercises: [
      { key: "library.ex.gym.overhead_press" },
      { key: "library.ex.gym.dumbbell_shoulder_press" },
      { key: "library.ex.gym.lateral_raise" },
      { key: "library.ex.gym.front_raise" },
      { key: "library.ex.gym.rear_delt_fly" },
      { key: "library.ex.gym.arnold_press" },
      { key: "library.ex.gym.face_pull" },
      { key: "library.ex.gym.upright_row" },
    ],
  },
  {
    id: "arms",
    exercises: [
      { key: "library.ex.gym.barbell_curl" },
      { key: "library.ex.gym.dumbbell_curl" },
      { key: "library.ex.gym.hammer_curl" },
      { key: "library.ex.gym.preacher_curl" },
      { key: "library.ex.gym.triceps_pushdown" },
      { key: "library.ex.gym.overhead_triceps_extension" },
      { key: "library.ex.gym.skull_crusher" },
      { key: "library.ex.gym.close_grip_bench_press" },
      { key: "library.ex.gym.dumbbell_kickbacks" },
    ],
  },
  {
    id: "legs",
    exercises: [
      { key: "library.ex.gym.barbell_squat" },
      { key: "library.ex.gym.leg_press" },
      { key: "library.ex.gym.lunge" },
      { key: "library.ex.gym.leg_extension" },
      { key: "library.ex.gym.leg_curl" },
      { key: "library.ex.gym.romanian_deadlift" },
      { key: "library.ex.gym.hip_thrust" },
      { key: "library.ex.gym.bulgarian_split_squat" },
      { key: "library.ex.gym.calf_raise" },
      { key: "library.ex.gym.hack_squat" },
    ],
  },
  {
    id: "core",
    exercises: [
      { key: "library.ex.gym.weighted_crunch" },
      { key: "library.ex.gym.hanging_leg_raise" },
      { key: "library.ex.gym.cable_crunch" },
      { key: "library.ex.gym.russian_twist_weighted" },
      { key: "library.ex.gym.hyperextension_weighted" },
      { key: "library.ex.gym.plank_with_plate" },
    ],
  },
];

export const groupColors: Record<ExerciseGroupId, string> = {
  chest: "border-blue-500/60",
  back: "border-emerald-500/60",
  shoulders: "border-purple-500/60",
  arms: "border-orange-500/60",
  legs: "border-rose-500/60",
  core: "border-amber-500/60",
};

export const groupGradients: Record<ExerciseGroupId, string> = {
  chest: "from-blue-950/60 via-zinc-900 to-zinc-900",
  back: "from-emerald-950/60 via-zinc-900 to-zinc-900",
  shoulders: "from-purple-950/60 via-zinc-900 to-zinc-900",
  arms: "from-orange-950/60 via-zinc-900 to-zinc-900",
  legs: "from-rose-950/60 via-zinc-900 to-zinc-900",
  core: "from-amber-950/60 via-zinc-900 to-zinc-900",
};

export const groupIcons: Record<ExerciseGroupId, string> = {
  chest: "🫀",
  back: "🦍",
  shoulders: "💪",
  arms: "💪",
  legs: "🦵",
  core: "🔥",
};
