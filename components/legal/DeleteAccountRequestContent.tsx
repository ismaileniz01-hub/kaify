"use client";

import Link from "next/link";
import {
  DELETE_ACCOUNT_PATH,
  PRIVACY_PATH,
  SUPPORT_EMAIL,
} from "@/lib/legal/constants";
import { useLang } from "@/lib/lang-context";

const SIGN_IN_HREF = `/login?mode=signin&next=/settings`;
const MAIL_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}`;

export function DeleteAccountRequestContent() {
  const { t } = useLang();

  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-p:text-zinc-300 prose-li:text-zinc-300">
      <p className="lead text-zinc-300">{t("delete_account.intro")}</p>

      <section className="mb-10">
        <h2>{t("delete_account.how.title")}</h2>
        <ol>
          <li>{t("delete_account.how.app")}</li>
          <li>{t("delete_account.how.web")}</li>
          <li>
            {t("delete_account.how.email")}{" "}
            <a href={MAIL_HREF} className="text-emerald-400 underline">
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2>{t("delete_account.deleted.title")}</h2>
        <p>{t("delete_account.deleted.body")}</p>
      </section>

      <section className="mb-10">
        <h2>{t("delete_account.retained.title")}</h2>
        <p>{t("delete_account.retained.body")}</p>
      </section>

      <section className="mb-10">
        <h2>{t("delete_account.timeline.title")}</h2>
        <p>{t("delete_account.timeline.body")}</p>
      </section>

      <div className="not-prose mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={SIGN_IN_HREF}
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
        >
          {t("delete_account.cta.signin")}
        </Link>
        <a
          href={MAIL_HREF}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {t("delete_account.cta.email")}
        </a>
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        {t("delete_account.privacy_lead")}{" "}
        <Link href={PRIVACY_PATH} className="text-emerald-400 underline">
          {t("legal.privacy_policy")}
        </Link>
        . {t("delete_account.url_hint", { path: DELETE_ACCOUNT_PATH })}
      </p>
    </article>
  );
}
