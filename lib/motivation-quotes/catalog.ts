import type { SupportedLocale } from "@/lib/i18n/dictionary";

import en from "./en.json";
import tr from "./tr.json";
import de from "./de.json";
import fr from "./fr.json";
import es from "./es.json";
import esMx from "./es-mx.json";
import esAr from "./es-ar.json";
import it from "./it.json";
import pt from "./pt.json";
import nl from "./nl.json";
import ru from "./ru.json";
import pl from "./pl.json";
import ro from "./ro.json";
import el from "./el.json";
import sv from "./sv.json";
import cs from "./cs.json";
import hu from "./hu.json";
import uk from "./uk.json";
import da from "./da.json";
import no from "./no.json";
import fi from "./fi.json";
import lt from "./lt.json";
import lv from "./lv.json";
import et from "./et.json";
import sk from "./sk.json";
import sl from "./sl.json";
import hr from "./hr.json";
import bg from "./bg.json";
import sr from "./sr.json";
import is from "./is.json";
import mt from "./mt.json";
import sq from "./sq.json";
import bs from "./bs.json";
import mk from "./mk.json";
import be from "./be.json";
import lb from "./lb.json";
import kk from "./kk.json";
import uz from "./uz.json";
import az from "./az.json";
import ar from "./ar.json";
import he from "./he.json";
import fa from "./fa.json";
import ur from "./ur.json";
import af from "./af.json";
import yo from "./yo.json";
import hi from "./hi.json";
import zhCN from "./zh-CN.json";
import ja from "./ja.json";
import ko from "./ko.json";
import vi from "./vi.json";
import th from "./th.json";
import id from "./id.json";
import ms from "./ms.json";
import bn from "./bn.json";

export const QUOTES_BY_LOCALE: Record<SupportedLocale, readonly string[]> = {
  en,
  tr,
  de,
  fr,
  es,
  "es-mx": esMx,
  "es-ar": esAr,
  it,
  pt,
  nl,
  ru,
  pl,
  ro,
  el,
  sv,
  cs,
  hu,
  uk,
  da,
  no,
  fi,
  lt,
  lv,
  et,
  sk,
  sl,
  hr,
  bg,
  sr,
  is,
  mt,
  sq,
  bs,
  mk,
  be,
  lb,
  kk,
  uz,
  az,
  ar,
  he,
  fa,
  ur,
  af,
  yo,
  hi,
  "zh-CN": zhCN,
  ja,
  ko,
  vi,
  th,
  id,
  ms,
  bn,
};
