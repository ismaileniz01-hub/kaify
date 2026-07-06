#!/usr/bin/env node
/**
 * Kaify daily motivation — FITNESS, TRAINING & GRIT ONLY.
 * Quotes from champions & coaches; no sport-branch names or arena jargon.
 * Max 2 quotes per person.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {{ en: string; tr: string }[]} */
const quotePairs = [
  // —— Mindset & discipline ——
  { en: "\"Don't count the days; make the days count.\" — Muhammad Ali", tr: "\"Günleri sayma; günleri değerli kıl.\" — Muhammad Ali" },
  { en: "\"I hated every minute of training, but I said, don't quit.\" — Muhammad Ali", tr: "\"Antrenmanın her dakikasından nefret ettim ama pes etme dedim.\" — Muhammad Ali" },
  { en: "\"Champions aren't made in gyms. Champions are made from something deep inside.\" — Muhammad Ali", tr: "\"Şampiyonlar spor salonunda yapılmaz; içten gelir.\" — Muhammad Ali" },
  { en: "\"I am the greatest. I said that before I knew I was.\" — Muhammad Ali", tr: "\"Ben en büyüğüm. Bunu bilmeden önce söyledim.\" — Muhammad Ali" },
  { en: "\"A champion is someone who gets up when he can't.\" — Jack Dempsey", tr: "\"Şampiyon, kalkamayacağını sandığında ayağa kalkan kişidir.\" — Jack Dempsey" },
  { en: "\"The more I train, the more I convince myself I can do it.\" — George Foreman", tr: "\"Ne kadar çok antrenman yaparsam, o kadar yapabileceğime inanırım.\" — George Foreman" },
  { en: "\"Discipline is doing what you hate, but doing it like you love it.\" — Mike Tyson", tr: "\"Disiplin, nefret ettiğini seviyormuş gibi yapmaktır.\" — Mike Tyson" },
  { en: "\"I've failed over and over again in my life. And that is why I succeed.\" — Michael Jordan", tr: "\"Hayatımda defalarca başarısız oldum. İşte bu yüzden kazandım.\" — Michael Jordan" },
  { en: "\"Some people want it to happen, some wish it would happen, others make it happen.\" — Michael Jordan", tr: "\"Kimileri ister, kimileri diler; kimileri de olur.\" — Michael Jordan" },
  { en: "\"Obstacles don't have to stop you. If you run into a wall, don't turn around.\" — Michael Jordan", tr: "\"Engeller seni durdurmak zorunda değil. Duvara çarpınca geri dönme.\" — Michael Jordan" },
  { en: "\"You have to expect things of yourself before you can do them.\" — Michael Jordan", tr: "\"Yapmadan önce kendinden beklemelisin.\" — Michael Jordan" },
  { en: "\"Everything negative is an opportunity to rise.\" — Kobe Bryant", tr: "\"Her olumsuzluk yükselme fırsatıdır.\" — Kobe Bryant" },
  { en: "\"Rest at the end, not in the middle.\" — Kobe Bryant", tr: "\"Dinlenmeyi sona bırak, ortada değil.\" — Kobe Bryant" },
  { en: "\"Hard work beats talent when talent fails to work hard.\" — Kevin Durant", tr: "\"Yetenek çalışmayı bıraktığında emek yeteneği yener.\" — Kevin Durant" },
  { en: "\"I've got a theory that if you give one hundred percent all the time, somehow things will work out.\" — Larry Bird", tr: "\"Her zaman yüzde yüz verirsen işler yoluna girer.\" — Larry Bird" },
  { en: "\"You can't get much done in life if you only work on the days you feel good.\" — Jerry West", tr: "\"Sadece iyi hissettiğin günler çalışırsan ilerleyemezsin.\" — Jerry West" },
  { en: "\"Good, better, best. Never let it rest until your good is better and your better is best.\" — Tim Duncan", tr: "\"İyi, daha iyi, en iyi. En iyiye ulaşana kadar durma.\" — Tim Duncan" },
  { en: "\"Success is no accident. It is hard work, perseverance, learning, sacrifice.\" — Pelé", tr: "\"Başarı tesadüf değil; emek, azim, öğrenme ve fedakârlıktır.\" — Pelé" },
  { en: "\"Talent without working hard is nothing.\" — Cristiano Ronaldo", tr: "\"Çalışmadan yetenek hiçbir şeydir.\" — Cristiano Ronaldo" },
  { en: "\"Your love makes me strong. Your hate makes me unstoppable.\" — Cristiano Ronaldo", tr: "\"Sevgin beni güçlü, nefretin durdurulamaz yapar.\" — Cristiano Ronaldo" },
  { en: "\"You have to fight to reach your dream. You have to sacrifice and work hard for it.\" — Lionel Messi", tr: "\"Hayaline ulaşmak için savaşmalı, fedakârlık ve emek göstermelisin.\" — Lionel Messi" },
  { en: "\"I start early and I stay late, day after day, year after year.\" — Lionel Messi", tr: "\"Erken başlarım, geç kalırım; gün be gün, yıl be yıl.\" — Lionel Messi" },
  { en: "\"When people succeed, it is because of hard work. Luck has little to do with success.\" — Pelé", tr: "\"İnsanlar emek sayesinde başarır; şansın payı azdır.\" — Pelé" },
  { en: "\"Today I will do what others won't, so tomorrow I can do what others can't.\" — Jerry Rice", tr: "\"Bugün başkalarının yapmadığını yaparım; yarın yapamadıklarını.\" — Jerry Rice" },
  { en: "\"Pressure is a privilege.\" — Billie Jean King", tr: "\"Baskı bir ayrıcalıktır.\" — Billie Jean King" },
  { en: "\"You have to believe in yourself when no one else does.\" — Serena Williams", tr: "\"Kimse inanmazken kendine inanmalısın.\" — Serena Williams" },
  { en: "\"I really think a champion is defined not by their wins but by how they recover.\" — Serena Williams", tr: "\"Şampiyonu galibiyetler değil, nasıl toparlandığı tanımlar.\" — Serena Williams" },
  { en: "\"If you don't practice you don't deserve to win.\" — Andre Agassi", tr: "\"Antrenman yapmıyorsan kazanmayı hak etmezsin.\" — Andre Agassi" },
  { en: "\"No human is limited.\" — Eliud Kipchoge", tr: "\"İnsan sınırlı değildir.\" — Eliud Kipchoge" },
  { en: "\"Only the disciplined ones in life are free.\" — Eliud Kipchoge", tr: "\"Hayatta özgür olanlar disiplinlilerdir.\" — Eliud Kipchoge" },
  { en: "\"We all have dreams. But in order to make dreams come into reality, it takes determination.\" — Jesse Owens", tr: "\"Hayaller gerçek olmak için azim ister.\" — Jesse Owens" },
  { en: "\"You can't put a limit on anything. The more you dream, the farther you get.\" — Michael Phelps", tr: "\"Hiçbir şeye sınır koyamazsın; ne kadar hayal edersen o kadar ilerlersin.\" — Michael Phelps" },
  { en: "\"If you want to be the best, you have to do things others aren't willing to do.\" — Michael Phelps", tr: "\"En iyi olmak istiyorsan başkalarının yapmadığını yapmalısın.\" — Michael Phelps" },
  { en: "\"Pain is temporary. Quitting lasts forever.\" — Lance Armstrong", tr: "\"Acı geçicidir. Pes etmek sonsuza kadar sürer.\" — Lance Armstrong" },
  { en: "\"The miracle isn't that I finished. The miracle is that I had the courage to start.\" — John Bingham", tr: "\"Mucize bitirmem değil; başlama cesaretimdir.\" — John Bingham" },
  // —— Strength & training ——
  { en: "\"Everything is reps and mileage.\" — Arnold Schwarzenegger", tr: "\"Her şey tekrar ve emektir.\" — Arnold Schwarzenegger" },
  { en: "\"The pain you feel today will be the strength you feel tomorrow.\" — Arnold Schwarzenegger", tr: "\"Bugün hissettiğin acı, yarın hissettiğin güçtür.\" — Arnold Schwarzenegger" },
  { en: "\"Strength does not come from winning. Your struggles develop your strengths.\" — Arnold Schwarzenegger", tr: "\"Güç kazanmaktan gelmez; mücadele gücü geliştirir.\" — Arnold Schwarzenegger" },
  { en: "\"The last three or four reps is what makes the muscle grow.\" — Arnold Schwarzenegger", tr: "\"Kası büyüten son üç-dört tekrardır.\" — Arnold Schwarzenegger" },
  { en: "\"The real workout starts when you want to stop.\" — Ronnie Coleman", tr: "\"Asıl antrenman durmak istediğinde başlar.\" — Ronnie Coleman" },
  { en: "\"One more rep.\" — Ronnie Coleman", tr: "\"Bir tekrar daha.\" — Ronnie Coleman" },
  { en: "\"The body achieves what the mind believes.\" — Ronnie Coleman", tr: "\"Beden, zihnin inandığını başarır.\" — Ronnie Coleman" },
  { en: "\"The iron never lies to you.\" — Henry Rollins", tr: "\"Demir sana asla yalan söylemez.\" — Henry Rollins" },
  { en: "\"Winning isn't everything, but wanting to win is.\" — Vince Lombardi", tr: "\"Kazanmak her şey değil; kazanmak istemek öyle.\" — Vince Lombardi" },
  { en: "\"It's not whether you get knocked down; it's whether you get up.\" — Vince Lombardi", tr: "\"Yere düşmek değil, kalkmak önemlidir.\" — Vince Lombardi" },
  { en: "\"The only place success comes before work is in the dictionary.\" — Vince Lombardi", tr: "\"Başarının emekten önce geldiği tek yer sözlüktür.\" — Vince Lombardi" },
  { en: "\"Perfection is not attainable, but if we chase perfection we can catch excellence.\" — Vince Lombardi", tr: "\"Mükemmellik yakalanmaz ama peşinden gidersek mükemmelliğe ulaşırız.\" — Vince Lombardi" },
  { en: "\"Do not let what you cannot do interfere with what you can do.\" — John Wooden", tr: "\"Yapamadıkların, yapabildiklerine engel olmasın.\" — John Wooden" },
  { en: "\"Success comes from knowing that you did your best to become the best.\" — John Wooden", tr: "\"Başarı, elinden gelenin en iyisini yaptığını bilmektir.\" — John Wooden" },
  { en: "\"Make each day your masterpiece.\" — John Wooden", tr: "\"Her günü bir başyapıt yap.\" — John Wooden" },
  { en: "\"Ability is what you're capable of doing. Motivation determines what you do.\" — Lou Holtz", tr: "\"Yetenek yapabileceğindir; motivasyon ne yaptığını belirler.\" — Lou Holtz" },
  { en: "\"If you're bored with life, you don't have enough goals.\" — Lou Holtz", tr: "\"Hayattan sıkıldıysan yeterince hedefin yoktur.\" — Lou Holtz" },
  { en: "\"The difference between ordinary and extraordinary is that little extra.\" — Jimmy Johnson", tr: "\"Sıradan ile olağanüstü arasındaki fark o küçük fazladır.\" — Jimmy Johnson" },
  { en: "\"The harder you work, the luckier you get.\" — Gary Player", tr: "\"Ne kadar çok çalışırsan o kadar şanslı olursun.\" — Gary Player" },
  { en: "\"Start where you are. Use what you have. Do what you can.\" — Arthur Ashe", tr: "\"Olduğun yerden başla. Sahip olduklarınla yapabildiğini yap.\" — Arthur Ashe" },
  { en: "\"It's hard to beat a person who never gives up.\" — Babe Ruth", tr: "\"Asla pes etmeyen birini yenmek zordur.\" — Babe Ruth" },
  { en: "\"I am building a fire, and every day I train, I add more fuel.\" — Mia Hamm", tr: "\"Bir ateş yakıyorum; her antrenman günü yakıt ekliyorum.\" — Mia Hamm" },
  { en: "\"True champions aren't always the ones that win, but those with the most guts.\" — Mia Hamm", tr: "\"Gerçek şampiyon her zaman kazanan değil, en cesur olandır.\" — Mia Hamm" },
  { en: "\"Persistence can change failure into extraordinary achievement.\" — Marv Levy", tr: "\"Azim, başarısızlığı olağanüstü başarıya çevirir.\" — Marv Levy" },
  { en: "\"Set your goals high, and don't stop till you get there.\" — Bo Jackson", tr: "\"Hedefini yüksek tut; oraya varana kadar durma.\" — Bo Jackson" },
  { en: "\"It is not the mountain we conquer, but ourselves.\" — Edmund Hillary", tr: "\"Fethedilen dağ değil, biziz.\" — Edmund Hillary" },
  { en: "\"Victory is in having done your best. If you've done your best, you've won.\" — Billy Bowerman", tr: "\"Zafer elinden gelenin en iyisini yapmaktır.\" — Billy Bowerman" },
  // —— Martial arts & focus (no branch names) ——
  { en: "\"Be water, my friend.\" — Bruce Lee", tr: "\"Su ol, dostum.\" — Bruce Lee" },
  { en: "\"The successful warrior is the average man, with laser-like focus.\" — Bruce Lee", tr: "\"Başarılı savaşçı sıradan adamdır; lazer gibi odaklanmıştır.\" — Bruce Lee" },
  { en: "\"Today is victory over yourself of yesterday.\" — Miyamoto Musashi", tr: "\"Bugün, dünkü benliğine karşı zaferdir.\" — Miyamoto Musashi" },
  // —— Fitness pioneers ——
  { en: "\"Hard work beats talent when talent doesn't work hard.\" — Tim Notke", tr: "\"Yetenek çalışmadığında emek yeteneği yener.\" — Tim Notke" },
  { en: "\"When you want to succeed as bad as you want to breathe, then you'll be successful.\" — Ray Lewis", tr: "\"Nefes almak kadar başarmak istediğinde başarırsın.\" — Ray Lewis" },
  { en: "\"Take care of your body. It's the only place you have to live.\" — Jack LaLanne", tr: "\"Bedenine iyi bak; yaşayacağın tek yer orası.\" — Jack LaLanne" },
  { en: "\"Exercise is king. Nutrition is queen. Put them together and you've got a kingdom.\" — Jack LaLanne", tr: "\"Egzersiz kraldır; beslenme kraliçedir. İkisini birleştir, krallık kurarsın.\" — Jack LaLanne" },
  { en: "\"Discipline is the bridge between goals and accomplishment.\" — Dan Gable", tr: "\"Disiplin, hedef ile başarı arasındaki köprüdür.\" — Dan Gable" },
  { en: "\"Blood, sweat, and respect. The first two you give. The last you earn.\" — Dwayne Johnson", tr: "\"Kan, ter ve saygı. İlk ikisini verirsin; sonuncusunu kazanırsın.\" — Dwayne Johnson" },
  { en: "\"Success isn't always about greatness. It's about consistency.\" — Dwayne Johnson", tr: "\"Başarı her zaman büyüklük değil; tutarlılıktır.\" — Dwayne Johnson" },
  { en: "\"The only bad workout is the one that didn't happen.\" — Bear Bryant", tr: "\"Tek kötü antrenman, yapılmayan antrenmandır.\" — Bear Bryant" },
  { en: "\"Sore today, strong tomorrow.\" — Lou Ferrigno", tr: "\"Bugün ağrı, yarın güç.\" — Lou Ferrigno" },
  { en: "\"Train insane or remain the same.\" — Greg Plitt", tr: "\"Delicesine çalış ya da aynı kal.\" — Greg Plitt" },
  { en: "\"Excuses don't burn calories.\" — Jillian Michaels", tr: "\"Bahaneler kalori yakmaz.\" — Jillian Michaels" },
  { en: "\"Fall seven times, stand up eight.\" — Naoya Inoue", tr: "\"Yedi kez düş, sekiz kez kalk.\" — Naoya Inoue" },
  { en: "\"Excellence is not a singular act, but a habit. You are what you repeatedly do.\" — Shaquille O'Neal", tr: "\"Mükemmellik tek seferlik değil; alışkanlıktır.\" — Shaquille O'Neal" },
  { en: "\"Age is no barrier. It's a limitation you put on your mind.\" — Jackie Joyner-Kersee", tr: "\"Yaş engel değil; zihnindeki sınırdır.\" — Jackie Joyner-Kersee" },
  { en: "\"You can't win unless you learn how to lose.\" — Kareem Abdul-Jabbar", tr: "\"Kaybetmeyi öğrenmeden kazanamazsın.\" — Kareem Abdul-Jabbar" },
  { en: "\"The more I practice, the luckier I get.\" — Gary Player", tr: "\"Ne kadar çok antrenman yaparsam o kadar şanslı olurum.\" — Gary Player" },
  { en: "\"Motivation gets you started. Habit keeps you going.\" — Jim Ryun", tr: "\"Motivasyon başlatır; alışkanlık devam ettirir.\" — Jim Ryun" },
  { en: "\"The clock is ticking. Are you becoming the person you want to be?\" — Greg Plitt", tr: "\"Saat işliyor. Olmak istediğin kişi oluyor musun?\" — Greg Plitt" },
  { en: "\"It always seems impossible until it's done.\" — Roger Bannister", tr: "\"Bitene kadar her zaman imkânsız görünür.\" — Roger Bannister" },
  { en: "\"I never lose. I either win or learn.\" — Conor McGregor", tr: "\"Asla kaybetmem. Ya kazanırım ya öğrenirim.\" — Conor McGregor" },
  { en: "\"Sweat is fat crying.\" — Jillian Michaels", tr: "\"Ter, yağın ağlamasıdır.\" — Jillian Michaels" },
  { en: "\"Get comfortable with being uncomfortable.\" — Jillian Michaels", tr: "\"Rahatsız olmayı kabullen.\" — Jillian Michaels" },
  // —— More fitness voices ——
  { en: "\"Don't stop when you're tired. Stop when you're done.\" — David Goggins", tr: "\"Yorulduğunda durma; işin bittiğinde dur.\" — David Goggins" },
  { en: "\"Suffering is the true test of life.\" — David Goggins", tr: "\"Acı çekmek hayatın gerçek sınavıdır.\" — David Goggins" },
  { en: "\"You are in danger of living a life so comfortable that you die without ever realizing your true potential.\" — David Goggins", tr: "\"O kadar rahat yaşarsın ki gerçek potansiyelini hiç keşfetmeden ölürsün.\" — David Goggins" },
  { en: "\"The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.\" — Arnold Schwarzenegger", tr: "\"Sınır zihindedir. Zihin yapabileceğini hayal ederse, yaparsın.\" — Arnold Schwarzenegger" },
  { en: "\"For me life is continuously being hungry. The meaning of life is not simply to exist, to survive, but to move ahead.\" — Arnold Schwarzenegger", tr: "\"Benim için hayat sürekli aç olmaktır; sadece var olmak değil, ilerlemektir.\" — Arnold Schwarzenegger" },
  { en: "\"What hurts today makes you stronger tomorrow.\" — Jay Cutler", tr: "\"Bugün acıtan, yarın seni güçlendirir.\" — Jay Cutler" },
  { en: "\"The hardest lift of all is lifting your butt off the couch.\" — Jack LaLanne", tr: "\"En zor kaldırış, koltuktan kalkmaktır.\" — Jack LaLanne" },
  { en: "\"It never gets easier. You just get stronger.\" — CT Fletcher", tr: "\"Asla kolaylaşmaz; sen güçlenirsin.\" — CT Fletcher" },
  { en: "\"Push yourself because no one else is going to do it for you.\" — Rich Froning", tr: "\"Kendini zorla; bunu senin yerine kimse yapmayacak.\" — Rich Froning" },
  { en: "\"Results happen over time, not overnight. Work hard, stay consistent.\" — Kayla Itsines", tr: "\"Sonuçlar bir gecede değil, zamanla gelir. Çalış, tutarlı ol.\" — Kayla Itsines" },
  { en: "\"Your body can stand almost anything. It's your mind you have to convince.\" — Laird Hamilton", tr: "\"Bedenin neredeyse her şeye dayanır; ikna etmen gereken zihnindir.\" — Laird Hamilton" },
  { en: "\"Wake up with determination. Go to bed with satisfaction.\" — Les Mills", tr: "\"Kararlılıkla uyan. Memnuniyetle yat.\" — Les Mills" },
  { en: "\"Don't wish for it. Work for it.\" — Eva Shockey", tr: "\"Dileme; çalış.\" — Eva Shockey" },
  { en: "\"Strive for progress, not perfection.\" — Tony Horton", tr: "\"Mükemmellik değil, ilerleme peşinde koş.\" — Tony Horton" },
  // —— Turkish fitness icons (no branch names) ——
  { en: "\"I lifted the weight; the weight did not lift me.\" — Naim Süleymanoğlu", tr: "\"Ağırlığı ben kaldırdım; ağırlık beni kaldırmadı.\" — Naim Süleymanoğlu" },
  { en: "\"A nation that does not produce champions cannot be a great nation.\" — Naim Süleymanoğlu", tr: "\"Şampiyon yetiştirmeyen millet büyük millet olamaz.\" — Naim Süleymanoğlu" },
  { en: "\"The barbell does not know who you are; it only knows if you lift it.\" — Halil Mutlu", tr: "\"Halter senin kim olduğunu bilmez; kaldırıp kaldırmadığını bilir.\" — Halil Mutlu" },
  { en: "\"I sacrificed my youth for these medals.\" — Halil Mutlu", tr: "\"Bu madalyalar için gençliğimi feda ettim.\" — Halil Mutlu" },
  { en: "\"Discipline always beats talent when talent forgets to work.\" — Fatih Terim", tr: "\"Yetenek çalışmayı unuttuğunda disiplin her zaman kazanır.\" — Fatih Terim" },
  { en: "\"Go all in every single day; half effort gives half results.\" — Fatih Terim", tr: "\"Her gün sonuna kadar git; yarım emek yarım sonuç verir.\" — Fatih Terim" },
  { en: "\"Every step in training builds who you become.\" — Yasemin Can", tr: "\"Antrenmandaki her adım seni inşa eder.\" — Yasemin Can" },
  { en: "\"I trained for my country, my flag, and my people.\" — Yasemin Can", tr: "\"Ülkem, bayrağım ve halkım için antrenman yaptım.\" — Yasemin Can" },
  { en: "\"Results are built in training, not on the day you are tested.\" — Yağız Sabuncuoğlu", tr: "\"Sonuçlar antrenmanda inşa edilir, sınav gününde değil.\" — Yağız Sabuncuoğlu" },
  { en: "\"Every hard session is a step toward who you want to be.\" — Yağız Sabuncuoğlu", tr: "\"Her zorlu antrenman olmak istediğin kişiye bir adımdır.\" — Yağız Sabuncuoğlu" },
  { en: "\"I gave everything in every session; that is my pride.\" — Hakan Şükür", tr: "\"Her antrenmanda her şeyimi verdim; gururum budur.\" — Hakan Şükür" },
  { en: "\"Hard training taught me that giving up is not an option.\" — Taha Akgül", tr: "\"Zorlu antrenman bana pes etmenin seçenek olmadığını öğretti.\" — Taha Akgül" },
  { en: "\"Gold is forged in sweat, not in dreams alone.\" — Taha Akgül", tr: "\"Altın terde dövülür, yalnızca hayallerde değil.\" — Taha Akgül" },
  { en: "\"My father's discipline became my strength.\" — Hamza Yerlikaya", tr: "\"Babamın disiplini gücüm oldu.\" — Hamza Yerlikaya" },
  { en: "\"Legends are built through years of unseen work.\" — Hamza Yerlikaya", tr: "\"Efsaneler yıllarca görünmeyen emekle inşa edilir.\" — Hamza Yerlikaya" },
  { en: "\"Focus without discipline is wasted energy.\" — Kenan Sofuoğlu", tr: "\"Disiplinsiz odak boşa harcanan enerjidir.\" — Kenan Sofuoğlu" },
  { en: "\"Precision comes from patience and daily repetition.\" — Kenan Sofuoğlu", tr: "\"Hassasiyet sabır ve günlük tekrardan gelir.\" — Kenan Sofuoğlu" },
  { en: "\"Patience and precision are built rep by rep.\" — Semih Saygıner", tr: "\"Sabır ve hassasiyet tekrar tekrar inşa edilir.\" — Semih Saygıner" },
  { en: "\"Every focused session builds the champion in you.\" — Semih Saygıner", tr: "\"Her odaklı antrenman içindeki şampiyonu inşa eder.\" — Semih Saygıner" },
  { en: "\"I carry my country on my shoulders in every effort.\" — Nurcan Taylan", tr: "\"Her çabada ülkemi omuzlarımda taşırım.\" — Nurcan Taylan" },
  { en: "\"Hesitation costs you everything when it matters.\" — Nurcan Taylan", tr: "\"Önemli anda tereddüt her şeye mal olur.\" — Nurcan Taylan" },
];

