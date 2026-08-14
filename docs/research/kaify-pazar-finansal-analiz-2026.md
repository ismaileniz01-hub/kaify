# Kaify Ai — Pazar araştırması, maliyet ve gelir modeli

**Tarih:** 14 Ağustos 2026  
**Para birimi:** USD (ürün fiyatları USD; Paddle checkout). TRY karşılığı ayrıca verilir.  
**Kur:** 1 USD ≈ **47,89 TRY** (14.08.2026 sabah serbest piyasa satış, TGRT Haber). TCMB gösterge kuru gün içinde 15:30’da açıklanır; rapordaki TRY rakamları bu sabah kuruna göre yuvarlanmıştır.  
**Kapsam:** Karar destek modeli; yatırım tavsiyesi değildir.  
**Etiketler:** **[Tespit]** repo/gerçek ürün · **[Benchmark]** dış kaynak · **[Varsayım]** model varsayımı

Yuvarlama: tablolarda $1–$20 sapma normaldir.

---

## 0. Bu prompt Kaify Ai’ye nasıl uyarlandı?

Genel mobil-uygulama şablonundan şu farklar bilinçli olarak işlendi:

| Şablon varsayımı | Kaify Ai gerçeği **[Tespit]** |
|---|---|
| App Store / Play IAP ve %15–30 mağaza komisyonu | **IAP yok.** ADR 019: native uygulama tüketim-only; abonelik **Paddle Merchant of Record** ile yalnızca sitede (`kaifyai.org/pricing`). |
| Ücretsiz deneme + mağaza içi paywall | Kodda **satın almadan otomatik Essential yok**; kotasız / unpaid tier reddedilir. Native’de kayıt ve fiyat CTA yok. |
| Reklam geliri | Üründe reklam SDK’sı yok; modelde reklam geliri **0**. |
| Tek seferlik uygulama fiyatı | Gelir modeli **aylık/yıllık abonelik** (Essential / Pro / Premium). |
| Hedef pazar ABD-only | Fiyatlar USD; UI TR+EN öncelikli, DE/FR/ES/IT/AR picker’da. |

