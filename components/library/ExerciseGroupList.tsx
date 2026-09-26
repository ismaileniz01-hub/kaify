"use client";

import { useState } from "react";
import { ExerciseDetailSheet } from "@/components/library/ExerciseDetailSheet";
import { useLang } from "@/lib/lang-context";
import {
  groupColors,
  groupGradients,
  groupIcons,
  type ExerciseGroup,
  type ExerciseGroupId,
} from "@/lib/exercise-library";

type Place = "gym" | "home";

type Props = {
  groups: ExerciseGroup[];
  place: Place;
};

export function ExerciseGroupList({ groups, place }: Props) {
  const { t } = useLang();
  const [selected, setSelected] = useState<{
    key: string;
    groupId: ExerciseGroupId;
  } | null>(null);

  return (
    <>
      {groups.map((group, gi) => (
        <div
          key={group.id}
          className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-b shadow-xl shadow-black/40 transition-all duration-300 ${groupGradients[group.id]}`}
          style={{ animationDelay: `${(gi + 1) * 80}ms` }}
        >
          <div
            className={`flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 ${groupColors[group.id]}`}
          >
            <span className="text-lg">{groupIcons[group.id]}</span>
            <h2 className="text-sm font-bold text-white">
              {t(`exercise.${group.id}`)}
            </h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {group.exercises.map((exercise, ei) => (
              <button
                key={exercise.key}
                type="button"
                onClick={() =>
                  setSelected({ key: exercise.key, groupId: group.id })
                }
                className="flex w-full items-center px-4 py-2.5 text-left transition hover:bg-white/[0.04]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                    <span className="text-[10px] font-bold text-zinc-500">
                      {ei + 1}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-300">
                    {t(exercise.key)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {selected ? (
        <ExerciseDetailSheet
          exerciseKey={selected.key}
          groupId={selected.groupId}
          place={place}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
