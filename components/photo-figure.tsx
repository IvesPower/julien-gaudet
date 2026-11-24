import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedPhoto } from "@/lib/content";
import { formatExif } from "@/lib/format-exif";
import { langAttr } from "@/lib/lang-attr";

/** One photo, uncropped, with its anchor (the photo id) and its caption. */
export async function PhotoFigure({
  photo,
  locale,
  priority,
}: {
  photo: ResolvedPhoto;
  locale: AppLocale;
  priority: boolean;
}) {
  const t = await getTranslations("PhotoPage");
  const exif = formatExif(photo.exif, locale);
  const date = photo.takenAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(photo.takenAt))
    : undefined;

  return (
    <figure id={photo.id}>
      <Image
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        quality={90}
        placeholder="blur"
        blurDataURL={photo.blurDataURL}
        sizes="(min-width: 1280px) 1200px, 100vw"
        preload={priority}
      />
      <figcaption>
        {photo.caption ? (
          <p lang={langAttr(photo.caption, locale)}>{photo.caption.text}</p>
        ) : null}
        {photo.place ? (
          <p lang={langAttr(photo.place, locale)}>{photo.place.text}</p>
        ) : null}
        {photo.takenAt && date ? (
          <p>
            <time dateTime={photo.takenAt}>{t("takenOn", { date })}</time>
          </p>
        ) : null}
        {exif ? <p>{exif}</p> : null}
        {photo.credit ? <p>{t("credit", { name: photo.credit })}</p> : null}
      </figcaption>
    </figure>
  );
}
