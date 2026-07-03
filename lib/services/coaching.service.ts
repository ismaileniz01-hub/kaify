import { listActiveCoaches } from "@/lib/services/coach.service";

/**
 * Multi-agent sync (Team awareness).
 *
 * The 4 coaches form one team and share the same user memory
 * (`user_coaching_state` + `coaching_memory`). `syncAgents` produces a team
 * system-prompt fragment that lets the active coach reference teammates'
 * expertise instead of overstepping — the "read-only observation" of others.
 */

export type SyncAgentsResult = {
  teamPrompt: string;
  teammates: string[];
};

export async function syncAgents(params: {
  activeCoachId: string;
}): Promise<SyncAgentsResult> {
  const coaches = await listActiveCoaches();

  const teammates = coaches
    .filter((coach) => coach.id !== params.activeCoachId)
    .map((coach) => `${coach.name} (${coach.role})`);

  if (teammates.length === 0) {
    return { teamPrompt: "", teammates };
  }

  const teamPrompt = [
    `You are part of the Kaify coaching team alongside ${teammates.join(", ")}.`,
    "You all share the same memory about this user, so stay consistent with what teammates know.",
    "When a question falls under a teammate's expertise, briefly reference them and what they would advise, instead of overstepping your own domain.",
  ].join(" ");

  return { teamPrompt, teammates };
}
