import { describe, expect, it } from "vitest";
import {
  VISION_REUSE_TTL_MS,
  fingerprintVisionImage,
  selectReusableVisionRow,
  type StoredVisionRow,
} from "@/lib/kaios/vision/fingerprint";

function row(partial: Partial<StoredVisionRow> & { id: string }): StoredVisionRow {
  return {
    created_at: new Date().toISOString(),
    content: "Prior Leo summary",
    payload: {
      image_fingerprint: fingerprintVisionImage("same-bytes", "image/jpeg"),
      quality: { score: 8, issues: [], tips: [] },
      analysis: {
        visible_muscles: ["chests"],
        scores: { chests: 70 },
        overall_score: 70,
        food_analysis: null,
      },
    },
    user_id: "user-a",
    coach_id: "leo",
    message_type: "score",
    ...partial,
  };
}

describe("Leo same-image reuse policy", () => {
  const fp = fingerprintVisionImage("same-bytes", "image/jpeg");

  it("same user + same normalized fingerprint reuses (0 extra Gemini)", () => {
    const hit = selectReusableVisionRow({
      rows: [row({ id: "m1" })],
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit?.id).toBe("m1");
  });

  it("same user + changed image does not reuse", () => {
    const hit = selectReusableVisionRow({
      rows: [row({ id: "m1" })],
      fingerprint: fingerprintVisionImage("other-bytes", "image/jpeg"),
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit).toBeNull();
  });

  it("different user + same bytes does not reuse", () => {
    const hit = selectReusableVisionRow({
      rows: [row({ id: "m1", user_id: "user-a" })],
      fingerprint: fp,
      userId: "user-b",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit).toBeNull();
  });

  it("failed analysis (no analysis payload) is not reused", () => {
    const hit = selectReusableVisionRow({
      rows: [
        row({
          id: "fail",
          payload: {
            image_fingerprint: fp,
            quality: { score: 8 },
          },
        }),
      ],
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit).toBeNull();
  });

  it("idempotent replay returns the same row id", () => {
    const rows = [row({ id: "stable" })];
    const a = selectReusableVisionRow({
      rows,
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    const b = selectReusableVisionRow({
      rows,
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(a?.id).toBe("stable");
    expect(b?.id).toBe(a?.id);
  });

  it("expired TTL is not reused", () => {
    const old = new Date(Date.now() - VISION_REUSE_TTL_MS - 1000).toISOString();
    const hit = selectReusableVisionRow({
      rows: [row({ id: "old", created_at: old })],
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit).toBeNull();
  });

  it("Maya analysis-type rows are not reused for Leo scores", () => {
    const hit = selectReusableVisionRow({
      rows: [row({ id: "maya", message_type: "analysis", coach_id: "maya" })],
      fingerprint: fp,
      userId: "user-a",
      coachId: "leo",
      messageType: "score",
    });
    expect(hit).toBeNull();
  });
});
