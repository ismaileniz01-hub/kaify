import {
  LEGAL_ENTITY,
  LEGAL_URL,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const TERMS_DOCUMENT_TR: LegalDocument = {
  title: "Kullanım Koşulları",
  subtitle: `Son güncelleme: 5 Temmuz 2026 · Sürüm ${TERMS_VERSION}`,
  intro:
    'Bu Kullanım Koşulları ("Koşullar") Kaify kullanımınızı düzenler. Hesap oluşturarak bu Koşulları ve Gizlilik Politikamızı kabul edersiniz.',
  sections: [
    {
      id: "services",
      title: "1. Hizmetler",
      blocks: [{ type: "p", text: `${LEGAL_ENTITY}, sanal koçlar, seriler, analizler ve isteğe bağlı fotoğraf analizi sunan AI destekli fitness koçluğu uygulaması Kaify'ı (${LEGAL_URL}) işletir. Yasanın gerektirdiği durumlarda makul bildirimle özellikleri değiştirebilir, askıya alabilir veya sonlandırabiliriz.` }],
    },
    {
      id: "ai-disclaimer",
      title: "2. AI ve Fitness — Tıbbi Tavsiye Değildir",
      blocks: [
        { type: "p", text: "Kaify tıbbi cihaz değildir; tıbbi, beslenme, fizyoterapi veya acil durum hizmeti sunmaz. AI çıktıları eksik veya hatalı olabilir. Beslenme, egzersiz veya tedavinizi değiştirmeden önce yetkin bir uzmana danışmalısınız. Acil durumlarda Kaify'ı kullanmayın; 112'yi veya yerel acil hizmetleri arayın." },
        { type: "p", text: "Fiziksel aktivitenin doğasında bulunan riskleri üstlenirsiniz. AI özelliklerini kullanarak otomatik koçluğun profesyonel değerlendirmenin yerini tutmadığını kabul edersiniz." },
      ],
    },
    {
      id: "eligibility",
      title: "3. Uygunluk (16+)",
      blocks: [{ type: "p", text: "En az 16 yaşında olmalısınız. Kayıt olarak bu şartı karşıladığınızı ve verdiğiniz bilgilerin doğru olduğunu beyan edersiniz." }],
    },
    {
      id: "account",
      title: "4. Hesap ve Şifresiz Kimlik Doğrulama",
      blocks: [{ type: "p", text: "Erişim tek kullanımlık bağlantı veya OAuth ile sağlanır. E-posta hesabınızı ve cihazlarınızı korumak sizin sorumluluğunuzdadır. Bir gerçek kişi için tek hesap kullanılabilir; otomasyon, veri kazıma ve çoklu hesap kötüye kullanımı yasaktır." }],
    },
    {
      id: "subscriptions",
      title: "5. Abonelikler ve Ödemeler",
      blocks: [
        { type: "p", text: "Ücretli planlar Kayıtlı Satıcı olarak Paddle tarafından işlenir. Abonelikler yenileme tarihinden önce iptal edilmediği sürece otomatik yenilenir. Zorunlu hukuk aksini gerektirmedikçe dijital erişim verildikten sonra ücretler iade edilmez." },
        { type: "p", text: "Sanal öğeler yalnızca uygulama içi kullanım için lisanslanır; nakit değeri yoktur, devredilemez ve hesap sonlandırıldığında kaybedilebilir." },
      ],
    },
    {
      id: "user-content",
      title: "6. Kullanıcı İçeriği ve Sağlık Verileri",
      blocks: [
        { type: "p", text: "Gönderdiğiniz içeriğin mülkiyeti sizde kalır. Hizmeti işletmek, güvenliği uygulamak ve özellikleri geliştirmek için bize içeriği barındırma, işleme ve gösterme konusunda dünya çapında, telifsiz bir lisans verirsiniz." },
        { type: "p", text: "Sağlıkla ilgili ve fotoğraf verilerinin işlenmesi uygulamada açık rızanızı gerektirir ve Gizlilik Politikamızda açıklanır." },
      ],
    },
    {
      id: "prohibited",
      title: "7. Yasak Kullanım",
      blocks: [{ type: "p", text: "Yasaları ihlal edemez, başkalarını taciz edemez, yasa dışı veya rıza dışı görsel yükleyemez, prompt injection ya da model kötüye kullanımı deneyemez, hizmeti kazıyamaz veya tersine mühendislik yapamaz, yönlendirme ya da ödeme dolandırıcılığı yapamaz ve altyapıyı aşırı yükleyemezsiniz." }],
    },
    {
      id: "privacy",
      title: "8. Gizlilik ve Çerezler",
      blocks: [{ type: "p", text: "Gizlilik Politikamız ve Çerez Politikamız bu Koşulların parçasıdır. AB/BK kullanıcılarının zorunlu veri koruma hakları bu Koşullarla kaldırılamaz." }],
    },
    {
      id: "third-party",
      title: "9. Üçüncü Taraf Hizmetleri",
      blocks: [{ type: "p", text: "Supabase, Google (Gemini), DeepSeek, Vercel, Sentry, Paddle ve reCAPTCHA dahil alt işleyenlere dayanırız. Bunların kullanılabilirliği hizmetimizi etkiler; zorunlu hukukun ötesindeki üçüncü taraf kesintilerinden sorumlu değiliz." }],
    },
    {
      id: "liability",
      title: "10. Feragatler ve Sorumluluğun Sınırlandırılması",
      blocks: [
        { type: "p", text: 'HİZMET; TİCARİ ELVERİŞLİLİK, BELİRLİ BİR AMACA UYGUNLUK, DOĞRULUK VEYA İHLAL ETMEME GARANTİSİ OLMAKSIZIN "OLDUĞU GİBİ" SUNULUR.' },
        { type: "p", text: `Yasanın izin verdiği azami ölçüde ${LEGAL_ENTITY}; dolaylı, arızi, özel, sonuç olarak doğan veya cezai zararlardan ya da kâr, veri veya itibar kaybından sorumlu değildir. Toplam sorumluluğumuz, talepten önceki 12 ayda ödediğiniz tutar ile 100 USD'den büyük olanıyla sınırlıdır.` },
        { type: "p", text: "Buradaki hiçbir hüküm, yürürlükteki tüketici hukuku kapsamında hariç tutulamayacak sorumluluğu sınırlamaz." },
      ],
    },
    {
      id: "indemnity",
      title: "11. Tazmin",
      blocks: [{ type: "p", text: `Yetki alanınızdaki tüketiciler için yasaklanan durumlar dışında, hizmeti kötüye kullanmanızdan, içeriğinizden veya bu Koşulları ihlalinizden doğan taleplere karşı ${LEGAL_ENTITY}'yi tazmin etmeyi kabul edersiniz.` }],
    },
    {
      id: "dispute",
      title: "12. Uygulanacak Hukuk ve Uyuşmazlıklar",
      blocks: [
        { type: "p", text: "Bu Koşullar Türkiye Cumhuriyeti hukukuna tabidir. AB/BK tüketici hukukunun ikamet ülkenizde dava açma hakkı verdiği durumlar dışında Adana mahkemeleri münhasır olmayan yetkiye sahiptir." },
        { type: "p", text: `Uyuşmazlıkları 30 gün içinde gayriresmî çözmek için önce ${SUPPORT_EMAIL} adresinden bize ulaşın.` },
      ],
    },
    {
      id: "changes",
      title: "13. Değişiklikler ve İletişim",
      blocks: [
        { type: "p", text: `Bu Koşulları güncelleyebiliriz. Önemli değişiklikler uygulama içinden veya e-postayla bildirilir. Yasanın izin verdiği ölçüde yürürlük tarihinden sonra kullanıma devam etmeniz kabul sayılır. Sürüm: ${TERMS_VERSION}.` },
        { type: "p", text: `Sorular: ${SUPPORT_EMAIL} · Gizlilik: ${PRIVACY_EMAIL}` },
      ],
    },
  ],
};