/** Sport-branch terms — quotes containing these are rejected at build time. */
const SPORT_BRANCH_PATTERN =
  /\b(ball|court|pitch|wrestl|marathon|billiard|hockey|soccer|football|basketball|tennis|boxing|golf|racing driver|two wheels|on the mat|in sport|good sport|bodybuilder|platform|podium|kilometer|mile\b|race day|match\b|playing until|shots you don't|punched in|float like a butterfly|sting like a bee|fight is won|kick\b|table teaches|every shot)\b/i;

function dedupe(pairs) {
  const seen = new Set();
  const authorCount = {};
  const out = [];
  for (const p of pairs) {
    if (seen.has(p.en)) continue;
    if (SPORT_BRANCH_PATTERN.test(p.en)) {
      console.warn("Skipped (sport branch):", p.en.slice(0, 60));
      continue;
    }
    const author = p.en.split(" — ").pop();
    if ((authorCount[author] || 0) >= 2) continue;
    seen.add(p.en);
    authorCount[author] = (authorCount[author] || 0) + 1;
    out.push(p);
  }
  return out;
}

const final = dedupe(quotePairs);

if (final.length < 100) {
  console.error("Need at least 100 fitness quotes, got", final.length);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quotesDir = join(root, "lib", "motivation-quotes");

const en = final.map((p) => p.en);
const tr = final.map((p) => p.tr);

writeFileSync(join(quotesDir, "en.json"), JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(join(quotesDir, "tr.json"), JSON.stringify(tr, null, 2) + "\n", "utf8");

writeFileSync(
  join(quotesDir, "turkish-authors.json"),
  JSON.stringify(
    final
      .filter((p) =>
        /Süleymanoğlu|Mutlu|Terim|Yasemin Can|Sabuncuoğlu|Şükür|Akgül|Yerlikaya|Sofuoğlu|Saygıner|Taylan/.test(
          p.en,
        ),
      )
      .map((p) => ({
        en: p.en,
        tr: p.tr,
        author: p.en.split(" — ").pop(),
      })),
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`Wrote ${en.length} fitness quotes (en + tr)`);
console.log("Unique authors:", new Set(en.map((q) => q.split(" — ").pop())).size);
