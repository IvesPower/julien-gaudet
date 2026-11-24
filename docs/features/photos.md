# Photos

Les photos de la page `/photo` vivent dans `public/photos/` (fichiers servis) et `content/photos.json` (une entrée par photo). Les données calculées sont tenues à jour par `pnpm photos:meta`, les textes sont écrits à la main. Ajouter une photo ne touche pas au code.

## Le chemin d'une photo

1. **Original** : un JPEG dans un dossier hors du dépôt (par exemple `~/Desktop/photos`). Les originaux ne sont jamais modifiés ni renommés.
2. **Script** : `pnpm photos:meta <dossier>` produit le fichier servi dans `public/photos/<id>.jpg` et crée ou met à jour l'entrée dans `content/photos.json`.
3. **Textes** : à la main, dans `content/photos.json` (voir plus bas).
4. **Schéma** : [`lib/schemas.ts`](../../lib/schemas.ts) (`photoSchema`, `photosSchema`) décrit une entrée. Le type `Photo` en est dérivé.
5. **Chargeur** : `getPhotos(locale)` dans [`lib/content.ts`](../../lib/content.ts) valide le JSON, vérifie que `file` vaut `<id>.jpg` et que le fichier existe dans `public/photos/`, puis résout les textes dans la langue de la page.
6. **Page statique** : `app/[locale]/photo/page.tsx` affiche chaque photo avec [`components/photo-figure.tsx`](../../components/photo-figure.tsx) (`next/image`, largeur et hauteur réelles, jamais de recadrage, ancre `#<id>`). Le lien Instagram n'apparaît que si `instagram` est renseigné dans `content/profile.json` (URL facultative).

## Le script `pnpm photos:meta <dossier>`

`<dossier>` est le dossier des originaux (`~` est accepté). Seuls les `.jpg` et `.jpeg` sont traités, les autres fichiers sont signalés et ignorés.

Pour chaque original :

- **Nouvelle photo** : l'`id` est dérivé du nom du fichier (minuscules, sans accents, tirets) et l'entrée est ajoutée à la fin du tableau, avec `alt` vide.
- **Photo connue** (même `source`) : le fichier servi n'est régénéré que si l'original a changé (empreinte SHA-256) ou si le fichier servi manque.

### Fichier servi

JPEG, bord long de 2 560 px au plus (jamais d'agrandissement), qualité 90 (mozjpeg), sRGB, orientation EXIF appliquée, **sans aucune métadonnée** (ni EXIF, ni GPS, ni XMP, ni IPTC). Le GPS des originaux n'est jamais lu par le script et n'est jamais écrit dans `photos.json`.

### Ce que le script écrit

Champs calculés, remplacés à chaque passage : `file` (`<id>.jpg`, voir « Renommer un `id` »), `source`, `sourceHash`, `width`, `height`, `blurDataURL` (placeholder flou de 16 px en WebP), `takenAt` (`YYYY-MM-DD`) et `exif` (`camera`, `lens`, `focalLength`, `aperture`, `exposureTime`, `iso`). Si l'original n'a plus de date ou de données de prise de vue, le champ disparaît.

### Ce que le script ne touche jamais

`alt`, `caption`, `place`, `credit`, un `id` déjà écrit, l'ordre du tableau (l'ordre du fichier est l'ordre d'affichage), les originaux et les fichiers de `public/photos/` qu'il ne connaît pas (il ne supprime rien).

### Le rapport

Le script affiche une ligne par catégorie non vide, ou `Everything is up to date.` :

- `Added`, `Updated` (fichier servi régénéré), `Renamed` ;
- `Original missing` : une entrée dont l'original n'est plus dans le dossier (elle est conservée telle quelle) ;
- `Ignored files` : fichiers non JPEG du dossier ;
- `Unknown cameras` : boîtier absent de la table de noms, affiché tel que l'EXIF le donne ;
- `Served files matching no entry` : fichiers orphelins de `public/photos/`, jamais supprimés ;
- `Missing alt text (fill in photos.json)` : entrées dont `alt.fr` ou `alt.en` est vide.

## Écrire les textes

