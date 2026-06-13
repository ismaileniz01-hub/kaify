import { NextResponse } from "next/server";

// Demo leaderboard verisi — gerçek uygulamada veritabanından gelecek
const DEMO_LEADERBOARD = [
  { userId: "user_001", name: "Joe", flagCode: "tr", streak: 284, avatar: "/kaify-logo.png" },
  { userId: "user_002", name: "Sarah", flagCode: "us", streak: 212, avatar: "" },
  { userId: "user_003", name: "Lucas", flagCode: "br", streak: 158, avatar: "" },
  { userId: "user_004", name: "Hans", flagCode: "de", streak: 112, avatar: "" },
  { userId: "user_005", name: "Emma", flagCode: "gb", streak: 79, avatar: "" },
  { userId: "user_006", name: "Carlos", flagCode: "es", streak: 67, avatar: "" },
  { userId: "user_007", name: "Yuki", flagCode: "jp", streak: 54, avatar: "" },
  { userId: "user_008", name: "Raj", flagCode: "in", streak: 48, avatar: "" },
  { userId: "user_009", name: "Pierre", flagCode: "fr", streak: 41, avatar: "" },
  { userId: "user_010", name: "Ali", flagCode: "ae", streak: 35, avatar: "" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // Sırala (streak'e göre azalan)
  const sorted = [...DEMO_LEADERBOARD].sort((a, b) => b.streak - a.streak);

  // Kullanıcının sırasını bul
  const userRank = userId
    ? sorted.findIndex((u) => u.userId === userId) + 1
    : null;

  return NextResponse.json({
    leaderboard: sorted,
    userRank: userRank && userRank > 0 ? userRank : null,
    totalUsers: sorted.length,
  });
}
