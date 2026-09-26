/**
 * Short-form subscription and health disclosure copy for UI surfaces.
 * Full legal terms live in Terms of Service; do not contradict this copy.
 */

import {
  PADDLE_BUYER_TERMS_URL,
  PADDLE_PRIVACY_URL,
  PADDLE_REFUND_POLICY_URL,
} from "@/lib/legal/constants";

export const SUBSCRIPTION_DISCLOSURES = {
  pricingNearCta: {
    en: "Paid plans renew automatically via Paddle (Merchant of Record) until you cancel. Price and tax shown at checkout. Cancel anytime in Settings → Manage billing before renewal to avoid the next charge. Paddle Buyer Terms and Refund Policy apply to the payment.",
    tr: "Ücretli planlar, iptal edene kadar Paddle (Merchant of Record) üzerinden otomatik yenilenir. Fiyat ve vergi ödeme ekranında görünür. Sonraki ücreti ödememek için yenilemeden önce Ayarlar → Faturalandırmayı yönet üzerinden iptal edin. Ödeme için Paddle Alıcı Şartları ve İade Politikası geçerlidir.",
  },
  checkoutLaunch: {
    en: "You will complete purchase with Paddle. Paddle collects payment and applicable taxes. Kaify provides the fitness service. See Paddle Buyer Terms, Refund Policy, and Privacy Notice.",
    tr: "Satın alma Paddle ile tamamlanır. Ödemeyi ve geçerli vergileri Paddle tahsil eder. Kaify fitness hizmetini sağlar. Paddle Alıcı Şartları, İade Politikası ve Gizlilik Bildirimi'ne bakın.",
  },
  trial: {
    en: "If a free or paid trial is offered, it converts to the displayed paid price unless you cancel before the trial ends. Trial availability is shown at checkout.",
    tr: "Ücretsiz veya ücretli deneme sunulursa, deneme bitmeden iptal etmezseniz gösterilen ücretli fiyata geçer. Deneme koşulları ödeme ekranında yer alır.",
  },
  accountSubscription: {
    en: "Your subscription status is managed with Paddle. Use Manage billing to cancel, update payment method, or view invoices. Cancelling stops future renewals; access usually continues until the paid period ends unless immediate cancellation applies.",
    tr: "Abonelik durumunuz Paddle ile yönetilir. İptal, ödeme yöntemi veya faturalar için Faturalandırmayı yönet'i kullanın. İptal sonraki yenilemeleri durdurur; anında iptal geçerli değilse erişim genellikle ödenen dönemin sonuna kadar sürer.",
  },
  cancellation: {
    en: "Cancel before the renewal date to avoid the next charge. Account deletion separately cancels live subscriptions immediately when successful and deletes your Kaify account — it is not the same as Manage billing cancel, and does not automatically create a refund.",
    tr: "Sonraki ücreti önlemek için yenileme tarihinden önce iptal edin. Hesap silme, başarılı olduğunda canlı abonelikleri hemen iptal eder ve Kaify hesabınızı siler — Faturalandırmayı yönet iptaliyle aynı değildir ve otomatik iade oluşturmaz.",
  },
  priceChange: {
    en: "Future prices may change after notice. Increases for existing renewals require notice and, where law requires, consent. You may cancel before the new price takes effect.",
    tr: "Gelecek fiyatlar bildirimden sonra değişebilir. Mevcut yenilemelerdeki artışlar bildirim ve yasaların gerektirdiği yerde onay ister. Yeni fiyat yürürlüğe girmeden iptal edebilirsiniz.",
  },
  healthWarningShort: {
    en: "Kaify is not medical advice. Stop if you feel unwell and seek professional help. 16+ only.",
    tr: "Kaify tıbbi tavsiye değildir. Kendinizi kötü hissederseniz durun ve profesyonel yardım alın. Yalnızca 16+.",
  },
  paddleLinks: {
    buyerTerms: PADDLE_BUYER_TERMS_URL,
    refundPolicy: PADDLE_REFUND_POLICY_URL,
    privacy: PADDLE_PRIVACY_URL,
  },
} as const;
