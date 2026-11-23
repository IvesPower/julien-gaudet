import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedExperience } from "@/lib/content";
import { formatPeriod } from "@/lib/format-period";
import { langAttr } from "@/lib/lang-attr";

/** One job or degree of the timeline. */
export async function ExperienceEntry({
  entry,
  locale,
}: {
  entry: ResolvedExperience;
  locale: AppLocale;
}) {
  const t = await getTranslations("ExperiencePage");
  const kind =
    entry.kind === "work" && entry.end === undefined
      ? t("kind.current")
      : t(`kind.${entry.kind}`);
  const label = entry.contract
    ? `${kind} · ${t(`contract.${entry.contract}`)}`
    : kind;
  return (
    <article>
      <p>
        {label} ·{" "}
        <time dateTime={entry.start}>
          {formatPeriod(entry.start, entry.end, locale, t("present"))}
        </time>
      </p>
      <h3 lang={langAttr(entry.role, locale)}>{entry.role.text}</h3>
      <p>
        <span lang={langAttr(entry.org, locale)}>{entry.org.text}</span>
        {entry.place && (
          <>
            {" · "}
            <span lang={langAttr(entry.place, locale)}>{entry.place.text}</span>
          </>
        )}
      </p>
      <ul>
        {entry.highlights.map((h) => (
          <li key={h.text} lang={langAttr(h, locale)}>
            {h.text}
          </li>
        ))}
      </ul>
      {entry.tags.length > 0 && (
        <ul aria-label={t("tags")}>
          {entry.tags.map((tag) => (
            <li key={tag.text} lang={langAttr(tag, locale)}>
              {tag.text}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