Dans `content/photos.json`, à la main :

- `alt` : `{ "fr": "…", "en": "…" }`, **obligatoire** dans les deux langues. Le script laisse `""`, le build refuse.
- `caption`, `place` : textes localisés facultatifs, comme dans [`content.md`](content.md) (`{ "fr", "en" }`, repli sur le français avec `lang="fr"` si `en` manque).
- `credit` : nom du photographe, facultatif (utile pour une photo prise par quelqu'un d'autre).

## Renommer un `id`

Changer l'`id` à la main dans `content/photos.json`, puis relancer `pnpm photos:meta <dossier>`. Le script renomme le fichier servi en `<nouvel id>.jpg`, met `file` à jour et l'indique dans `Renamed`. Il refuse si un autre fichier ou une autre entrée porte déjà ce nom. Si un renommage échoue en cours de route, relancer suffit : le script reprend un fichier déjà renommé.

Le nouvel `id` change l'ancre `#<id>` et l'URL de l'image : les anciens liens vers `/photo#<ancien-id>` ne pointent plus nulle part.

## Retirer une photo

Supprimer à la main son entrée dans `content/photos.json` **et** son fichier dans `public/photos/`. Le script ne supprime jamais rien : s'il reste un fichier sans entrée, il le signale dans `Served files matching no entry`. Si l'original est encore dans le dossier source, le script recréera l'entrée au prochain passage : le retirer du dossier aussi.

## Ce qui fait échouer le build

`getPhotos` lève une `ContentError` qui nomme le fichier et le champ :

- `alt.fr` ou `alt.en` vide ou absent ;
- un champ inconnu, une date qui n'est pas `YYYY-MM-DD`, un `id` qui n'est pas en kebab-case ;
- deux entrées avec le même `id` ou la même `source` ;
- un `file` différent de `<id>.jpg` (message : lancer `pnpm photos:meta`) ;
- un fichier absent de `public/photos/` (`missing file public/photos/<fichier>`) ;
- `instagram` qui n'est pas une URL.

Le script lui-même échoue, sans rien écrire, si deux photos obtiendraient le même `id`.

## Poids du dépôt

`public/photos/` pèse environ 80 Mo pour 90 photos (JPEG qualité 90 mozjpeg, 2 560 px). Les originaux restent hors du dépôt. Si la galerie grossit beaucoup, les fichiers pourront migrer vers un stockage objet (Cloudflare R2) sans changer le code d'affichage.

## Réglages `next/image` et quota Vercel

Dans [`next.config.ts`](../../next.config.ts) : `qualities: [90]` (aucune autre qualité n'est acceptée, d'où `quality={90}` sur chaque image), formats `image/avif` puis `image/webp`, `deviceSizes: [640, 1080, 1600, 2048, 2560]`. Les `sizes` de `PhotoFigure` plafonnent l'image à 1 200 px de large d'affichage à partir de 1 280 px d'écran.

Quota : le plan Hobby inclut 5 000 transformations d'images par mois. Chaque combinaison photo × largeur × format compte une fois. Au pire, 90 photos × 5 largeurs × 2 formats font 900 transformations, et en pratique beaucoup moins, car chaque écran n'en demande qu'une partie.

### Cache et remplacement d'une photo

Ce que disent les documentations :

- Next.js : l'expiration d'une image optimisée est le maximum entre `minimumCacheTTL` et le `Cache-Control` de l'image source. Il n'y a pas d'invalidation intégrée, sauf en changeant le `src`.
- Vercel : le cache est indexé par l'image source, et s'invalide par image source avec `vercel cache invalidate --srcimg /photos/<fichier>` ([doc](https://vercel.com/docs/caching/cdn-cache/debug-cache-issues), [CLI](https://vercel.com/docs/cli/cache)).
- Les images optimisées survivent-elles aux déploiements ? **Non confirmé** : la documentation ne le dit pas explicitement.

Règle pratique : quand le contenu d'une photo change sous le même `id`, soit changer son `id` (nouveau `src`, donc nouvelle entrée de cache), soit invalider cette image source avec la commande ci-dessus.