Paddle kamu fiyatı: **%5 + 0,50 USD / başarılı checkout** ([paddle.com/pricing](https://www.paddle.com/pricing), 2026). KDV/VAT’ı MoR olarak Paddle tahsil eder; satıcının brüt listesi USD’dir. Bu raporda “mağaza kesintisi” = **Paddle ücreti**, Apple/Google komisyonu **0**.

---

## 1. Proje özeti (kod ve belgelerden)

### Tek cümlelik tanım **[Tespit]**

Kaify Ai, web (Next.js 15 / Vercel) ve Capacitor iOS/Android kabuğu üzerinden çalışan, dört kişilik AI koç ekibi (Alex, Dr. Maya, Leo, Kai) ile antrenman, beslenme fotoğraf analizi, fizik/duruş taraması, gamification ve abonelik sunan bir AI fitness koçudur. Üretim: `https://kaifyai.org`.

### Çözdüğü problem **[Tespit]**

Kullanıcı antrenman programı, kalori takibi, duruş/fizik geri bildirimi ve hesap verebilirliği ayrı uygulamalara ve pahalı insan koçlara bölmek zorunda kalır. Ürün bunu tek abonelikte birleştirmeyi vaat eder (pazarlama: “elsewhere stack” ~140–340 USD/ay).

### Hedef kitle **[Varsayım + Tespit]**

- Birincil: 18–40, spor salonuna giden veya evde antrenman yapan, Türkçe veya İngilizce konuşan, fotoğrafla yemek/fizik analizi isteyen kullanıcılar.
- İkincil: DE/FR/ES/IT/AR arayüzü açık pazarlar.
- B2B/takım paketi kodda yok.

### Temel kullanım senaryoları **[Tespit]**

1. Web’de OTP ile kayıt → onboarding → Paddle checkout → native uygulamada oturum.
2. Koç sohbeti (DeepSeek, kota kapılı).
3. Maya: yemek fotoğrafı (Gemini vision).
4. Leo: fizik/duruş taraması (haftalık kota).
5. Günlük check-in, streak, gem, Kai evrimi, liderlik tablosu, market (gem ile kozmetik).

### Ana değer **[Tespit]**

LLM sohbet + vision tarama + alışkanlık döngüsü (streak/Kai) + analitik; insan PT fiyatının altında konumlandırılmış üç kademeli abonelik.

### Ayrışma adayları **[Tespit]**

- Dört persona (antrenman / beslenme / fizik / ejderha arkadaş) tek üründe.
- Gamification (Kai, Freezie, market, ülke liderliği).
- Web-first Paddle MoR: küresel vergi uyumu kurucu üzerinde değil; native I’da IAP yok (dönüşüm maliyeti yüksek — aşağıda).
- KVKK/GDPR taslakları, DSAR, silme, AI/fotoğraf rızası kodda var; avukat imzası bekliyor.

### Ürün aşaması **[Tespit]**

- Web üretimde.
- Native: `org.kaify.app`; Play URL belgede var; App Store Team ID / imza SHA-256 **placeholder** (store kapısı açık değil).
- Path-to-90 (04.08.2026) taban skor **41 / NO GO**; sonraki fazların çoğu kodda işaretli, operatör/legal kapıları (HIBP, avukat, store) kapanmamış.
- Test açığı (ürün denetimi): kimlikli E2E ve gerçek DB RLS testleri zayıf.

**Lansman hazırlığı:** web ticareti için yakın; mağaza + hukuki imza + native dönüşüm hunisi için **hazır değil**.

### Gelir modelleri (mevcut) **[Tespit]**

| Model | Durum |
|---|---|
| Aylık/yıllık abonelik | Canlı tasarım: 14,99 / 24,99 / 34,99 USD; yıllık = 11 ay öde 12 ay kullan (~%8,3) |
| Freemium | Yok (unpaid kota reddi) |
| IAP / mağaza | Bilinçli olarak yok |
| Reklam | Yok |
| Kullanım bazlı fatura | Yok (kota aboneliğe bağlı) |
| B2B | Yok |

### Geliri sınırlayan ürün eksikleri **[Tespit]**

1. Native’de kayıt/ödeme yok → mağaza indirmesi gelire zor dönüşür.
2. Ücretsiz deneme yok (kategori medyanı deneme ile daha yüksek dönüşüm).
3. Wearable/HealthKit yok.
4. DeepSeek CN aktarımı hukuken açık.
5. AI ikincil çağrılar kotayı şişirebilir (denetim AI-003).
6. Marka bilinirliği ve ASO henüz ölçülmemiş.

### Bilinmeyenler

1. Canlı ödeyen abone ve MRR.
2. Gerçek Paddle kontratı (kamu %5+$0,50 mı).
3. Üretimde Vercel/Supabase fatura kalemi.
4. Kurucunun batık nakit ve saat.
5. Mağazaların gerçek yayında olup olmadığı.

Kritik belirsizlik raporu durduracak düzeyde değil; aşağıdaki varsayımlarla devam edildi.

---

## 2. Pazar araştırması

### Pazar büyüklüğü (küresel fitness uygulaması)

Kaynaklar tanımları farklı tuttuğu için **aralık** kullanılır **[Benchmark]**:

| Kaynak | 2025/2026 büyüklük | CAGR | Coğrafya | Yayın |
|---|---|---|---|---|
| [Grand View Research](https://www.grandviewresearch.com/industry-analysis/fitness-app-market) | 12,12 B USD (2025) → 13,92 B (2026) | %13,40 (2026–2033) | Küresel | 2026 sayfa |
| [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/digital-fitness-apps-market) | 15,35 B USD (2026) → 28,30 B (2031) | %13,01 | Küresel | 2026 |
| [Research and Markets / The Business Research Company](https://www.researchandmarkets.com/reports/5767298/fitness-app-market-report) | 17,71 B (2025) → 22,36 B (2026) | ~%26 | Küresel | Şub 2026 |
| [The Insight Partners](https://www.theinsightpartners.com/reports/sports-and-fitness-app-market) | 9,72 B (2025) | %9,95 | “Sports and Fitness App” | 2026 |

**Kullanılan çalışma aralığı [Varsayım]:** 2026 küresel fitness/dijital fitness uygulama pazarı **~12–22 B USD**; muhafazakâr CAGR **~%13**.

### Türkiye

| Kaynak | Veri | Tarih |
|---|---|---|
| [Deep Market Insights — Turkey Online Fitness](https://deepmarketinsights.com/vista/insights/online-fitness-market/turkey) | 262,66 M USD (2025); mobil uygulama dilimi 118,91 M USD; CAGR %25,72 (2026–2034) | 2025 baz yıl |
| [EY — Dijital sağlıkta dünya ve Türkiye](https://www.ey.com/content/dam/ey-unified-site/ey-com/tr-tr/industries/life-sciences/documents/dijital-saglikta-dunya-ve-turkiye-perspektifi-raporu.pdf) | TR dijital sağlık ~1,16 B USD (2022) → ~2,13 B (2027); YBBO ~%12,9 | EY raporu |

Online fitness ≠ yalnızca AI koç aboneliği (canlı ders, wearable dahildir). AI koç SAM’i bunun alt kümesidir.

### TAM / SAM / SOM **[Varsayım, yöntem açık]**

Yöntem: yukarıdaki pazar aralıklarından daraltma; indirme uydurulmadı.

| Katman | Tanım | Tahmin (2026, yıllık ciro) |
|---|---|---|
| **TAM** | Küresel fitness uygulaması abonelik+IAP | **12–22 B USD** (GVR–RaM aralığı) |
| **SAM** | AI koç + fotoğraflı beslenme/fizik + web/mobil abonelik; TR + EN + 5 EU/AR dil | TAM’ın ~%8–15’i → **1,0–3,3 B USD** (kesin segment raporu yok; pay **varsayım**) |
| **SOM Y1** | Lansman sonrası gerçekçi pay (yeni marka, IAP yok) | **Kötü 9 k / İyi 141 k / Harika 655 k USD brüt** (bu modelin Y1 cirosu; pazarın ≪%0,1’i) |

### Kullanıcı ödeme isteği ve fiyat aralığı **[Benchmark]**

| Ürün | Aylık / yıllık (sık bildirilen) | Kaynak |
|---|---|---|
| Cal AI | ~9,99 USD/ay veya ~19,99–29,99 USD/yıl (A/B değişken) | [eesel](https://www.eesel.ai/blog/cal-ai-pricing), [NutriScan 2026](https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f) |
| MacroFactor | ~11,99 / 71,99 USD | NutriScan karşılaştırma 2026 |
| Fitbod | ~15,99 / 95,99 USD | [HyperBody 2026](https://hyperbody.fit/blog/best-ai-fitness-apps-2026) |
| MyFitnessPal Premium | ~19,99 / 79,99 USD | aynı |
| Noom | ~70 / 209 USD | aynı |
| Future (insan koç) | ~149–199 USD/ay | aynı |
| **Kaify Ai** | **14,99 / 24,99 / 34,99 USD**; yıllık ×11 | kod `lib/marketing/pricing-plans.ts` |

Kaify Ai Essential, fotoğraflı AI tarayıcıların aylık fiyatına yakın; Pro/Premium Cal AI yıllık etkin fiyatının **çok üstünde**. Yıllık indirim yalnızca **%8,3** — kategoride %40–70 yıllık indirim yaygın **[Benchmark]**.

### Abonelik hunisi **[Benchmark]**

[RevenueCat State of Subscription Apps 2026 — Health & Fitness](https://www.revenuecat.com/state-of-subscription-apps-2026-health-and-fitness/):

- Hard paywall D35 indirme→ödeme medyan **%10,7** vs freemium **%2,1**.
- Health & Fitness deneme→ödeme medyan **%37,7**.
- Kategori yıllık plan payı **%68**.
- AI uygulamaları ödeyen başına **+%41 gelir**, **%30 daha hızlı churn**.
- H&F Y1 RLTV medyan **~35,64 USD/ödeyen** (IAP ağırlıklı, düşük fiyatlı yıllık planlar dahil — Kaify Ai ASP’si daha yüksek, karşılaştırma dikkatli).
- Küresel D35 medyan ~%2 civarı (NA %2,6).
- Web-to-app “artık ana akım” (Noom örneği) — Kaify Ai’nin Paddle web checkout’u kategori trendine **uygun**, native IAP’sizliğe **kısmen** gerekçe.

[Mirava trial benchmarks 2026](https://www.mirava.io/blog/free-trial-conversion-benchmarks-2026): freemium ~%2,6; H&F deneme %35–39,9.

**Kaify Ai uyarlaması [Varsayım]:** Native’de checkout yok + deneme yok + 15 USD giriş fiyatı → D35 benzeri indirme→ödeme **kategori hard-paywall medyanının altında** modellendi: Kötü %1,5 / İyi %3,5 / Harika %6,5.

### Churn, CAC, CPI **[Benchmark]**

- AI churn primi: +%30 (RevenueCat 2026).
- Aylık abonelik fitness’te **[Varsayım]** %5–12 aylık churn (yıllık planda nakit Y1’de daha az görünür).
- Health & Fitness CPI ~ **iOS 8,71 / Android 2,74 USD** ([Digital Applied 2026, AppsFlyer/Liftoff sentezi](https://www.digitalapplied.com/blog/mobile-app-marketing-statistics-2026-install-data)).
- Tam yüklenmiş paid CAC H&F ~ **3–20 USD** medyan ~8 USD ABD/WE ([SEM Nexus 2026](https://semnexus.com/the-2026-mobile-app-cac-benchmark-report-by-vertical)) — bu **install CAC**; abone CAC = CPI / dönüşüm. %3,5 dönüşümde 8 USD CPI → **~229 USD / ödeyen** ücretli kanalda. Organik karışım blended CAC’yi düşürür.

### Mağaza komisyonu vs Paddle

| | Apple/Google IAP | Kaify Ai Paddle |
|---|---|---|
| Komisyon | %30 (küçük iş %15, eşikler var) | %5 + 0,50 USD |
| KDV | Geliştirici veya mağaza; karmaşık | MoR Paddle |
| 16,49 USD işlem | ~2,47–4,95 USD kesinti | ~1,32 USD |
| Dönüşüm | In-app yüksek | Web’e çıkış **düşük** |

Kaify Ai için asıl vergi etkisi: müşteri ülkesinde KDV checkout’ta eklenir, **ciroya satıcı payı olarak yazılmaz**. Kurumlar vergisi (TR’de kâr üzerinden, modelde **%25 [Varsayım]**) faaliyet kârı pozitifse uygulanır. KVKK VERBİS maliyeti ayrı (legal tracker).

### Trend / fırsat / risk

- Fırsat: AI koç + vision; web checkout marjı; TR dil-öncelik boşluğu.
- Risk: AI uygulama patlaması (RevenueCat: aylık yeni abonelik uygulaması ~14,7k, Ocak 2026); CAC artışı; Cal AI ölçeği; store review’un consumption-only politikayı reddetmesi.

---

## 3. Rakip analizi

Ölçek sayıları kamuya açık indirme/gelir değilse **uydurulmadı**. Puanlar 2026 üçüncü taraf / mağaza sayfalarından; değişebilir.

| Rakip | Kitle | Özellik | Ücretsiz | Fiyat | Model | Ölçek göstergesi | Puan | Beğeni | Şikayet | Onların avantajı | Bizim avantaj | Boşluk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cal AI | Kalori, fotoğraf | Yemek AI taraması | İndir ücretsiz; AI tarama kilitli | ~9,99/ay veya ~30/yıl (değişken) | IAP abonelik | ~15M indirme iddiası (üçüncü taraf); MFP satın alması 2025–26 | iOS ~4,8 | Hızlı log | Paywall, doğruluk | Marka, fiyat, IAP | Koç ekibi + gamification | “Sadece kalori” dışı holistik koç |
| MyFitnessPal | Kitle tracker | Veritabanı, barkod | Freemium + reklam | ~19,99 / 79,99 | Freemium | Kategori lideri (kesin gelir yok burada) | Yüksek (doğrulanmadı bu oturumda) | Veri tabanı | Reklam, doğruluk | Network, gıda DB | AI koç sohbeti | Koçluk hissi |
| MacroFactor | Ciddi sporcu | Adaptive TDEE | Yok | ~11,99 / 71,99 | Abonelik | Niş, sadık | Yüksek niş itibar | Algoritma | Fiyat, öğrenme | Güvenilir makro | Vision + persona | Eğlence/habit |
| Fitbod | Salon kuvvet | Algoritmik antrenman | Deneme, kalıcı free yok | ~15,99 / 95,99 | Abonelik | 281k iOS rating | 4,8 iOS | Program üretimi | Watch senkron | Egzersiz kütüphanesi | Beslenme+fizik vision | Hepsi-bir-arada |
| Freeletics | HIIT / vücut ağırlığı | Coach algoritması | Freemium | ~35/3ay–80/yıl | IAP | Büyük Avrupa markası | — | Her yerde antrenman | Fiyat, tekrar | İçerik kütüphanesi | LLM sohbet | TR yerelleşme |
| Noom | Kilo psikolojisi | İnsan+uygulama | Zayıf free | ~70/ay, ~209/yıl | Abonelik | Büyük ölçek | Karışık | Davranış | Pahalı, iptal | Davranış bilimi | Düşük fiyat, AI | Fiyat boşluğu |
| Future | 1:1 insan | Uzaktan koç | Yok | ~149–199/ay | Abonelik | Premium niş | ~4,9 iddia (doğrula) | Hesap verebilirlik | Fiyat | İnsan | 10× ucuz AI | Orta fiyat AI+sosyal |
| Caliber | Kuvvet + insan upsell | Tracker + koç | Güçlü free | Pro ~19; koç ~200 | Freemium+insan | 5,5k iOS rating ~4,84 | 4,84 | Koç | Pahalı üst katman | İnsan güven | 4 AI persona | AI+oyun |
| Hevy (dolaylı) | Logbook | Sosyal log | Freemium | Düşük IAP | Freemium | Hızlı büyüme | Yüksek | UX | Koç yok | Sosyal lifting | AI koç | Koçluk |
| Yazio (dolaylı) | TR/EU beslenme | Tracker | Freemium | ~24–48/yıl | Freemium | EU güçlü | — | Dil | Derinlik | Yerel fiyat | Daha zengin koç | TR fiyat elastikiyeti |

**Pazar boşluğu:** TR-öncelikli, sohbet eden AI koç + yemek/fizik fotoğrafı + streak/ejderha; web Paddle ile mağaza komisyonsuz. Boşluk **özellik birleşiminde**; tek özellikte Cal AI veya Fitbod daha olgun.

---

## 4. Maliyetler

Nakit = gerçek ödeme. Ekonomik = + kurucu zamanı (~4.000 USD/ay brüt eşdeğer **[Varsayım]**, TR kıdemli fullstack; doğrulanmış maaş anketi değil).

### Tek seferlik

| Kalem | Nakit USD | Ekonomik USD | Not |
|---|---|---|---|
| Kalan geliştirme (store, IAP kararı, E2E) | 0–2.000 (araç) | 8.000–20.000 | 2–5 hafta kurucu |
| UX cilası / store ekran görüntüsü | 200–800 | 1.500 | |
| Test / QA | 0–500 | 2.000 | |
| Güvenlik (ZAP, pen test) | 0–1.500 | 1.000 | |
| App Store 99 + Play 25 | 124 | 124 | Yıllık Apple |
| Marka / site (mevcut) | ~0 | batık | kaifyai.org canlı |
| Hukuk (L1+L2+L4 min.) | 200–800 | 200–800 | legal-review-tracker |
| Şirket / muhasebe kurulumu | 300–1.500 | 300–1.500 | **Bilinmiyor** mevcut durum |
| Yerelleştirme | ~0–200 API | batık i18n | 50+ sözlük, picker 9 dil |
| Lansman kreatif | 300–1.500 | 1.000 | |
| **Batık** (bugüne kadar ürün) | **Bilinmiyor nakit** | **Büyük** (aylarca solo geliştirme) | Modele Y1 P&L’ye **alınmadı** |

**Lansman nakit tabanı [Varsayım]:** 2.500–6.000 USD (mağaza + hukuk + 3 ay sabit altyapı) **artı** pazarlama.

### Aylık sabit (nakit, erken ölçek)

| Servis | Ücretsiz limit | Ücretli | Alternatif |
|---|---|---|---|
| Vercel Pro | Hobby sınırlı cron | **20 USD**/koltuk + kullanım kredisi | Cloudflare Pages (API zayıf) |
| Supabase Pro | Free pause riski | **25 USD** + compute; 100k MAU sonra 0,00325 USD/MAU; PITR ~100 USD | Neon + Clerk |
| Upstash Redis | Küçük payg | ~10 USD sabit veya 0,20/100k komut | Redis Cloud |
| Sentry | 5k hata | Team ~26+ USD | GlitchTip |
| Alan adı / e-posta | — | ~2–12 USD | Google Workspace |
| Termly | — | ~10–27 USD | Avukat metni |
| Sender.net | Ücretsiz kota | Liste büyüyünce | Resend + Loops |
| reCAPTCHA | Ücretsiz kota | Aşım | Turnstile |
| FCM push | Ücretsiz pratikte | — | OneSignal |
| Muhasebe | — | 50–200 USD | — |
| **Toplam nakit sabit erken** | | **~250–450 USD** (PITR yok) / **~780 USD İyi senaryo** (Pro compute, Sentry, araçlar, yedek) | |

Ekonomik bakım: kurucu 4.000 USD + destek 0–500.

### Kullanıma bağlı

**Formül — Paddle:** `ücret = 0,05 × (brüt × (1 − iade)) + 0,50 × işlem_sayısı × (1 − iade)`  
**AI (kod varsayılanı):** DeepSeek 0,14 / 0,28 USD per 1M; Gemini 0,075 / 0,30; cache hit 0,014. Kapasite dokümanı: ~5 sohbet/gün, ~1 vision/hafta.

**[Varsayım]** ödeyen başına AI+depolama **0,70–1,00 USD/ay**; MAU başına genel altyapı **0,04–0,06 USD**.

Apple/Google komisyonu: **0**. İade %3–8. Chargeback Paddle MoR kapsamında kısmen.

### Pazarlama

Organik (ASO, içerik, TR influencer barter) + ücretli (Meta, TikTok, Google). Modelde pazarlama **nakit bütçe** olarak girer; CPI ayrı satırda varsayım.

### Ölçek maliyeti (aylık, pazarlama hariç) **[Varsayım]**

Ödeyen ≈ MAU × %15 (İyi hunisi). AI dominant.

| MAU | Ödeyen ~ | Altyapı+SaaS | AI | Destek (ekonomik) | Toplam nakit ~ | /MAU |
|---|---|---|---|---|---|---|
| 1.000 | 150 | 450 | 130 | 200 | **580** | 0,58 |
| 10.000 | 1.500 | 900 | 1.300 | 800 | **2.200** | 0,22 |
| 50.000 | 7.500 | 2.500 | 6.500 | 3.000 | **9.000** | 0,18 |
| 100.000 | 15.000 | 5.000 | 13.000 | 6.000 | **18.000** | 0,18 |
| 500.000 | 75.000 | 20.000+ (Supabase Team/compute) | 65.000 | 25.000 | **85.000+** | 0,17 |

En şişen kalem: **AI API**, sonra destek, sonra DB compute. 100k MAU’da koddaki `AI_COST_PLATFORM_DAILY_USD_CAP` (ör. 75 USD/gün) **yetersiz** kalır; kap açılmalı veya kota sıkılaşmalı.

---

## 5. Gelir modeli önerisi

| Model | Kaify Ai’ye uyum | Risk | Beklenen gelir |
|---|---|---|---|
| Abonelik (mevcut) | Yüksek | Churn, fiyat | Ana ciro |
| Freemium | Liderlik/sosyal için yarar; dönüşüm düşer (RC %2,1) | AI maliyeti bedava kullanıcıda | Düşük ARPU |
| Tek seferlik | AI marjı bozar | Yok | Önerilmez |
| IAP kozmetik | Gem zaten var; gerçek para IAP store kuralı | ADR 019 çelişkisi | İleride Option A |
| Reklam | Hard paywall ile çelişir | Marka | Hayır |
| Kullanım bazlı | Kota zaten var | UX karmaşası | Hayır |
| B2B gym | Kod yok | Satış döngüsü | Y2 opsiyon |
| **Karma: web abonelik + sınırlı ücretsiz teaser** | En iyi | Uygulama maliyeti | Önerilen alternatif |

**Ana model:** Paddle web aboneliği (mevcut).  
**Alternatif:** 3–7 günlük kartlı deneme (Paddle) + yıllık planda **%25–40 indirim** (şimdiki %8,3 zayıf). Native IAP ancak App Review zorunlu kılarsa (ADR Option A).

**Üç fiyat seçeneği [Varsayım]:**

1. **Korunan (mevcut):** 14,99 / 24,99 / 34,99 — yüksek ARPU, dönüşüm riski.
2. **Kategori hizası:** 9,99 / 16,99 / 24,99 — Cal AI/Fitbod ile rekabet; yıllık %35 indirim (9,99→77,90/yıl).
3. **TR yerel (Paddle purchasing power):** Essential ~199–349 TRY/ay eşdeğeri test; USD liste + Paddle loc. pricing.

Yıllık önerilen indirim: **en az %20–30** (1–2 ay bedava değil, 3–4 ay). Mevcut 11/12 yetersiz **[Benchmark]**.

Mix **[Varsayım]:** %55 Essential / %35 Pro / %10 Premium → blended ASP **16,49 USD/ay**.

`ASP = 0,55×14,99 + 0,35×24,99 + 0,10×34,99 = 16,49`

---

## 6. Üç senaryo (12 ay, nakit)

### Ortak formüller

```
Yeni ödeyen_t = yuvarla(yeni_indirme_t × indirme_ödeme_dönüşümü)
Aylık_ödeyen_t = yuvarla(Aylık_ödeyen_{t-1} × (1 − churn) + yeni_ödeyen_t × (1 − yıllık_pay))
Yıllık_ödeyen_t = Yıllık_ödeyen_{t-1} + yeni_ödeyen_t × yıllık_pay   # Y1 içinde yenilenmez
Aktif_ödeyen = aylık + yıllık
Brüt = aylık_ödeyen × ASP + yeni_yıllık × ASP × 11
Paddle = 0,05 × brüt × (1−iade) + 0,50 × işlem × (1−iade)
Net gelir = brüt × (1−iade) − Paddle
EBIT = net gelir − (pazarlama + altyapı/AI + diğer sabit)
Kurumlar vergisi = max(0, EBIT) × 0,25
Net kâr = EBIT − vergi
```

Kayıt = indirme × **%62** (OTP sürtünmesi). MAU = kümülatif kayıt × senaryo oranı.  
Aynı kullanıcı iki ay “yeni indirme” sayılmaz.

**Kurumlar vergisi** faaliyet kârı üzerinedir (satış KDV’si Paddle’da). “Net gelir” = brüt − iade − Paddle.

### Varsayımlar

| Varsayım | Kötü | İyi | Harika | Etiket |
|---|---|---|---|---|
| Yeni indirme/kayıt adayı (ay 1 → 12) | 280 → 540 | 900 → 4.000 | 1.800 → 9.500 | Varsayım |
| Organik pay | %80 | %55 | %45 | Varsayım |
| Kayıt (OTP) | %62 | %62 | %62 | Varsayım |
| MAU / kümülatif kayıt | %28 | %32 | %38 | Varsayım |
| İndirme → ödeme | %1,5 | %3,5 | %6,5 | Varsayım (RC hard %10,7’den kırpılmış) |
| Aylık churn (aylık plan) | %12 | %7 | %5 | Varsayım + AI primi |
| Yıllık pay | %25 | %45 | %55 | Varsayım (kategori %68) |
| ASP | 16,49 | 16,49 | 16,49 | Tespit+mix varsayım |
| Reklam ARPU | 0 | 0 | 0 | Tespit |
| İade | %8 | %4 | %3 | Varsayım |
| Mağaza IAP | %0 | %0 | %0 | Tespit |
| Paddle | %5+$0,50 | aynı | aynı | Benchmark |
| Vergi | %25 EBIT+ | aynı | aynı | Varsayım TR |
| Değişken /MAU + /ödeyen | 0,04+0,70 | 0,05+0,85 | 0,06+1,00 | Varsayım |
| Sabit nakit | 420 | 780 | 1.200 | Varsayım |
| Pazarlama/ay | 800 düz | 2,5k → 10k | 5k → 25k | Varsayım |
| Viral / featured | yok | yok | yok | kural |

Harika: iddialı paid+organik icra; mağaza öne çıkarma **yok**.

### Kötü — 12 ay (USD)

| Ay | İnd. | Kayıt Σ | MAU | Yeni öd. | Aktif öd. | Brüt | Paddle | İade | Net gelir | Altyapı | Pazarlama | Diğer | Gider | Net kâr | Küm. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 280 | 174 | 49 | 4 | 4 | 287 | 15 | 23 | 249 | 5 | 800 | 420 | 1225 | -976 | -976 |
| 2 | 300 | 360 | 101 | 5 | 9 | 369 | 21 | 30 | 319 | 10 | 800 | 420 | 1230 | -912 | -1888 |
| 3 | 320 | 558 | 156 | 5 | 13 | 430 | 25 | 34 | 371 | 15 | 800 | 420 | 1235 | -864 | -2752 |
| 4 | 340 | 769 | 215 | 5 | 17 | 492 | 29 | 39 | 423 | 21 | 800 | 420 | 1241 | -817 | -3569 |
| 5 | 360 | 992 | 278 | 5 | 20 | 533 | 32 | 43 | 458 | 25 | 800 | 420 | 1245 | -787 | -4356 |
| 6 | 380 | 1228 | 344 | 6 | 24 | 799 | 46 | 64 | 690 | 31 | 800 | 420 | 1251 | -561 | -4917 |
| 7 | 400 | 1476 | 413 | 6 | 28 | 840 | 48 | 67 | 725 | 36 | 800 | 420 | 1256 | -532 | -5448 |
| 8 | 420 | 1736 | 486 | 6 | 32 | 881 | 51 | 70 | 759 | 42 | 800 | 420 | 1262 | -502 | -5951 |
| 9 | 450 | 2015 | 564 | 7 | 36 | 922 | 54 | 74 | 794 | 48 | 800 | 420 | 1268 | -473 | -6424 |
| 10 | 480 | 2313 | 648 | 7 | 40 | 963 | 57 | 77 | 829 | 54 | 800 | 420 | 1274 | -445 | -6869 |
| 11 | 510 | 2629 | 736 | 8 | 45 | 1025 | 61 | 82 | 882 | 61 | 800 | 420 | 1281 | -399 | -7268 |
| 12 | 540 | 2964 | 830 | 8 | 50 | 1086 | 65 | 87 | 934 | 68 | 800 | 420 | 1288 | -354 | -7622 |

TRY küm. kâr ≈ −7.622 × 47,89 ≈ **−365.000 TRY**.

### İyi — 12 ay (USD)

| Ay | İnd. | Kayıt Σ | MAU | Yeni öd. | Aktif öd. | Brüt | Paddle | İade | Net gelir | Altyapı | Paz. | Diğer | Gider | Vergi | Net kâr | Küm. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 900 | 558 | 179 | 32 | 32 | 3524 | 185 | 141 | 3199 | 36 | 2500 | 780 | 3316 | 0 | -117 | -117 |
| 2 | 1100 | 1240 | 397 | 39 | 70 | 4836 | 259 | 193 | 4383 | 79 | 3000 | 780 | 3859 | 131 | 393 | 276 |
| 3 | 1300 | 2046 | 655 | 46 | 113 | 5963 | 325 | 239 | 5399 | 129 | 3500 | 780 | 4409 | 248 | 743 | 1018 |
| 4 | 1500 | 2976 | 952 | 53 | 162 | 7151 | 396 | 286 | 6469 | 185 | 4000 | 780 | 4965 | 376 | 1128 | 2146 |
| 5 | 1700 | 4030 | 1290 | 60 | 216 | 8380 | 469 | 335 | 7576 | 248 | 4500 | 780 | 5528 | 512 | 1536 | 3682 |
| 6 | 2000 | 5270 | 1686 | 70 | 278 | 10122 | 569 | 405 | 9148 | 321 | 5000 | 780 | 6101 | 762 | 2285 | 5968 |
| 7 | 2300 | 6696 | 2143 | 81 | 349 | 11741 | 666 | 470 | 10605 | 404 | 5500 | 780 | 6684 | 980 | 2941 | 8909 |
| 8 | 2600 | 8308 | 2659 | 91 | 428 | 13646 | 778 | 546 | 12323 | 497 | 6000 | 780 | 7277 | 1261 | 3784 | 12693 |
| 9 | 2900 | 10106 | 3234 | 102 | 515 | 15613 | 894 | 625 | 14094 | 599 | 7000 | 780 | 8379 | 1429 | 4286 | 16980 |
| 10 | 3200 | 12090 | 3869 | 112 | 609 | 17417 | 1004 | 697 | 15716 | 711 | 8000 | 780 | 9491 | 1556 | 4669 | 21648 |
| 11 | 3600 | 14322 | 4583 | 126 | 714 | 19978 | 1153 | 799 | 18025 | 836 | 9000 | 780 | 10616 | 1852 | 5557 | 27205 |
| 12 | 4000 | 16802 | 5377 | 140 | 830 | 22416 | 1299 | 897 | 20221 | 974 | 10000 | 780 | 11754 | 2117 | 6350 | 33555 |

### Harika — 12 ay (USD) özet satırlar

Ay1 brüt 15,5k → ay12 brüt 107,4k; küm. net kâr **292,6k USD**. Ay12 aktif ödeyen **3.711**. (Tam satırlar canvas’ta.)

### Senaryo özetleri (Y1)

| | Kötü | İyi | Harika |
|---|---|---|---|
| 3 ay brüt | 1,1k | 14,3k | 61,3k |
| 6 ay brüt | 2,9k | 40,0k | 177k |
| 12 ay brüt (ciro) | **8,6k** | **141k** | **655k** |
| 12 ay net gelir | 7,4k | 127k | 599k |
| 12 ay gider | 15,1k | 82,4k | 209k |
| 12 ay net kâr | **-7,6k** | **+33,6k** | **+293k** |
| TRY net kâr | −0,36 M | +1,61 M | +14,0 M |
| MRR ay12 (normalize ASP×ödeyen) | 1,0k | 17,0k | 76,0k |
| ARR | 12k | 204k | 912k |
| ARPU /ay (MAU) | 1,79 | 5,21 | 9,23 |
| ARPPU /ay | 27,1 | 32,6 | 35,6 |
| Brüt kâr marjı (net gelir−infra)/net gelir | ~%94 | ~%96 | ~%96 |
| Blended CAC (pazarlama/yeni ödeyen) | 133 | 71 | 43 |
| LTV nakit Y1 yakl. | 184 | 262 | 308 |
| LTV/CAC | 1,4 | 3,7 | 7,2 |
| CAC payback (ay, aylık katkı) | ~8 | ~4 | ~2,5 |
| Başabaş | Y1 yok | Ay 2 nakit | Ay 1 |
| Başabaş ödeyen (yalnızca 780 USD sabit, pazarlama 0) | — | **~57** | — |
| İlk yatırım geri dönüşü | yok | ~3–6 ay (lansman 5–15k varsay) | <3 ay |
| Y2 potansiyel (kaba) | hâlâ zayıf | 250–400k brüt | 1,0–1,8 M brüt |

**LTV formülü [Varsayım]:**  
`LTV = (1 − yıllık_pay) × (ASP / churn) + yıllık_pay × (ASP × 11)`  
Yıllık yenileme Y2’ye bırakıldı; LTV muhafazakâr.

**Katkı (aylık abone):**  
`ASP × (1−iade) × 0,95 − 0,50 − değişken_ödeyen ≈ 13,7 USD` (İyi)

Marj yüksek çünkü AI ucuz; **asıl gider pazarlama**. Yıllık peşin nakit Y1 kârını şişirir; churn Y2’de vurur.

Kurucu 4.000 USD/ay ekonomik maliyet **nakit P&L’ye dahil değil**. İyi senaryoda ekonomik kâr ≈ 33,6k − 48k = **−14k USD/yıl** (tek kişi tam zamanlı). Bu kritik: nakit pozitif ≠ kurucu maaşı karşılar.

---

## 7. Duyarlılık (İyi Y1 net kâr 33.555 USD baz)

| Değişken | −%20 etki | +%20 etki | Yorum |
|---|---|---|---|
| İndirme→ödeme | kâr **−%57** (14,3k) | **+%54** (51,8k) | En hassas |
| Fiyat/ASP | **−%58** | **+%58** | Aynı |
| Pazarlama (CAC) | kâr **+%31** (44k) | **−%31** (23k) | Bütçe kısılırsa kâr artar, büyüme düşer |
| Churn | **+%3,5** | **−%3,3** | Y1 nakit yıllık planda gizli |
| AI/altyapı | ~±%2 | ~±%2 | Bu ölçekte ikincil |
| Organik ↑ (pazarlama ↓) | — | kâr ↑ pazarlama ile ters | Aynı indirmede |

**Başabaş eşikleri [Varsayım, İyi trafik]:**

- Minimum fiyat (dönüşüm sabit): ASP ~**13 USD** civarı hâlâ kârlı; **~10 USD** altı bu pazarlama ile zor.
- Minimum dönüşüm: **~%2,0–2,3** indirme→ödeme (pazarlama İyi seviyesinde).
- Maks. blended CAC: **~110–120 USD** (LTV/CAC ~2); ücretli-only CAC **CPI/dönüşüm** ile 8/0,035 ≈ **229 USD** — **ölçekli paid bu fiyat/dönüşümle zarar eder**. Büyüme organik+içerik şart.

---

## 8. Risk ve fırsat

| # | Risk | Olasılık | Finansal etki | Azaltma |
|---|---|---|---|---|
| 1 | Native checkout yok → dönüşüm %1–2’de kalır | Yüksek | Y1 kâr → Kötü (−8k) veya daha kötü | Web-first UA (Noom modeli); deneme; ileride Option A IAP |
| 2 | App Review consumption-only reddi | Orta | Mağaza kanalı kapanır / IAP %30 | Review notes ADR 019; web UA ağırlığı |
| 3 | AI churn +%30 | Yüksek | Y2 LTV çöker | Habit (Kai/streak) gerçekten işe yaramalı; yıllık plan |
| 4 | Cal AI / MFP fiyat savaşı | Yüksek | Fiyat −%20 → kâr −%58 | Yerel TR, koç ekibi, gamification |
| 5 | DeepSeek/hukuk veya kota maliyeti | Orta | Satış durması veya AI 5–10× | İkinci sağlayıcı, EU model, kota |

Diğer: KVKK avukat yok; prompt injection/sağlık iddiası; kopyalanabilirlik yüksek; B2B yok.

Fırsat: TR dil boşluğu; Paddle marjı; web performans pazarlaması IAP’siz; gym B2B Y2.

---

## 9. Sonuç (11 soru)

1. **Umut verici mi?** Ürün ve **birim ekonomisi (AI ucuz, Paddle düşük kesinti, yüksek liste fiyatı)** evet; **edinme ve native huni** hayır-belirsiz. Nakit olarak İyi senaryo Y1 kârlı; kurucu maaşı dahil ekonomik olarak sınırda.

2. **En gerçekçi (İyi):** brüt **~141k USD** (~6,7 M TRY), net gelir **~127k**, net kâr **~34k USD** (~1,6 M TRY). Aralık: Kötü −8k kâr / 9k ciro ↔ İyi bu ↔ Harika yalnızca güçlü UA ile.

3. **Min. lansman bütçesi:** nakit **3–5 k USD** (mağaza+hukuk+3 ay infra) + ilk 90 gün pazarlama **8–15 k** → pratik taban **12–20 k USD**. Sadece “site açık” için **~2,5 k**.

4. **Sabit gideri karşılamak:** ~780 USD / ~13,7 USD katkı ≈ **57 ödeyen**. Kurucu 4k eklenirse **~350 ödeyen**. Pazarlama 5k ile **~420 ödeyen**.

5. **Model:** web Paddle abonelik; fiyat testi **9,99–14,99 Essential**; yıllık **%25+** indirim; 7 gün deneme. IAP yalnızca zorunluluk.

6. **En güçlü avantaj:** Dört persona + vision + gamification birleşimi ve **MoR ile düşük ödeme kesintisi** — henüz kanıtlanmış marka değil.

7. **Geliri artıracak 3 değişiklik:** (a) indirme→ödeme (deneme + web onboarding), (b) yıllık indirimi kategori seviyesine çekmek, (c) native/web huni sürtünmesini azaltmak (review izin verirse).

8. **Lansman öncesi:** Apple Team ID / Play imza; store listing ADR 019 uyumu; avukat L1+L2+L4; OTP+checkout E2E; Paddle prod doğrulama; HIBP; fiyat A/B planı; AI günlük cap’i büyümeye göre.

9. **30/60/90:**  
   - 30: TR içerik + web SEO + 20–50 kullanıcı nitelik; checkout funnel ölç.  
   - 60: Meta/TikTok 30–50 USD/gün test; deneme deneyi; influencer 3–5 mikro.  
   - 90: CAC < LTV/3 ise ölçek; değilse paid dur, ürün/fiyat.

10. **KPI haftalık:** indirme, kayıt, checkout başlatma, ödeme, iade, AI USD, hata. **Aylık:** MRR, churn, LTV/CAC, plan mix, MAU, NPS, destek hacmi.

11. **Devam / pivot / dur:**  
    - Devam: 90 günde indirme→ödeme ≥%2,5 ve blended CAC < 100 USD ve haftalık organik büyüme.  
    - Pivot: dönüşüm < %1,5 ve nitel görüşmeler “sadece kalori istiyorum” → daralt Cal AI rakibi veya gym B2B.  
    - Dur: 6 ay sonra <30 ödeyen ve CAC payback > 12 ay ve hukuki/store blok.

---

## Varsayımlar tablosu (kopyalanabilir)

```
fx_usdtry = 47.89                 # 2026-08-14 TGRT satış; TCMB 15:30 ayrı
asp_monthly = 16.49               # 55% Essential 14.99 / 35% Pro 24.99 / 10% Premium 34.99
yearly_months_paid = 11
paddle_pct = 0.05
paddle_fixed = 0.50               # USD / işlem
iap_store_commission = 0.00
corporate_tax = 0.25              # EBIT>0
signup_from_download = 0.62
ad_arpu = 0

# Kötü
dl = 280..540 / ay
organic = 0.80
d2p = 0.015
churn_m = 0.12
yearly_share = 0.25
refund = 0.08
mau_rate = 0.28
var_mau = 0.04
var_paid = 0.70
fixed = 420
mkt = 800

# İyi
dl = 900..4000
organic = 0.55
d2p = 0.035
churn_m = 0.07
yearly_share = 0.45
refund = 0.04
mau_rate = 0.32
var_mau = 0.05
var_paid = 0.85
fixed = 780
mkt = 2500..10000

# Harika
dl = 1800..9500
organic = 0.45
d2p = 0.065
churn_m = 0.05
yearly_share = 0.55
refund = 0.03
mau_rate = 0.38
var_mau = 0.06
var_paid = 1.00
fixed = 1200
mkt = 5000..25000

founder_economic_monthly = 4000   # nakit P&L dışı
```

---

## Kaynakça

1. Grand View Research — Fitness Apps Market: https://www.grandviewresearch.com/industry-analysis/fitness-app-market  
2. Mordor Intelligence — Digital Fitness Apps 2026: https://www.mordorintelligence.com/industry-reports/digital-fitness-apps-market  
3. Research and Markets — Fitness App Market Report 2026: https://www.researchandmarkets.com/reports/5767298/fitness-app-market-report  
4. The Insight Partners — Sports and Fitness App: https://www.theinsightpartners.com/reports/sports-and-fitness-app-market  
5. Deep Market Insights — Turkey Online Fitness: https://deepmarketinsights.com/vista/insights/online-fitness-market/turkey  
6. EY — Dijital sağlık Türkiye: https://www.ey.com/content/dam/ey-unified-site/ey-com/tr-tr/industries/life-sciences/documents/dijital-saglikta-dunya-ve-turkiye-perspektifi-raporu.pdf  
7. Paddle Pricing: https://www.paddle.com/pricing  
8. RevenueCat State of Subscription Apps 2026 H&F: https://www.revenuecat.com/state-of-subscription-apps-2026-health-and-fitness/  
9. Mirava — Trial conversion 2026: https://www.mirava.io/blog/free-trial-conversion-benchmarks-2026  
10. Adapty H&F benchmarks: https://adapty.io/blog/health-fitness-app-subscription-benchmarks/  
11. Digital Applied — CPI 2026: https://www.digitalapplied.com/blog/mobile-app-marketing-statistics-2026-install-data  
12. SEM Nexus CAC 2026: https://semnexus.com/the-2026-mobile-app-cac-benchmark-report-by-vertical  
13. Supabase Pricing: https://supabase.com/pricing  
14. Vercel Pro: https://vercel.com/docs/plans/pro-plan  
15. Cal AI fiyat derlemeleri 2026: https://www.eesel.ai/blog/cal-ai-pricing  
16. HyperBody AI fitness karşılaştırma 2026: https://hyperbody.fit/blog/best-ai-fitness-apps-2026  
17. Fitbod App Store: https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543  
18. TGRT — 14.08.2026 kur: https://www.tgrthaber.com/ekonomi/14-agustos-2026-doviz-kurlari-dolar-ve-euro-yukselise-gecti-3353320  
19. TCMB gösterge yöntemi: https://www.tcmb.gov.tr/  
20. Repo: `docs/billing`, ADR 019, `lib/marketing/pricing-plans.ts`, `docs/compliance/subprocessors.md`
