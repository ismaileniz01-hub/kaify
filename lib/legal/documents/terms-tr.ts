import {
  GOVERNING_LAW_PROVISIONAL,
  LEGAL_ENTITY,
  LEGAL_OPERATIONAL_ADDRESS,
  LEGAL_URL,
  PADDLE_BUYER_TERMS_URL,
  PADDLE_PRIVACY_URL,
  PADDLE_REFUND_POLICY_URL,
  PRIVACY_EMAIL,
  PRIVACY_PATH,
  SUPPORT_EMAIL,
  TERMS_VERSION,
  VENUE_PROVISIONAL,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const TERMS_DOCUMENT_TR: LegalDocument = {
  title: "Kullanım Koşulları",
  subtitle: `Son güncelleme: 21 Ağustos 2026 · Sürüm ${TERMS_VERSION} · İngilizce metin esas alınır`,
  intro: `Bu Kullanım Koşulları ("Koşullar"), abonelik tabanlı bir fitness ve wellness teknoloji hizmeti olan Kaify Ai (${LEGAL_URL}) kullanımınız için sizinle ${LEGAL_ENTITY} arasında bağlayıcı bir sözleşme oluşturur. Hesap oluşturarak, kabul ederek veya Kaify Ai'ı kullanarak bu Koşulları ve Gizlilik Politikamızı kabul etmiş olursunuz. Kabul etmiyorsanız Kaify Ai'ı kullanmayın. Bu Türkçe metin kolaylık içindir; zorunlu yerel dil kurallarının geçerli olduğu durumlar dışında İngilizce metin esas alınır.`,
  sections: [
    {
      id: "parties",
      title: "1. Taraflar ve bireylerin korunması",
      blocks: [
        {
          type: "p",
          text: `Sözleşme tarafı, Kaify Ai'ı ${LEGAL_URL} adresinde işleten ${LEGAL_ENTITY}'dır. Halen yayımlanan operasyonel adres: ${LEGAL_OPERATIONAL_ADDRESS}. Tescilli tüzel kişi unvanı, şirket sicil numarası ve tescilli merkez, hukuk müşavirliği tarafından teyit edilmelidir (bkz. LEGAL_FACTS_REQUIRED).`,
        },
        {
          type: "p",
          text: "Yasanın izin verdiği azami ölçüde: (a) bu sözleşme yalnızca siz ile Kaify Ai'ı işleten tüzel kişi arasındadır; (b) hiçbir kurucu, yönetici, yetkili, çalışan, yüklenici, yatırımcı, pay sahibi, bağlı kuruluş veya lisans veren bu Koşulların bireysel tarafı değildir; ve (c) Kaify Ai ile ilgili talepler, yürürlükteki hukukun böyle bir sınırlamaya izin vermediği durumlar dışında, korunan kişilere değil işleten tüzel kişiye yöneltilmelidir.",
        },
        {
          type: "p",
          text: "Paddle (Kayıtlı Satıcı / Merchant of Record olarak hareket eden ilgili Paddle grup şirketi) ödeme işlemlerini yürütür. Paddle, Kaify Ai'ın fitness içeriğinin, AI koçlarının veya ürün işlevselliğinin sağlayıcısı değildir.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "2. Uygunluk ve yaş (16+)",
      blocks: [
        {
          type: "p",
          text: "16 yaşından küçük hiç kimse hesap oluşturamaz veya Kaify Ai'ı kullanamaz. Kayıt olarak en az 16 yaşında olduğunuzu ve verdiğiniz bilgilerin doğru olduğunu beyan edersiniz.",
        },
        {
          type: "p",
          text: "16 veya 17 yaşındaysanız ve bulunduğunuz yerde yasal erginlik yaşına ulaşmadıysanız, bir ebeveyn veya yasal vasinin bu Koşulları ve Gizlilik Politikasını incelediğini ve kullanımınıza izin verdiğini beyan edersiniz. Kaify Ai, makul ölçüde gerekli olduğunda yaş veya vasi doğrulaması isteyebilir; reşit olmadığınıza veya gerekli yetkiye sahip olmadığınıza makul ölçüde inanırsa hesabı askıya alabilir veya silebilir.",
        },
        {
          type: "p",
          text: "Bir küçüğün kullanımına izin veren ebeveyn veya vasi, yasanın izin verdiği ölçüde bu kullanımı denetlemekten sorumludur. Kaify Ai, 16 veya 17 yaşındaki her kullanıcının yetişkin olduğunu iddia etmez.",
        },
      ],
    },
    {
      id: "contract-formation",
      title: "3. Sözleşmenin kurulması ve elektronik kabul",
      blocks: [
        {
          type: "p",
          text: "Hesap oluşturup bu Koşulları kabul ettiğinizde (onay kutusu veya eşdeğer kontrol dahil) Kaify Ai ile sözleşme kurarsınız. Abonelik satın alımı ayrıca Paddle'ın Alıcı Koşulları kapsamında Paddle ile bir ödeme işlemi oluşturur. Kabulün elektronik kayıtları (sürüm, zaman damgası ve ilgili deliller) Gizlilik Politikamızda açıklandığı şekilde saklanabilir.",
        },
      ],
    },
    {
      id: "service",
      title: "4. Hizmetin tanımı",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai; AI destekli sanal koçlar (Alex, Maya, Leo ve Kai dahil), seriler, analizler, isteğe bağlı yemek ve fizik fotoğraf analizi, programlar ve ilgili özellikler sunan bir fitness ve genel wellness teknoloji hizmetidir. Sonuçlar kişiden kişiye değişir. Kaify Ai belirli bir kilo, vücut kompozisyonu, güç, performans, sağlık, gelir veya yaşam tarzı sonucu vaat etmez.",
        },
        {
          type: "p",
          text: "Öneriler, eksik veya hatalı olabilecek verdiğiniz bilgilere bağlıdır. Muhakeme yürütmeli ve faaliyetleri durumunuza ve ortamınıza göre uyarlamalısınız. Erişim uyumlu cihazlar, tarayıcılar, internet bağlantısı ve üçüncü taraf hizmetler gerektirebilir.",
        },
        {
          type: "p",
          text: "Kaify Ai özellikler, planlar, içerik veya teknik gereksinimleri ekleyebilir, kaldırabilir, değiştirebilir, yerine koyabilir veya sonlandırabilir. Beta veya deneysel özellikler eksik, hatalı olabilir veya zorunlu hukukun ötesinde sorumluluk doğurmaksızın geri çekilebilir.",
        },
      ],
    },
    {
      id: "medical",
      title: "5. Tıbbi ve fiziksel aktivite feragati",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai bir sağlık hizmeti sağlayıcısı, tıp profesyoneli, acil durum hizmeti, sigortacı veya tıbbi cihaz değildir. Kaify Ai tıbbi teşhis, tedavi, reçete, fizyoterapi, acil bakım veya kişiselleştirilmiş tıbbi tavsiye sunmaz. İçerik yalnızca genel bilgilendirme, eğitim, fitness ve wellness amaçlıdır; hekim veya diğer nitelikli bir profesyonelin yerine geçmez.",
        },
        {
          type: "p",
          text: "Tıbbi durumunuz, yaralanmanız, gebeliğiniz, belirtileriniz, ilaçlarınız, engeliniz varsa veya emin değilseniz katılmadan önce profesyonel tavsiye alın. Ağrı, baş dönmesi, baygınlık, göğüs rahatsızlığı, nefes alma güçlüğü veya diğer endişe verici belirtiler yaşarsanız aktiviteyi bırakın ve uygun yardım alın. Acil durumlarda yerel acil servisleri (örneğin 112 veya 911) arayın — Kaify Ai'ı kullanmayın.",
        },
        {
          type: "ul",
          items: [
            "Güvenli ortam, ekipman, yoğunluk, form ve aktivite seviyesini seçmek sizin sorumluluğunuzdadır.",
            "Egzersiz, beslenme değişiklikleri, oruç, takviyeler ve fiziksel aktivite doğası gereği risk içerir.",
            "Yasanın izin verdiği ölçüde, gerçekleştirmeyi seçtiğiniz faaliyetlerin doğasında bulunan olağan riskleri gönüllü olarak üstlenirsiniz.",
            "Kaify Ai fiziksel durumunuzu veya çevrenizi gerçek zamanlı izleyemez.",
            "Bu Koşullardaki hiçbir hüküm yasal olarak hariç tutulamayacak sorumluluğu ortadan kaldırmaz.",
          ],
        },
        {
          type: "p",
          text: "Bu sitede ayrıca özel bir Tıbbi ve Fitness Feragati yayımlanır; kısa uyarılar onboarding ve ilgili ürün akışlarında görünür.",
        },
      ],
    },
    {
      id: "ai",
      title: "6. AI tarafından üretilen içerik",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai; yanıtlar, planlar ve analizler üretmek için AI sistemleri kullanır (görüntü analizi için Google Gemini ve sohbet koçluğu için DeepSeek gibi üçüncü taraf sağlayıcılar dahil). AI çıktıları eksik, hatalı, güncel olmayan, güvensiz veya sizin için uygunsuz olabilir. Ürün açıkça aksi yönde belirtmedikçe çıktılar bir sağlık profesyoneli tarafından incelenmez.",
        },
        {
          type: "ul",
          items: [
            "Harekete geçmeden önce önerileri bağımsız olarak değerlendirmelisiniz.",
            "Acil durumlar, teşhis, ilaç veya tedavi için AI çıktısına güvenmeyin.",
            "Kaify Ai AI çıktısının kullanılabilirliğini, doğruluğunu, benzersizliğini veya uygunluğunu garanti etmez.",
            "Kaify Ai güvenlik, kötüye kullanımın önlenmesi veya yasal nedenlerle istemleri ve çıktıları kısıtlayabilir.",
            "Üçüncü taraf haklarını ihlal eden veya sağlama yetkiniz olmayan girdiler göndermemelisiniz.",
          ],
        },
        {
          type: "p",
          text: "Kaify Ai, AI sağlayıcılarının verileri asla saklamadığını veya üzerinde eğitim yapmadığını iddia etmez. İşleme, Gizlilik Politikasında açıklanır ve o sırada yürürlükte olan sağlayıcı sözleşmeleri ile teknik kontrollere bağlıdır.",
        },
      ],
    },
    {
      id: "accounts",
      title: "7. Hesaplar ve güvenlik",
      blocks: [
        {
          type: "p",
          text: "Doğru kayıt bilgisi verin. Erişim genellikle e-posta tek kullanımlık kodları (OTP), sihirli bağlantı veya desteklenen OAuth ile sağlanır. E-posta hesabınızı, cihazlarınızı ve oturumlarınızı güvenceye almak sizin sorumluluğunuzdadır. Kimlik bilgisi paylaşımı, hesap satışı ve yetkisiz çoklu hesap kötüye kullanımı yasaktır.",
        },
        {
          type: "ul",
          items: [
            "Yetkisiz erişimi derhal " + SUPPORT_EMAIL + " adresinden bize bildirin.",
            "Kaify Ai şifre veya oturum sıfırlaması isteyebilir, oturumları iptal edebilir veya hesapları geçici kilitleyebilir.",
            "Kaify Ai delil muhafaza edebilir ve yasal soruşturmalarla iş birliği yapabilir.",
            "Kaify Ai, yasa gerektirmedikçe silinen kullanıcı içeriğini geri yükleme yükümlülüğü taşımaz.",
          ],
        },
      ],
    },
    {
      id: "license",
      title: "8. Hizmeti kullanma lisansı",
      blocks: [
        {
          type: "p",
          text: "Bu Koşullara ve abonelik durumunuza bağlı olarak Kaify Ai, yetkili erişim süresince kişisel, ticari olmayan kullanım için sınırlı, geri alınabilir, münhasır olmayan, devredilemez, alt lisanslanamaz bir lisans verir. Abonelikler erişim satın alır; yazılım, içerik veya veri derlemelerinin mülkiyetini değil.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "9. Kabul edilebilir kullanım",
      blocks: [
        {
          type: "p",
          text: "Şunları yapamazsınız:",
        },
        {
          type: "ul",
          items: [
            "Kaify Ai'ı yasa dışı, dolandırıcılık, kötüye kullanım, taciz, tehlikeli veya aldatıcı amaçlarla kullanmak",
            "İzin olmadan veri kazımak, taramak, hasat etmek veya erişimi otomatikleştirmek",
            "Zorunlu hukukun açıkça izin verdiği durumlar dışında tersine mühendislik yapmak",
            "Abonelik, güvenlik, hız sınırları, erişim kontrolleri veya teknik kısıtlamaları aşmak",
            "Erişimi paylaşmak veya yeniden satmak",
            "Kötü amaçlı yazılım eklemek, güvenlik açıklarından yararlanmak veya hizmete müdahale etmek",
            "Gerekli haklar olmadan içerik yüklemek",
            "Başkalarının kimliğine bürünmek veya sahte kimlik vermek",
            "Uygulanabilir olduğu yerlerde yazılı izin olmadan rakip ürün geliştirmek veya kıyaslamak için Kaify Ai'ı kullanmak",
            "Veri kümeleri, antrenman kütüphaneleri, istemler, çıktı koleksiyonları veya modeller çıkarmak",
            "Kaify Ai'ı klinik veya acil karar verme için kullanmak",
            "Chargeback dolandırıcılığı, iade kötüye kullanımı veya promosyon kötüye kullanımı yapmak",
          ],
        },
        {
          type: "p",
          text: "Kaify Ai ihlaller için soruşturma yapabilir, hesapları kısıtlayabilir, askıya alabilir veya sonlandırabilir.",
        },
      ],
    },
    {
      id: "ip",
      title: "10. Fikri mülkiyet",
      blocks: [
        {
          type: "p",
          text: `Kaify Ai ve lisans verenleri; yazılım (kaynak ve nesne kodu dahil), marka, ticari markalar, tasarımlar, arayüz, grafikler, metinler, videolar, antrenmanlar, programlar, veritabanları, metodolojiler, algoritmalar, istemler, derlemeler ve lisanslı üçüncü taraf içerik üzerindeki tüm haklara sahiptir. Yukarıdaki sınırlı lisans dışında size hiçbir hak devredilmez.`,
        },
      ],
    },
    {
      id: "user-content",
      title: "11. Kullanıcı içeriği",
      blocks: [
        {
          type: "p",
          text: "Gönderdiğiniz içeriğin (mesajlar, fotoğraflar, profil verileri, notlar) mülkiyeti sizde kalır. Kaify Ai'a; hizmeti işletmek ve iyileştirmek için içeriği barındırma, işleme, çoğaltma, uyarlama, iletme, görüntüleme, güvenceye alma, denetleme ve Gizlilik Politikasının izin verdiği yerlerde anonimleştirilmiş veya toplu analitik dahil olmak üzere dünya çapında, münhasır olmayan, telifsiz bir lisans verirsiniz. Bu lisans içeriğinizin mülkiyetini devretmez.",
        },
        {
          type: "p",
          text: "İçeriğiniz için gerekli hak ve izinlere sahip olduğunuzu garanti edersiniz. Kaify Ai içeriği kaldırabilir veya kısıtlayabilir ancak tüm içeriği izlemekle yükümlü değildir. Kaify Ai kullanıcı içeriğini onaylamaz. Kaify Ai açıkça bir yedekleme özelliği sunmadıkça yedeklerinizden siz sorumlusunuz.",
        },
      ],
    },
    {
      id: "paddle",
      title: "12. Paddle ve ödeme yapısı",
      blocks: [
        {
          type: "p",
          text: "İki ilişki geçerlidir: (1) Kaify Ai ürünü ve hizmeti sağlar ve lisanslar; (2) Paddle, ödeme işlemi için Kayıtlı Satıcı (Merchant of Record) ve yetkili yeniden satıcı olarak hareket eder. Satın alma ilgili Paddle tüzel kişisi tarafından işlenir. Ödeme işlemlerine Paddle'ın Alıcı Koşulları, İade Politikası ve Gizlilik Bildirimi uygulanır:",
        },
        {
          type: "ul",
          items: [
            `Alıcı Koşulları: ${PADDLE_BUYER_TERMS_URL}`,
            `İade Politikası: ${PADDLE_REFUND_POLICY_URL}`,
            `Gizlilik Bildirimi: ${PADDLE_PRIVACY_URL}`,
          ],
        },
        {
          type: "ul",
          items: [
            "Paddle uygulanabilir vergileri hesaplayıp tahsil edebilir ve makbuz düzenleyebilir.",
            "Paddle desteklenen ödeme yöntemlerini yönetir; kimlik doğrulama, dolandırıcılık önleme, yeniden deneme ve chargeback prosedürleri kullanabilir.",
            "Kaify Ai genellikle tam ödeme kartı numaralarını veya tam kart ayrıntılarını almaz.",
            "Paddle'daki faturalama ve iletişim bilgilerinizi güncel tutun.",
            "İşlem uyuşmazlıkları, iadeler ve faturalama desteği Paddle'a yönlendirilebilir (paddle.net dahil).",
            "Kaify Ai ürün erişimi konularında yardımcı olabilir ancak Paddle'ın yasal veya ödeme yükümlülüklerini geçersiz kılamaz.",
          ],
        },
      ],
    },
    {
      id: "subscriptions",
      title: "13. Abonelikler, yenileme ve plan değişiklikleri",
      blocks: [
        {
          type: "p",
          text: "Ücretli planlar (ödeme ve fiyatlandırma sayfasında gösterilen adlar, aralıklar ve fiyatlar) yenilemeden önce iptal edilmedikçe otomatik yenilenir. Ücretler her fatura döneminin başında (ve ücretli plana başladığınızda veya denemeden dönüştüğünüzde, sunuluyorsa) tahsil edilir. Vergiler, para birimi ve yerel fiyatlandırma bölgeye göre değişebilir ve Paddle Checkout'ta gösterilir.",
        },
        {
          type: "ul",
          items: [
            "İptal için Paddle Müşteri Portalı / Ayarlar'daki Faturalamayı yönet (veya Kaify Ai'ın açıkladığı diğer yöntemler) kullanılır.",
            "İptal genellikle gelecek yenilemeyi durdurur; erişim, anında iptalin geçerli olduğu durumlar (örneğin hesap silme) dışında genellikle ödenen dönemin sonuna kadar devam eder.",
            "Başarısız ödemeler gecikmiş durum, yeniden denemeler, yapılandırılmışsa süre tanıma ve ücretli özelliklerin kaybına yol açabilir.",
            "Yükseltme, düşürme, duraklatma ve orantılı ücretlendirme Paddle Billing kurallarına ve onay öncesi gösterilen önizlemeye tabidir.",
            "Sanal öğeler (mücevherler, kozmetikler) yalnızca uygulama içi kullanım için lisanslanır; nakit değeri yoktur, devredilemez ve sonlandırmada kaybedilebilir.",
          ],
        },
        {
          type: "p",
          text: "Hesap silme, abonelik iptalinden ayrıdır. Hesabınızı silmek, teknik olarak başarılı olduğunda canlı Paddle aboneliklerini derhal iptal eder; ardından hesap verilerini Gizlilik Politikamız ve silme belgelerinde açıklandığı gibi siler. Silme otomatik olarak iade oluşturmaz.",
        },
      ],
    },
    {
      id: "refunds",
      title: "14. İadeler ve cayma hakları",
      blocks: [
        {
          type: "p",
          text: "Yürürlükteki hukuk veya Paddle'ın bağlayıcı politikalarının gerektirdiği durumlar dışında ödemeler iade edilemez ve değiştirilemez. İptal genellikle gelecek yenilemeyi engeller ancak tamamlanmış bir fatura dönemini geriye dönük iade etmez.",
        },
        {
          type: "p",
          text: "İadeler ve yasal cayma / düşünme süresi hakları (dijital içerik veya hizmetlere uygulanabildiği yerlerde) Paddle'ın Alıcı Koşulları ve İade Politikası kapsamında işlenir. Kaify Ai takdirî yardım sağlayabilir ancak yürürlükteki hukuk ve Paddle'ın onaylı süreci dışında iade vaat etmez. Dolandırıcılık, kötüye kullanım, manipülasyon veya tekrarlayan iade suistimali için iadeler, yasaya tabi olarak reddedilebilir. Başarılı bir iade veya chargeback, ilgili ücretli erişimin askıya alınması veya kaldırılmasıyla sonuçlanabilir.",
        },
        {
          type: "p",
          text: "Bu Koşullar, feragat edilemeyen zorunlu tüketici, cayma veya kusurlu dijital hizmet haklarından feragat etmez.",
        },
      ],
    },
    {
      id: "price-changes",
      title: "15. Fiyat ve özellik değişiklikleri",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai yeni planlar sunabilir ve gelecek fatura dönemleri için abonelik fiyatlarını değiştirebilir. Fiyat değişiklikleri zaten ödenmiş bir fatura dönemini geriye dönük etkilemez. Mevcut yinelenen bir abonelik için artan fiyat, Kaify Ai, Paddle veya her ikisi aracılığıyla bildirimin ardından gelecek bir yenilemede yürürlüğe girebilir. Yürürlükteki hukuk olumlu onay gerektiriyorsa, artan fiyat bu onay olmadan tahsil edilmez. Yeni fiyatı kabul etmezseniz abonelik Kaify Ai'ın izin verdiği yerde mevcut fiyatta kalabilir veya o sıradaki fatura döneminin sonunda sona erebilir. Yeni fiyat yürürlüğe girmeden önce iptal edebilirsiniz. Vergiler, döviz çevrimi ve ödeme yöntemi ücretleri izin verilen yerlerde bağımsız olarak değişebilir.",
        },
        {
          type: "p",
          text: "Yeni bir katalog fiyatı oluşturmak mevcut abonelikleri otomatik değiştirmez. Güncellemeler uygun Paddle Billing sürecini kullanmalıdır. Kaify Ai, kullanıcı başlatımlı plan değişikliklerinden önce orantılı ücretlendirmeyi önizlemelidir. Koşul metni tek başına gerekli bildirimlerin veya onayın yerine geçmez.",
        },
      ],
    },
    {
      id: "suspension",
      title: "16. Askıya alma ve sonlandırma",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai; Koşul ihlalleri, ödeme yapılmaması, chargeback veya şüpheli ödeme kötüye kullanımı, dolandırıcılık veya güvenlik tehditleri, tehlikeli veya yasa dışı davranış, fikri mülkiyet kötüye kullanımı, Paddle talepleri, yasal veya düzenleyici yükümlülükler, Kaify Ai/kullanıcılar/üçüncü taraflara risk, açıklanan yerlerde uzun süreli hareketsizlik veya hizmetin sonlandırılması nedeniyle erişimi askıya alabilir veya sonlandırabilir. Ciddi güvenlik, dolandırıcılık, güvenlik veya yasal tehditlerde derhal işlem yapılabilir. Makul ve yasal olarak gerekli olduğunda Kaify Ai bildirim yapar ve " +
            SUPPORT_EMAIL +
            " üzerinden itiraz kanalı sağlar.",
        },
        {
          type: "p",
          text: "Sonuçlar hesap erişiminin kaybı, abonelik değişiklikleri, içeriğin kullanılamaması ve sınırlı iade uygunluğu içerebilir. Doğası gereği devam etmesi gereken hükümler (fikri mülkiyet, feragatler, sorumluluk sınırları, uygulanabilir olduğu yerlerde tazmin ve uygulanacak hukuk dahil) sonlandırmadan sonra da geçerlidir. Veriler yasal talepler, dolandırıcılık önleme, muhasebe veya uyum için gerektiği şekilde saklanabilir.",
        },
      ],
    },
    {
      id: "disclaimers",
      title: "17. Garanti feragatleri",
      blocks: [
        {
          type: "p",
          text: 'YASANIN İZİN VERDİĞİ AZAMİ ÖLÇÜDE HİZMET "OLDUĞU GİBİ" VE "MEVCUT OLDUĞU ŞEKİLDE" SUNULUR. KAIFY; TİCARİ ELVERİŞLİLİK, BELİRLİ BİR AMACA UYGUNLUK, HAK İHLALİ OLMAMASI (FERAGAT EDİLEBİLDİĞİ YERDE), SÜREKLİ KULLANILABİLİRLİK, HATASIZ İŞLEYİŞ, DOĞRULUK, EKSİKSİZLİK, FITNESS VEYA SAĞLIK SONUÇLARI, UYUMLULUK, VERİ KORUNMASI, ÜÇÜNCÜ TARAF HİZMETLERİ, AI ÇIKTILARI, KULLANICI İÇERİĞİ VE HER OLASI TEHDİDE KARŞI GÜVENLİK GARANTİLERİNDEN FERAGAT EDER. Yasal olarak hariç tutulamayan zorunlu garantiler ve tüketici güvenceleri etkilenmez.',
        },
      ],
    },
    {
      id: "liability",
      title: "18. Sorumluluğun sınırlandırılması [HUKUKİ İNCELEME GEREKLİ]",
      blocks: [
        {
          type: "p",
          text: `YASANIN İZİN VERDİĞİ AZAMİ ÖLÇÜDE ${LEGAL_ENTITY} VE KORUNAN BİREYLERİ İLE BAĞLI KURULUŞLARI; DOLAYLI, ARIZİ, ÖZEL, ÖRNEK NİTELİĞİNDE, CEZAİ VEYA SONUÇ OLARAK DOĞAN ZARARLARDAN; YA DA KÂR, GELİR, FIRSAT, İYİ NİYET, BEKLENEN TASARRUF, VERİ VEYA İŞ KESİNTİSİ KAYIPLARINDAN; YA DA TALİMATLARINIZ, HATALI KULLANICI VERİSİ, GÜVENSİZ EGZERSİZ SEÇİMLERİ, ÜÇÜNCÜ TARAF SİSTEMLERİ, İNTERNET ARIZALARI, PADDLE KESİNTİLERİ VEYA MÜCBİR SEBEP OLAYLARINDAN KAYNAKLANAN ZARARLARDAN SORUMLU DEĞİLDİR.`,
        },
        {
          type: "p",
          text: `ZORUNLU HUKUKA TABİ OLARAK, HİZMETTEN DOĞAN TOPLAM SORUMLULUK (A) TALEBE YOL AÇAN OLAYDAN ÖNCEKİ ON İKİ (12) AYDA KAIFY İÇİN ÖDEDİĞİNİZ TUTARLAR VEYA (B) 100 USD'DEN BÜYÜK OLANIYLA SINIRLIDIR. BU SINIRLAMALAR, UYGULANABİLDİĞİ YERDE, HUKUKİ DAYANAK NE OLURSA OLSUN VE OLASI KAYIP BİLDİRİLMİŞ OLSA BİLE GEÇERLİDİR.`,
        },
        {
          type: "p",
          text: "Yasal olarak sorumluluk doğuran ihmalden kaynaklanan ölüm veya kişisel yaralanma, dolandırıcılık, kasten kötü niyetli davranış veya yürürlükteki hukuk kapsamında sınırlanamayacak diğer sorumluluklar (AB/BK/Türkiye zorunlu tüketici hakları dahil) hariç tutulmaz veya sınırlanmaz.",
        },
      ],
    },
    {
      id: "indemnity",
      title: "19. Tazmin",
      blocks: [
        {
          type: "p",
          text: `Kaify Ai'ı ticari sıfatla kullanıyorsanız, yasanın izin verdiği ölçüde, yasa dışı kullanımınız, Koşul ihlalleriniz, kullanıcı içeriğiniz, üçüncü taraf haklarının ihlali, dolandırıcılık, hesap kötüye kullanımı veya davranışınızdan kaynaklanan düzenleyici taleplerden doğan iddialara karşı ${LEGAL_ENTITY}'yi ve yöneticilerini, yetkililerini, çalışanlarını ve temsilcilerini tazmin eder ve zarar görmemelerini sağlarsınız.`,
        },
        {
          type: "p",
          text: "Tüketiciler için tazmin yükümlülükleri yalnızca yetki alanınızda uygulanabilir olduğu ölçüde geçerlidir ve yasaklandığı yerlerde Kaify Ai'ın kendi kusurunu size kaydırmaz.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "20. Uygulanacak hukuk ve uyuşmazlıklar [HUKUK MÜŞAVİRLİĞİ TEYİDİ]",
      blocks: [
        {
          type: "p",
          text: `Bu Koşullar geçici olarak ${GOVERNING_LAW_PROVISIONAL} hukukuna tabidir. ${VENUE_PROVISIONAL} mahkemeleri münhasır olmayan yetkiye sahiptir; zorunlu tüketici hukukunun ikamet ettiğiniz ülkede veya başka zorunlu bir forumda dava açma hakkı verdiği durumlar saklıdır. Bu geçici tercih, işleten tüzel kişinin merkez yetki alanının hukuk müşavirliği tarafından teyidine tabidir.`,
        },
        {
          type: "p",
          text: `Önce 30 gün içinde gayriresmî çözüm denemek için ${SUPPORT_EMAIL} adresinden iletişime geçin. Kaify Ai bu Koşullarda küresel bir toplu dava feragati veya zorunlu ABD tarzı tahkim dayatmaz. Herhangi bir tahkim veya toplu dava hükmü yalnızca varsa hukuk müşavirliği onaylı bölgesel eklerde yer alır.`,
        },
      ],
    },
    {
      id: "general",
      title: "21. Genel hükümler",
      blocks: [
        {
          type: "ul",
          items: [
            "Tam sözleşme: bu Koşullar ile dahil edilen politikalar (Gizlilik, Çerezler, Tıbbi Feragat) ve sipariş/ödeme koşulları, zorunlu hukuka tabi olarak sözleşmeyi oluşturur.",
            "Bölünebilirlik: geçersiz hükümler gerekli asgari ölçüde düzeltilir; geri kalanı yürürlükte kalır.",
            "Feragat yok: bir hükmü uygulamamak feragat sayılmaz.",
            "Devir: Kaify Ai bağlı kuruluşa, halefe, alıcıya veya devralana devredebilir; siz, zorunlu hukukun izin verdiği durumlar dışında onay olmadan devredemezsiniz.",
            "Elektronik iletişim: bildirimleri elektronik almayı kabul edersiniz.",
            "Mücbir sebep: Kaify Ai makul kontrolü dışındaki gecikmelerden sorumlu değildir.",
            "Bağımsız yükleniciler: ortaklık veya istihdam ilişkisi doğmaz.",
            "Üçüncü taraf lehtar yok; açıkça belirtilenler hariç (uygulanabilir olduğu yerlerde 1. ve 18. Bölümlerin sınırlı lehtarları olarak korunan bireyler dahil).",
            "İngilizce esas alınır: Bu Koşulların birincil dili İngilizcedir; zorunlu yerel dil bildiriminin gerekli olduğu durumlar dışında çeviriler kolaylık içindir.",
            `Bildirimler: ${SUPPORT_EMAIL}; gizlilik: ${PRIVACY_EMAIL}; Gizlilik Politikası: ${PRIVACY_PATH}.`,
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "22. Değişiklikler",
      blocks: [
        {
          type: "p",
          text: `Bu Koşulları güncelleyebiliriz. Önemli değişiklikler gerektiğinde uygulama içinden veya e-postayla bildirilir. Yasanın izin verdiği ölçüde yürürlük tarihinden sonra kullanıma devam etmeniz kabul sayılır. Sürüm: ${TERMS_VERSION}.`,
        },
      ],
    },
  ],
  footer: `Sorular: ${SUPPORT_EMAIL} · Gizlilik: ${PRIVACY_EMAIL}`,
};
