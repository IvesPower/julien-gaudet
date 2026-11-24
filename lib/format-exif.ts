import type { AppLocale } from "@/i18n/routing";
import type { PhotoExif } from "@/lib/schemas";

/** "1/400 s" below one second, "2 s" or "1,5 s" from one second up. */
function formatExposure(seconds: number, locale: AppLocale): string {
  if (seconds < 1) return `1/${Math.round(1 / seconds)} s`;
  const value = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(seconds);
  return `${value} s`;
}

/**
 * The shooting data on one line: "Sony A7 IV · 24 mm · f/8 · 1/400 s · ISO 100".
 * The lens is left out. Returns undefined when no item is available.
 */
export function formatExif(
  exif: PhotoExif | undefined,
  locale: AppLocale,
): string | undefined {
  if (!exif) return undefined;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const items = [
    exif.camera,
    exif.focalLength !== undefined
      ? `${number.format(exif.focalLength)} mm`
      : undefined,
    exif.aperture !== undefined
      ? `f/${number.format(exif.aperture)}`
      : undefined,
    exif.exposureTime !== undefined
      ? formatExposure(exif.exposureTime, locale)
      : undefined,
    exif.iso !== undefined ? `ISO ${exif.iso}` : undefined,
  ].filter((item) => item !== undefined);
  return items.length > 0 ? items.join(" · ") : undefined;
}
