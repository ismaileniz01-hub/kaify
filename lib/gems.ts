/** Gem puan sistemi — çekirdek veri yapıları ve yardımcı fonksiyonlar */

export type GemTransactionType =
  | "daily_login"
  | "chat_message"
  | "workout_complete"
  | "streak_milestone"
  | "weekly_goal"
  | "trophy_unlock"
  | "gem_spend";

export type GemTransaction = {
  id: string;
  amount: number; // pozitif = kazanma, negatif = harcama
  type: GemTransactionType;
  description: string;
  timestamp: number; // Date.now()
};

export type GemState = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  history: GemTransaction[];
};

/** Varsayılan başlangıç bakiyesi */
export const DEFAULT_GEM_STATE: GemState = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  history: [],
};

/** Puan kazanma tablosu (ileride dinamik yapılabilir) */
export const GEM_REWARDS: Record<GemTransactionType, number> = {
  daily_login: 1,
  chat_message: 2,
  workout_complete: 5,
  streak_milestone: 15,
  weekly_goal: 10,
  trophy_unlock: 25,
  gem_spend: 0, // harcama için kullanılmaz
};

/** Yeni bir işlem oluştur */
export function createTransaction(
  amount: number,
  type: GemTransactionType,
  description: string,
): GemTransaction {
  return {
    id: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    amount,
    type,
    description,
    timestamp: Date.now(),
  };
}

/** İşlemi state'e uygula (immutable) */
export function applyTransaction(
  state: GemState,
  transaction: GemTransaction,
): GemState {
  const newBalance = state.balance + transaction.amount;

  return {
    balance: newBalance,
    totalEarned:
      transaction.amount > 0
        ? state.totalEarned + transaction.amount
        : state.totalEarned,
    totalSpent:
      transaction.amount < 0
        ? state.totalSpent + Math.abs(transaction.amount)
        : state.totalSpent,
    history: [transaction, ...state.history],
  };
}

/** Birden çok işlemi state'e uygula */
export function applyTransactions(
  state: GemState,
  transactions: GemTransaction[],
): GemState {
  return transactions.reduce(applyTransaction, state);
}

/** Harcama yapılabilir mi kontrol et */
export function canSpend(state: GemState, amount: number): boolean {
  return state.balance >= amount;
}

/** Harcama işlemi oluştur ve uygula (guvenli) */
export function spendGems(
  state: GemState,
  amount: number,
  description: string,
): { state: GemState; success: boolean; error?: string } {
  if (!canSpend(state, amount)) {
    return {
      state,
      success: false,
      error: `Yetersiz bakiye. Mevcut: ${state.balance}, Gerekli: ${amount}`,
    };
  }

  const tx = createTransaction(-amount, "gem_spend", description);
  return { state: applyTransaction(state, tx), success: true };
}

/** Belirli bir türden kazanma işlemi oluştur */
export function earnGems(
  state: GemState,
  type: GemTransactionType,
  customAmount?: number,
  customDescription?: string,
): { state: GemState; transaction: GemTransaction } {
  const amount = customAmount ?? GEM_REWARDS[type];
  const description =
    customDescription ?? getDefaultDescription(type, amount);

  const tx = createTransaction(amount, type, description);
  return { state: applyTransaction(state, tx), transaction: tx };
}

/** Varsayılan açıklama metni */
function getDefaultDescription(
  type: GemTransactionType,
  amount: number,
): string {
  const descriptions: Record<GemTransactionType, string> = {
    daily_login: `Günlük giriş +${amount} 💎`,
    chat_message: `Sohbet ödülü +${amount} 💎`,
    workout_complete: `Antrenman tamamlandı +${amount} 💎`,
    streak_milestone: `Streak kilometre taşı +${amount} 💎`,
    weekly_goal: `Haftalık hedef +${amount} 💎`,
    trophy_unlock: `Kupa açıldı +${amount} 💎`,
    gem_spend: "",
  };
  return descriptions[type];
}

/** İşlem geçmişini zamana göre filtrele (son N gün) */
export function getRecentTransactions(
  history: GemTransaction[],
  days: number,
): GemTransaction[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((tx) => tx.timestamp >= cutoff);
}

/** Bugün kazanılan toplam gem */
export function getTodayEarned(history: GemTransaction[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  return history
    .filter((tx) => tx.amount > 0 && tx.timestamp >= todayTs)
    .reduce((sum, tx) => sum + tx.amount, 0);
}
