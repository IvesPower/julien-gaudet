import { getTranslations } from "next-intl/server";
import { PhotoFigure } from "@/components/photo-figure";
import { getPhotos, getProfile } from "@/lib/content";
import { resolveLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/page-metadata";

export function generateMetadata({ params }: PageProps<"/[locale]/photo">) {
  return pageMetadata(params, "PhotoPage", "/photo");
}

export default async function Page({ params }: PageProps<"/[locale]/photo">) {
  const locale = await resolveLocale(params);
  const [t, photos, profile] = await Promise.all([
    getTranslations("PhotoPage"),
    getPhotos(locale),
    getProfile(),
  ]);

  return (
    <>
      <h1>{t("heading")}</h1>
      <p>{t("intro")}</p>
      {profile.instagram ? (
        <p>
          <a href={profile.instagram}>{t("instagram")}</a>
        </p>
      ) : null}
      <ol>
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <PhotoFigure photo={photo} locale={locale} priority={index === 0} />
          </li>
        ))}
      </ol>
      <p>{t("copyright")}</p>
    </>
  );
}
