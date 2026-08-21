import Link from "next/link";
import {
  LEGAL_ENTITY,
  LEGAL_OPERATIONAL_ADDRESS,
  PRIVACY_EMAIL,
  PRIVACY_PATH,
} from "@/lib/legal/constants";

/**
 * Turkish KVKK regional module — supplements the global Privacy Policy.
 * Not a standalone privacy framework.
 */
export function KvkkDisclosureContent() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24">
      <p className="lead text-zinc-300">
        Bu sayfa, {LEGAL_ENTITY} (&quot;Veri Sorumlusu&quot;) için 6698 sayılı Kişisel
        Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında hazırlanmış{" "}
        <strong>bölgesel bir bilgilendirme modülüdür</strong>. Küresel gizlilik
        çerçevesi İngilizce birincil{" "}
        <Link href={PRIVACY_PATH} className="text-emerald-400 underline">
          Privacy Policy
        </Link>{" "}
        metnindedir; KVKK bu metnin yerini almaz.
      </p>

      <section id="sorumlu" className="mb-10">
        <h2>1. Veri Sorumlusu</h2>
        <p className="text-zinc-300">
          {LEGAL_ENTITY} · {LEGAL_OPERATIONAL_ADDRESS}
          <br />
          İletişim: {PRIVACY_EMAIL}
          <br />
          Tescilli unvan / MERSİS / VERBİS bilgileri avukat onayına tabidir.
        </p>
      </section>

      <section id="veriler" className="mb-10">
        <h2>2. İşlenen Kişisel Veriler</h2>
        <ul className="text-zinc-300">
          <li>Kimlik ve iletişim: ad, e-posta, doğum tarihi (16+ doğrulama)</li>
          <li>Profil: boy, kilo, cinsiyet, deneyim, ülke/bölge, hedefler</li>
          <li>
            Sağlık/fitness: adım, antrenman, beslenme/su kayıtları, AI sohbet,
            isteğe bağlı fotoğraf analizi (açık rıza)
          </li>
          <li>İşlem güvenliği: IP, oturum, cihaz bilgisi</li>
          <li>
            Ödeme: abonelik durumu ve fatura e-postası (tam kart verisi Paddle&apos;da;
            Paddle işlemde bağımsız kontrolör olarak hareket edebilir)
          </li>
        </ul>
      </section>

      <section id="amaç" className="mb-10">
        <h2>3. İşleme Amaçları</h2>
        <p className="text-zinc-300">
          Uygulama hizmetinin sunulması, AI koçluk, analitik, güvenlik, yasal
          yükümlülükler ve (ayrı onayınız halinde) pazarlama iletişimi.
        </p>
      </section>

      <section id="hukuki" className="mb-10">
        <h2>4. Hukuki Sebepler</h2>
        <p className="text-zinc-300">
          KVKK m.5/2 (sözleşme, hukuki yükümlülük, meşru menfaat) ve m.6 (açık
          rıza — özel nitelikli sağlık verisi ve AI/fotoğraf işleme).
        </p>
      </section>

      <section id="aktarim" className="mb-10">
        <h2>5. Aktarım</h2>
        <p className="text-zinc-300">
          Veriler Supabase, Vercel, Google Gemini, DeepSeek, Sentry, Paddle,
          Upstash, Firebase/Web Push ve benzeri alt işleyicilere aktarılabilir.
          Yurt dışı aktarımda KVKK m.9 ve uygulanabilir güvenceler değerlendirilir;
          DeepSeek aktarımları özel hukuki inceleme gerektirir.
        </p>
      </section>

      <section id="haklar" className="mb-10">
        <h2>6. Haklarınız (KVKK m.11)</h2>
        <ul className="text-zinc-300">
          <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>Bilgi talep etme, düzeltme, silme</li>
          <li>Veri taşınabilirliği (Ayarlar → güvenlik/export yolları)</li>
          <li>İtiraz ve zararın giderilmesini talep etme</li>
        </ul>
        <p className="text-zinc-300">
          Başvuru: {PRIVACY_EMAIL} — en geç 30 gün içinde yanıt.
        </p>
      </section>

      <section id="saklama" className="mb-10">
        <h2>7. Saklama Süreleri</h2>
        <p className="text-zinc-300">
          Detaylı süreler için{" "}
          <Link href={PRIVACY_PATH} className="text-emerald-400 underline">
            Privacy Policy
          </Link>{" "}
          ve dahili retention policy dokümanına bakınız.
        </p>
      </section>

      <section id="yas" className="mb-10">
        <h2>8. Yaş</h2>
        <p className="text-zinc-300">
          Hizmet 16 yaş altındaki kişilere kapalıdır. 16–17 yaşındaki kullanıcılar
          reşit olmayabilir; veli/vasi onayı temsil edilebilir.
        </p>
      </section>
    </article>
  );
}
