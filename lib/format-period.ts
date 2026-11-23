import type { AppLocale } from "@/i18n/routing";
import type { PeriodDate } from "@/lib/schemas";

function formatDate(date: PeriodDate, locale: AppLocale): string {
  if (date.length === 4) return date;
  // UTC on both sides, so the build machine's time zone cannot shift the month.
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}-01T00:00:00Z`));
}

/** "janv. 2024 – aujourd’hui", "Jun 2022 – Nov 2022", "2017 – 2019". */
export function formatPeriod(
  start: PeriodDate,
  end: PeriodDate | undefined,
  locale: AppLocale,
  presentLabel: string,
): string {
  const to = end === undefined ? presentLabel : formatDate(end, locale);
  return `${formatDate(start, locale)} – ${to}`;
}
