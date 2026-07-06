#!/usr/bin/env node
/** One-shot: write chat.disclaimer.footer to every locale file. */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG_DIR = join(__dirname, "..", "lib", "lang");
const KEY = "chat.disclaimer.footer";

const TEXT = {
  en: "Coaches are not doctors and may make mistakes. Remember to adjust exercise and diet to suit yourself.",
  tr: "Koçlar doktor değildir ve hata yapabilir. Egzersiz ve diyet için kendine göre ayarlamayı unutma.",
  de: "Trainer sind keine Ärzte und können Fehler machen. Denke daran, Training und Ernährung an dich anzupassen.",
  fr: "Les coachs ne sont pas des médecins et peuvent se tromper. N'oublie pas d'adapter l'exercice et l'alimentation à ta situation.",
  es: "Los entrenadores no son médicos y pueden equivocarse. Recuerda adaptar el ejercicio y la dieta a tus necesidades.",
  "es-mx": "Los entrenadores no son médicos y pueden equivocarse. Recuerda adaptar el ejercicio y la dieta a tus necesidades.",
  "es-ar": "Los entrenadores no son médicos y pueden equivocarse. Recordá adaptar el ejercicio y la dieta a vos.",
  it: "I coach non sono medici e possono sbagliare. Ricorda di adattare esercizio e dieta alle tue esigenze.",
  pt: "Os treinadores não são médicos e podem errar. Lembre-se de ajustar exercício e dieta às suas necessidades.",
  nl: "Coaches zijn geen artsen en kunnen fouten maken. Vergeet niet oefening en dieet aan jezelf aan te passen.",
  ru: "Тренеры не врачи и могут ошибаться. Не забывай подстраивать тренировки и питание под себя.",
  pl: "Trenerzy nie są lekarzami i mogą się mylić. Pamiętaj, aby dostosować ćwiczenia i dietę do siebie.",
  ro: "Antrenorii nu sunt medici și pot greși. Nu uita să îți adaptezi exercițiile și dieta.",
  el: "Οι προπονητές δεν είναι γιατροί και μπορεί να κάνουν λάθη. Μην ξεχνάς να προσαρμόζεις άσκηση και διατροφή στον εαυτό σου.",
  sv: "Coacher är inte läkare och kan göra misstag. Kom ihåg att anpassa träning och kost efter dig själv.",
  cs: "Trenéři nejsou lékaři a mohou se mýlit. Nezapomeň přizpůsobit cvičení a stravu sobě.",
  hu: "Az edzők nem orvosok, és hibázhatnak. Ne felejtsd el az edzést és az étrendet magadhoz igazítani.",
  uk: "Тренери не лікарі й можуть помилятися. Не забувай підлаштовувати тренування та харчування під себе.",
  da: "Trænere er ikke læger og kan tage fejl. Husk at tilpasse træning og kost til dig selv.",
  no: "Trenere er ikke leger og kan ta feil. Husk å tilpasse trening og kosthold til deg selv.",
  fi: "Valmentajat eivät ole lääkäreitä ja voivat erehtyä. Muista sovittaa liikunta ja ruokavalio itseesi.",
  lt: "Treneriai nėra gydytojai ir gali klysti. Nepamiršk pritaikyti mankštą ir mitybą sau.",
  lv: "Treneri nav ārsti un var kļūdīties. Neaizmirsti pielāgot vingrinājumus un uzturu sev.",
  et: "Treenerid ei ole arstid ja võivad eksida. Ära unusta kohandada treeningut ja toitumist enda järgi.",
  sk: "Tréneri nie sú lekári a môžu sa mýliť. Nezabudni prispôsobiť cvičenie a stravu sebe.",
  sl: "Trenerji niso zdravniki in se lahko zmotijo. Ne pozabi prilagoditi vadbe in prehrane sebi.",
  hr: "Treneri nisu liječnici i mogu pogriješiti. Ne zaboravi prilagoditi vježbanje i prehranu sebi.",
  bg: "Треньорите не са лекари и могат да грешат. Не забравяй да нагласиш тренировките и храненето според себе си.",
  sr: "Тренери нису лекари и могу погрешити. Не заборави да прилагодиш вежбање и исхрану себи.",
  is: "Þjálfarar eru ekki læknar og geta gert mistök. Mundu að aðlaga æfingar og mataræði að þér.",
  mt: "Il-kowċes mhumiex tobba u jistgħu jagħmlu żbalji. Ftakar li tadatta l-eżerċizzju u d-dieta għalik.",
  sq: "Trajnerët nuk janë mjekë dhe mund të gabojnë. Mos harro të përshtatësh ushtrimet dhe dietën me veten.",
  bs: "Treneri nisu doktori i mogu pogriješiti. Ne zaboravi prilagoditi vježbanje i ishranu sebi.",
  mk: "Тренерите не се доктори и можат да погрешат. Не заборавај да ги прилагодиш вежбањето и исхраната на себе.",
  be: "Трэнеры не лекары і могуць памыліцца. Не забудзь падладзіць трэніроўкі і харчаванне пад сябе.",
  lb: "Trainer sinn keng Dokteren a kënnen Feeler maachen. Denk drun, Training an Iessen un dech unzepassen.",
  kk: "Жаттықтырушылар дәрігер емес және қателесуі мүмкін. Жаттығу мен диетаны өзіңе сай бейімдеуді ұмытпа.",
  uz: "Murabbiylar shifokor emas va xato qilishi mumkin. Mashq va dietani o'zingga moslashtirishni unutma.",
  az: "Məşqçilər həkim deyil və səhv edə bilərlər. Məşq və pəhrizini özünə uyğun tənzimləməyi unutma.",
  ar: "المدربون ليسوا أطباء وقد يخطئون. تذكّر تكييف التمرين والنظام الغذائي بما يناسبك.",
  he: "מאמנים אינם רופאים ועלולים לטעות. זכור להתאים את האימון והתזונה לעצמך.",
  fa: "مربی‌ها پزشک نیستند و ممکن است اشتباه کنند. فراموش نکن تمرین و رژیم غذایی را با خودت تطبیق بدهی.",
  ur: "کوچ ڈاکٹر نہیں ہیں اور غلطی کر سکتے ہیں۔ ورزش اور غذا کو اپنے مطابق بنانا نہ بھولیں۔",
  af: "Afrigters is nie dokters nie en kan foute maak. Onthou om oefening en dieet by jouself aan te pas.",
  yo: "Awọn olukọni kii ṣe dokita wọn le ṣe aṣiṣe. Ranti lati ṣatunṣe idaraya ati ounjẹ si ara rẹ.",
  hi: "कोच डॉक्टर नहीं हैं और गलती कर सकते हैं। व्यायाम और आहार को अपने अनुसार समायोजित करना न भूलें।",
  "zh-CN": "教练不是医生，也可能出错。请记住根据自身情况调整运动和饮食。",
  ja: "コーチは医師ではなく、間違えることもあります。運動と食事は自分に合わせて調整することを忘れないでください。",
  ko: "코치는 의사가 아니며 실수할 수 있습니다. 운동과 식단을 자신에게 맞게 조절하는 것을 잊지 마세요.",
  vi: "Huấn luyện viên không phải bác sĩ và có thể mắc sai lầm. Hãy nhớ điều chỉnh tập luyện và chế độ ăn cho phù hợp với bản thân.",
  th: "โค้ชไม่ใช่แพทย์และอาจทำผิดพลาดได้ อย่าลืมปรับการออกกำลังกายและอาหารให้เหมาะกับตัวคุณ",
  id: "Pelatih bukan dokter dan bisa salah. Ingat menyesuaikan olahraga dan diet dengan dirimu sendiri.",
  ms: "Jurulatih bukan doktor dan boleh membuat kesilapan. Ingat sesuaikan senaman dan diet mengikut diri anda.",
  bn: "কোচরা ডাক্তার নন এবং ভুল করতে পারেন। ব্যায়াম ও খাদ্য নিজের জন্য উপযোগী করতে ভুলবেন না।",
};

const enOrder = JSON.parse(readFileSync(join(LANG_DIR, "en.json"), "utf8"));

for (const file of readdirSync(LANG_DIR).filter((f) => f.endsWith(".json"))) {
  const code = file.replace(/\.json$/, "");
  const path = join(LANG_DIR, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  data[KEY] = TEXT[code] ?? TEXT.en;
  const ordered = {};
  for (const k of Object.keys(enOrder)) {
    if (data[k] !== undefined) ordered[k] = data[k];
  }
  for (const k of Object.keys(data)) {
    if (ordered[k] === undefined) ordered[k] = data[k];
  }
  writeFileSync(path, JSON.stringify(ordered, null, 2) + "\n");
  console.log("updated", code);
}
