export function KvkkDisclosureContent() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24">
      <p className="lead text-zinc-300">
        Kaify Ai (&quot;Veri Sorumlusu&quot;) olarak kişisel verileriniz 6698 sayılı Kişisel
        Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında aşağıda açıklanan çerçevede
        işlenmektedir.
      </p>

      <section id="sorumlu" className="mb-10">
        <h2>1. Veri Sorumlusu</h2>
        <p className="text-zinc-300">
          Kaify Ai · Toros Mah., Çukurova, Adana 01150, Türkiye
          <br />
          İletişim: privacy@kaifyai.org
        </p>
      </section>

      <section id="veriler" className="mb-10">
        <h2>2. İşlenen Kişisel Veriler</h2>
        <ul className="text-zinc-300">
          <li>Kimlik ve iletişim: ad, e-posta, doğum tarihi</li>
          <li>Profil: boy, kilo, cinsiyet, deneyim, ülke, şehir</li>
          <li>Sağlık/fitness: adım, antrenman notları, AI sohbet, fotoğraf analizi (onaylı)</li>
          <li>İşlem güvenliği: IP, oturum, cihaz bilgisi</li>
          <li>Ödeme: abonelik durumu, fatura e-postası (kart verisi Lemon Squeezy&apos;de)</li>
        </ul>
      </section>

      <section id="amaç" className="mb-10">
        <h2>3. İşleme Amaçları</h2>
        <p className="text-zinc-300">
          Uygulama hizmetinin sunulması, AI koçluk, gamification, güvenlik, yasal yükümlülükler
          ve (onayınız halinde) pazarlama iletişimi.
        </p>
      </section>

      <section id="hukuki" className="mb-10">
        <h2>4. Hukuki Sebepler</h2>
        <p className="text-zinc-300">
          KVKK m.5/2 (sözleşme, hukuki yükümlülük, meşru menfaat) ve m.6 (açık rıza — sağlık
          verisi ve AI işleme).
        </p>
      </section>

      <section id="aktarim" className="mb-10">
        <h2>5. Aktarım</h2>
        <p className="text-zinc-300">
          Veriler Supabase (AB/Frankfurt), Vercel, Google Gemini, DeepSeek, Sentry, Lemon Squeezy
          gibi alt işleyicilere aktarılabilir. Yurt dışı aktarımda KVKK m.9 hükümleri ve
          Standart Sözleşme Maddeleri uygulanır.
        </p>
      </section>

      <section id="haklar" className="mb-10">
        <h2>6. Haklarınız (KVKK m.11)</h2>
        <ul className="text-zinc-300">
          <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>Bilgi talep etme, düzeltme, silme</li>
          <li>Veri taşınabilirliği (Ayarlar → Güvenlik → JSON indir)</li>
          <li>İtiraz ve zararın giderilmesini talep etme</li>
        </ul>
        <p className="text-zinc-300">
          Başvuru: privacy@kaifyai.org — en geç 30 gün içinde yanıt.
        </p>
      </section>

      <section id="saklama" className="mb-10">
        <h2>7. Saklama Süreleri</h2>
        <p className="text-zinc-300">
          Detaylı süreler için{" "}
          <a href="/privacy" className="text-emerald-400 underline">
            Gizlilik Politikası
          </a>{" "}
          ve retention policy dokümanına bakınız. Sohbet verileri en fazla 24 ay saklanır.
        </p>
      </section>
    </article>
  );
}
