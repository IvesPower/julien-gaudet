import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { StaticPathname } from "@/lib/alternates";

const items = [
  { href: "/", key: "home" },
  { href: "/parcours", key: "experience" },
  { href: "/projets", key: "projects" },
  { href: "/photo", key: "photo" },
  { href: "/conferences", key: "talks" },
  { href: "/podcast", key: "podcast" },
  { href: "/mentions-legales", key: "legal" },
] as const satisfies ReadonlyArray<{ href: StaticPathname; key: string }>;

export async function SiteNav() {
  const t = await getTranslations("Navigation");
  return (
    <nav aria-label={t("label")}>
      <ul>
        {items.map(({ href, key }) => (
          <li key={href}>
            <Link href={href}>{t(key)}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
