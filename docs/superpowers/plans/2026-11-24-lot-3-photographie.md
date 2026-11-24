# Lot 3 — Photographie : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** publier les 90 photos de `~/Desktop/photos` sur `/fr/photo` et `/en/photo`, en 2 560 px sans recadrage, via un script `pnpm photos:meta <dossier>` qui tient `content/photos.json` à jour sans écraser les textes écrits à la main, sans design.

**Architecture :** la logique du pipeline vit dans `lib/photos/` (fonctions pures + traitement `sharp` / `exifr`), testée par Vitest ; `scripts/photos-meta.mts` n'est qu'une coquille CLI. Le schéma `Photo` est dans `lib/schemas.ts`, le chargeur `getPhotos(locale)` dans `lib/content.ts`. La page reste un Server Component statique qui rend des `<figure>` avec `next/image`.

**Tech stack :** existante (Next.js 16.4.6, next-intl 4.15, Zod 4.6.7, Vitest 5, playwright-bdd 9) + `sharp` 0.35.5 et `exifr` 7.1.3 en `devDependencies` (versions npm vérifiées le 24 novembre 2026 ; `exifr` n'a pas bougé depuis 2022, c'est la dernière). `sharp` est déjà présent via Next et listé `sharp: false` dans `allowBuilds` de `pnpm-workspace.yaml` : ses binaires viennent des paquets `@img/*`, sans script d'installation. Vérifier qu'un `import sharp` fonctionne après `pnpm add -D`, sinon passer `sharp: true`.

**Spec :** [docs/superpowers/specs/2026-11-24-lot-3-photographie-design.md](../specs/2026-11-24-lot-3-photographie-design.md). Brief local, non versionné : `julien-gaudet - Document de conception.md`.

## Global Constraints

- TypeScript strict, aucun `any`. Code, commentaires, noms de tests, scénarios Gherkin, sorties du script et messages d'erreur en anglais ; textes du site en FR et EN, dans `content/` ou `messages/*.json`, jamais en dur.
- Aucun style : pas de CSS, de tokens, de `className`. Aucun Client Component.
- Fichiers servis : bord long **2 560 px** au plus (jamais d'agrandissement), JPEG qualité 90, sRGB, orientation EXIF appliquée, **aucune métadonnée** (EXIF, GPS, XMP, IPTC).
- `content/photos.json` ne contient **jamais** de coordonnées GPS. Le GPS des originaux ne sert qu'au jet des lieux (Task 5), lu en local, jamais écrit ni envoyé à un service externe (pas de géocodage en ligne).
- Aucune photo n'est recadrée : pas de `fill`, pas d'`object-fit: cover` ; `width` et `height` réels sur chaque `next/image`.
- Le script ne modifie jamais `alt`, `caption`, `place`, `credit`, ni un `id` déjà écrit, ni l'ordre du tableau.
- Les originaux de `~/Desktop/photos` ne sont ni renommés ni modifiés.
- Les modules de `lib/photos/` sont importés par un script Node (`node scripts/photos-meta.mts`) : imports relatifs avec extension `.ts`, pas d'alias `@/` (même règle que `scripts/check-static.mts`).
- Toutes les pages sous `app/[locale]/` restent prérendues : `pnpm build && pnpm check:static` passe.
- Commits Conventional Commits `type(portée): English / français`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branche `feat/photography` (déjà créée, la spec y est commitée).
- Avant chaque commit : `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`.

## Review Focus

- **Photo prise à la verticale** : un original dont l'EXIF `Orientation` vaut 6 ou 8 doit sortir debout, avec `width < height` dans le JSON. Testé en Task 3.
- **Relancer le script** : un second lancement sans changement ne modifie aucun fichier (ni JPEG, ni JSON) — `git status` reste propre. Testé en Task 4.
- **Renommer un `id` à la main** : au lancement suivant, `public/photos/<ancien>.jpg` devient `<nouveau>.jpg` sans être recalculé, et aucun fichier orphelin ne reste. Testé en Task 4.
- **Fichier servi supprimé ou absent** : le build échoue en nommant l'`id` si `public/photos/<id>.jpg` manque. Testé en Task 6.
- **Original sans EXIF** (export retouché, capture drone) : l'entrée se crée sans `exif` ni `takenAt`, et la page n'affiche pas de ligne de prise de vue vide. Testé en Tasks 2 et 6.

---

### Task 1: Schéma Zod `Photo` et Instagram facultatif

**Files:**

- Modify: `lib/schemas.ts`
- Test: `lib/schemas.test.ts`

**Interfaces:**

- Produces (exportés de `lib/schemas.ts`) :
  - `photoIdSchema` : chaîne `^[a-z0-9]+(-[a-z0-9]+)*$`.
  - `photoExifSchema` / `PhotoExif` : objet strict, tous facultatifs : `camera: string`, `lens: string`, `focalLength: number` (mm, > 0), `aperture: number` (> 0), `exposureTime: number` (secondes, > 0), `iso: int` (> 0).
  - `photoSchema` / `Photo` : objet strict `{ id; file: string /^[a-z0-9]+(-[a-z0-9]+)*\.jpg$/ (nom du fichier servi, tenu par le script); source: string non vide; sourceHash: string /^[0-9a-f]{64}$/; width: int > 0; height: int > 0; blurDataURL: string commençant par "data:image/"; takenAt?: "YYYY-MM-DD"; exif?: PhotoExif; alt: { fr: non vide; en: non vide } (strict, les deux obligatoires); caption?: LocalizedText; place?: LocalizedText; credit?: string non vide }`.
  - `photosSchema` : `z.array(photoSchema)` avec deux `superRefine` : `id` unique et `source` unique (message `duplicate id "<id>"` / `duplicate source "<source>"`).
  - `profileSchema` gagne `instagram: z.url().optional()`.

- [ ] **Step 1: Écrire les tests qui échouent** dans `lib/schemas.test.ts`, bloc `describe("photosSchema")` :
  - une photo valide complète passe, une photo minimale (sans `exif`, `takenAt`, `caption`, `place`, `credit`) passe ;
  - `alt` sans `en`, ou `alt.fr: ""`, ou `alt.fr: "  "` échoue ;
  - `id: "Black and White"` et `id: "-a"` échouent ;
  - un champ inconnu (`gps: {…}`) échoue (objet strict) ;
  - `file: "Lake.JPG"` échoue ;
  - deux entrées au même `id` échouent avec un message contenant `duplicate id`.
  - `profileSchema` accepte un profil sans `instagram` et refuse `instagram: "julien"` (pas une URL).
- [ ] **Step 2: Lancer** `pnpm vitest run lib/schemas.test.ts` → FAIL (`photosSchema` n'existe pas).
- [ ] **Step 3: Implémenter** les schémas ci-dessus dans `lib/schemas.ts`, en réutilisant `nonEmpty` et `localizedTextSchema`.
- [ ] **Step 4: Lancer** `pnpm vitest run lib/schemas.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(photos): add the photo schema / ajouter le schéma des photos`.

### Task 2: Fonctions pures du pipeline

**Files:**

- Create: `lib/photos/entries.ts`, `lib/photos/exif.ts`
- Test: `lib/photos/entries.test.ts`, `lib/photos/exif.test.ts`

**Interfaces:**

- Consumes : `Photo`, `PhotoExif` (Task 1) — import `type` depuis `../schemas.ts`.
- Produces :
  - `photoIdFromFileName(fileName: string): string` (`entries.ts`) : retire l'extension, minuscules, NFD + suppression des diacritiques, tout hors `[a-z0-9]` → `-`, tirets fusionnés et retirés en bordure. Lève une `Error` si le résultat est vide.
  - `type ScannedPhoto = { source: string; sourceHash: string; width: number; height: number; blurDataURL: string; takenAt?: string; exif?: PhotoExif }` (`entries.ts`).
  - `type MergeResult = { photos: Photo[]; added: string[]; missing: string[] }` — `added` et `missing` listent des `source`.
  - `mergePhotos(existing: Photo[], scanned: ScannedPhoto[]): MergeResult` (`entries.ts`) : rapproche par `source` ; pour une entrée existante, remplace `sourceHash`, `width`, `height`, `blurDataURL`, `takenAt`, `exif` (un champ calculé devenu absent est retiré) et garde tout le reste ; une nouvelle `source` arrive en fin de tableau, dans l'ordre alphabétique des `source`, avec `id = photoIdFromFileName(source)` et `alt: { fr: "", en: "" }` ; une entrée sans `source` scannée reste à sa place et va dans `missing`. Lève une `Error` qui nomme les deux `source` si deux entrées finissent avec le même `id`. `mergePhotos` ne touche jamais `file` : une nouvelle entrée reçoit `file = `${id}.jpg``, et seul `syncPhotos` (Task 4) le change, en renommant le fichier servi.
  - `type RawExif = { Make?: string; Model?: string; LensModel?: string; FocalLength?: number; FNumber?: number; ExposureTime?: number; ISO?: number; DateTimeOriginal?: Date }` (`exif.ts`) : la forme renvoyée par `exifr.parse(…, { pick: [...] })`.
  - `cameraName(make: string | undefined, model: string | undefined): { name?: string; known: boolean }` (`exif.ts`) : table `{ "ILCE-7M4": "Sony A7 IV", "DC-GX9": "Panasonic Lumix GX9", "FC7203": "DJI Mini 2" }` (clé = `Model` sans espaces de bord) ; un modèle inconnu donne `` `${Make} ${Model}` `` nettoyé et `known: false` ; rien → `{ known: true }` sans `name`.
  - `toPhotoExif(raw: RawExif | undefined): { exif?: PhotoExif; takenAt?: string; unknownCamera?: string }` (`exif.ts`) : ne garde que les champs présents et positifs ; `lens` = `LensModel` tel quel ; `takenAt` = date locale de `DateTimeOriginal` au format `YYYY-MM-DD` (lire `getFullYear/getMonth/getDate` : exifr renvoie l'heure de prise de vue sans fuseau) ; `exif` absent si aucun champ ; `unknownCamera` rempli quand `known` est faux.
- [ ] **Step 1: Écrire les tests qui échouent** :
  - `photoIdFromFileName` : `"Black and white manhattan.jpg"` → `"black-and-white-manhattan"` ; `"P1051586-Enhanced-NR-2.jpg"` → `"p1051586-enhanced-nr-2"` ; `"Québec  lights!.JPG"` → `"quebec-lights"` ; `"___.jpg"` lève.
  - `mergePhotos` :
    - « keeps hand-written fields » : une entrée avec `id: "calgary-library"`, `alt`, `caption`, `place`, `credit` remplis et `width: 100` ; scannée avec `width: 200` → `width: 200`, tous les champs manuels et l'`id` identiques ;
    - « appends new photos at the end, sorted by source » : existant `[b.jpg]`, scanné `[d.jpg, b.jpg, c.jpg]` → ordre `b, c, d`, `added: ["c.jpg", "d.jpg"]`, `alt: { fr: "", en: "" }` sur les nouvelles ;
    - « keeps the existing order » : existant `[z.jpg, a.jpg]` → reste `z, a` ;
    - « keeps and reports photos missing from the folder » : existant `[a.jpg, gone.jpg]`, scanné `[a.jpg]` → deux entrées, `missing: ["gone.jpg"]` ;
    - « drops a computed field that disappeared » : `exif` présent avant, absent du scan → absent après ;
    - « rejects an id collision » : existant `id: "quebec"` pour `quebec-1.jpg`, nouveau `Quebec.jpg` → lève avec les deux noms.
  - `cameraName` : `ILCE-7M4` → `Sony A7 IV` ; `("Canon", "EOS R5")` → `{ name: "Canon EOS R5", known: false }`.
  - `toPhotoExif` :
    - `{ Make: "SONY", Model: "ILCE-7M4", LensModel: "24-70mm F2.8 DG DN II | Art 024", FocalLength: 24, FNumber: 8, ExposureTime: 0.0025, ISO: 100, DateTimeOriginal: new Date(2026, 6, 19, 12, 4) }` → `exif: { camera: "Sony A7 IV", lens: "24-70mm F2.8 DG DN II | Art 024", focalLength: 24, aperture: 8, exposureTime: 0.0025, iso: 100 }`, `takenAt: "2026-07-19"` ;
    - `undefined` → `{}` ; `{ ISO: 0 }` → `{}`.
- [ ] **Step 2: Lancer** `pnpm vitest run lib/photos` → FAIL.
- [ ] **Step 3: Implémenter** les fonctions ci-dessus.
- [ ] **Step 4: Lancer** `pnpm vitest run lib/photos` → PASS.
- [ ] **Step 5: Commit** `feat(photos): merge scanned photos without touching hand-written fields / fusionner les photos sans toucher aux champs écrits à la main`.

### Task 3: Traitement d'une image (sharp + exifr)

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add -D sharp@0.35.5 exifr@7.1.3`)
- Create: `lib/photos/image.ts`
- Test: `lib/photos/image.test.ts`

**Interfaces:**

- Consumes : `ScannedPhoto` (Task 2), `toPhotoExif`, `RawExif` (Task 2).
- Produces (`lib/photos/image.ts`) :
  - `MAX_EDGE = 2560`, `JPEG_QUALITY = 90`.
  - `hashFile(file: string): Promise<string>` : SHA-256 hexadécimal du fichier (`node:crypto`).
  - `readPhotoExif(file: string): Promise<RawExif | undefined>` : `exifr.parse(file, { pick: ["Make", "Model", "LensModel", "FocalLength", "FNumber", "ExposureTime", "ISO", "DateTimeOriginal"] })`. Jamais `gps: true`.
  - `renderPhoto(source: string, target: string): Promise<{ width: number; height: number }>` : `sharp(source).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).toColorspace("srgb").jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(target)` — `sharp` retire les métadonnées par défaut : ne pas appeler `withMetadata` / `keepExif`. Garder le profil sRGB ICC est autorisé (`keepIccProfile()` si la doc sharp 0.35 l'exige pour un rendu fidèle ; à vérifier via Context7).
  - `blurPlaceholder(file: string): Promise<string>` : image de 16 px de bord long au même ratio, WebP, `data:image/webp;base64,…`.
  - `scanPhoto(source: string, target: string, renderNeeded: boolean): Promise<{ scanned: ScannedPhoto; unknownCamera?: string }>` : hash, EXIF, rendu (si `renderNeeded`) puis dimensions et placeholder lus **sur le fichier servi** (`target`).
- [ ] **Step 1: Installer** `pnpm add -D sharp@0.35.5 exifr@7.1.3`, puis vérifier `node -e "import('sharp').then(m => console.log(m.default.versions.vips))"` → affiche une version de libvips.
- [ ] **Step 2: Écrire les tests qui échouent** (`lib/photos/image.test.ts`). Les images de test sont **générées dans le test** avec `sharp` dans un dossier `mkdtemp` (aucun binaire de test commité) :
  - « shrinks the long edge to 2560 and keeps the ratio » : source 4000 × 3000 → `{ width: 2560, height: 1920 }`.
  - « never enlarges a small photo » : 1200 × 1800 → 1200 × 1800.
  - « applies the EXIF orientation » : source 3000 × 2000 écrite avec `.withExif({ IFD0: { Orientation: "6" } })` → sortie `width < height` (1707 × 2560 à ±1 px).
  - « strips every metadata, GPS included » : source écrite avec `withExif({ IFD0: { Make: "SONY", Model: "ILCE-7M4" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 30/1 0/1" } })` → `(await sharp(target).metadata()).exif` est `undefined` et `await exifr.gps(target)` est `undefined` ; `readPhotoExif(source)` donne `Model: "ILCE-7M4"` et aucune clé `latitude`/`GPSLatitude`.
  - « builds a tiny blur placeholder » : commence par `data:image/webp;base64,` et fait moins de 1 000 caractères.
  - « hashes the original » : deux appels donnent la même empreinte de 64 caractères hexadécimaux.
- [ ] **Step 3: Lancer** `pnpm vitest run lib/photos/image.test.ts` → FAIL.
- [ ] **Step 4: Implémenter** `lib/photos/image.ts`.
- [ ] **Step 5: Lancer** `pnpm vitest run lib/photos/image.test.ts` → PASS.
- [ ] **Step 6: Commit** `feat(photos): resize photos and strip their metadata / redimensionner les photos et retirer leurs métadonnées`.

### Task 4: Synchronisation et commande `pnpm photos:meta`

**Files:**

- Create: `lib/photos/sync.ts`, `scripts/photos-meta.mts`
- Modify: `package.json` (script `"photos:meta": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/photos-meta.mts"`)
- Test: `lib/photos/sync.test.ts`

**Interfaces:**

- Consumes : `mergePhotos`, `ScannedPhoto` (Task 2), `scanPhoto`, `hashFile` (Task 3), `photosSchema` (Task 1, validation **partielle** : un `alt` vide est normal juste après l'ajout, donc valider avec `photoSchema.omit({ alt: true }).extend({ alt: z.strictObject({ fr: z.string(), en: z.string() }) })`).
- Produces (`lib/photos/sync.ts`) :
  - `type SyncReport = { added: string[]; updated: string[]; renamed: Array<{ from: string; to: string }>; missing: string[]; ignored: string[]; unknownCameras: string[]; missingAlt: string[] }` — `missingAlt` liste des `id`.
  - `syncPhotos(options: { sourceDir: string; contentDir: string; publicDir: string }): Promise<SyncReport>` :
    1. lit `<contentDir>/photos.json` (absent = `[]`) ;
    2. liste `sourceDir` à plat ; garde `*.jpg` / `*.jpeg` (casse ignorée), met les autres fichiers (hors fichiers cachés) dans `ignored` ;
    3. renommages : pour chaque entrée dont `file !== `${id}.jpg`` (Julien a changé l'`id`), renomme `public/photos/<file>` en `<id>.jpg` s'il existe et met `file` à jour ; échoue si `<id>.jpg` existe déjà pour une autre entrée ;
    4. pour chaque original : `hashFile` ; rendu nécessaire si l'entrée n'existe pas, si `sourceHash` diffère, ou si `public/photos/<file>` manque ;
    5. `mergePhotos`, écrit `photos.json` formaté par Prettier (`format(JSON.stringify(photos), { parser: "json", ...(await resolveConfig(file)) })`) avec un saut de ligne final ; n'écrit **rien** si le contenu est identique ;
    6. renvoie le rapport.
  - Un JPEG de `public/photos/` qui ne correspond au `file` d'aucune entrée est signalé dans le rapport (`orphans: string[]`, à ajouter à `SyncReport`), jamais supprimé.
  - `scripts/photos-meta.mts` : lit `process.argv[2]` (absent → message d'usage `Usage: pnpm photos:meta <folder>` et code 1), développe `~`, appelle `syncPhotos` avec `content/` et `public/photos/` du dépôt, affiche le rapport (une ligne par catégorie non vide) ; code 0 même si `missingAlt` n'est pas vide (le build se charge d'échouer).
- [ ] **Step 1: Écrire les tests qui échouent** (`lib/photos/sync.test.ts`, dossiers `mkdtemp`, images générées par `sharp` comme en Task 3) :
  - « creates entries and served files » : deux originaux `Lake Momo.jpg`, `quebec.jpg` → `photos.json` à 2 entrées (`lake-momo`, `quebec`), `public/photos/lake-momo.jpg` et `quebec.jpg` existent, `missingAlt: ["lake-momo", "quebec"]`.
  - « is a no-op the second time » : deuxième appel → `added`, `updated`, `renamed` vides ; `mtime` de `photos.json` et des JPEG inchangés.
  - « renames the served file after a hand-edited id » : changer `id` `lake-momo` → `lac-montmorency` dans le JSON, relancer → `renamed: [{ from: "lake-momo", to: "lac-montmorency" }]`, `lake-momo.jpg` n'existe plus, `lac-montmorency.jpg` existe, `alt` conservé.
  - « re-renders a changed original » : réécrire `quebec.jpg` avec d'autres dimensions → `updated: ["quebec.jpg"]`, `width` mis à jour.
  - « ignores other files » : `notes.txt` et `.DS_Store` → `ignored: ["notes.txt"]`.
  - « keeps an entry whose original is gone » : supprimer `quebec.jpg` de la source → l'entrée reste, `missing: ["quebec.jpg"]`, le fichier servi reste.
  - « writes Prettier-formatted JSON » : `await check(content, { parser: "json" })` de `prettier` est vrai.
- [ ] **Step 2: Lancer** `pnpm vitest run lib/photos/sync.test.ts` → FAIL.
- [ ] **Step 3: Implémenter** `lib/photos/sync.ts` puis `scripts/photos-meta.mts`.
- [ ] **Step 4: Lancer** `pnpm vitest run lib/photos` → PASS ; `pnpm photos:meta` sans argument → usage et code 1.
- [ ] **Step 5: Commit** `feat(photos): add the photos:meta command / ajouter la commande photos:meta`.

### Task 5: Les 90 photos et leur premier jet de textes

Tâche de contenu, sans nouveau code produit. Elle tourne sur la machine de Julien (les originaux sont dans `~/Desktop/photos`).

**Files:**

- Create: `content/photos.json`, `public/photos/*.jpg` (90 fichiers, environ 170 Mo)
- Scratch (jamais commité) : un dossier du scratchpad pour les aperçus et l'extraction GPS.

**Interfaces:**

- Consumes : `pnpm photos:meta` (Task 4), `photosSchema` (Task 1).
- Produces : un `content/photos.json` qui passe `photosSchema` (tous les `alt` FR et EN remplis).

- [ ] **Step 1: Premier lancement** `pnpm photos:meta ~/Desktop/photos` → `added` 90, `ignored` vide, `unknownCameras` vide (sinon compléter la table de `cameraName` et refaire Task 2 Step 4). `du -sh public/photos` → environ 170 Mo.
- [ ] **Step 2: Aperçus et GPS en local** : générer dans le scratchpad des aperçus 800 px de chaque fichier servi pour les regarder ; lire le GPS des **originaux** avec `exifr.gps` dans un script du scratchpad (3 photos sur 90 en ont, d'après Spotlight). Les coordonnées restent dans le scratchpad, ne sont envoyées à aucun service, et sont interprétées sans géocodeur en ligne.
- [ ] **Step 3: Rédiger chaque entrée** dans `content/photos.json`, en regardant la photo :
  - `id` : nom court et descriptif en kebab-case, sans faute (`calgary-library`, `kirkjufell-midnight`…) ; `avatar-5.jpg` est un canyon en Islande ;
  - `alt` FR et EN : ce que voit quelqu'un qui ne voit pas l'image, une phrase, sans « photo de » ;
  - `caption` FR et EN : courte, le ton des maquettes (« Silhouette et lanternes », « Briques au couchant ») ;
  - `place` FR et EN : quand on peut le déduire avec une confiance raisonnable (sujet reconnaissable, nom du fichier, GPS) ; sinon laisser vide plutôt que deviner ;
  - pas de `credit` (photos de Julien).
- [ ] **Step 4: Ordre mélangé** : réordonner le tableau pour alterner lieux et genres (architecture, paysage, street, nuit, noir et blanc, drone) : jamais deux photos du même lieu ou du même genre à la suite quand c'est possible ; ouvrir sur une photo forte et en paysage.
- [ ] **Step 5: Deuxième lancement** `pnpm photos:meta ~/Desktop/photos` → `renamed` liste les `id` changés, `missingAlt` vide, `public/photos/` contient exactement 90 JPEG nommés d'après les nouveaux `id`.
- [ ] **Step 6: Vérifier** : `node -e` qui valide `content/photos.json` avec `photosSchema` → OK ; `exiftool` ou `exifr.gps` sur 5 fichiers servis pris au hasard → aucune donnée GPS ; `grep -ci "gps\|latitude" content/photos.json` → 0.
- [ ] **Step 7: Commit** `feat(photos): add the 90 photos with a first draft of their texts / ajouter les 90 photos et un premier jet de leurs textes`. Noter dans le corps que les textes sont un premier jet de Claude, à relire par Julien.

### Task 6: Chargeur `getPhotos` et ligne de prise de vue

**Files:**

- Modify: `lib/content.ts`
- Create: `lib/format-exif.ts`
- Test: `lib/content.test.ts`, `lib/format-exif.test.ts`

**Interfaces:**

- Consumes : `photosSchema`, `Photo`, `PhotoExif` (Task 1), `resolveText`, `validate`, `ContentError`, `ResolvedText` (`lib/content.ts`).
- Produces :
  - `type ResolvedPhoto = { id: string; src: string /* "/photos/<id>.jpg" */; width: number; height: number; blurDataURL: string; takenAt?: string; exif?: PhotoExif; alt: string; caption?: ResolvedText; place?: ResolvedText; credit?: string }` (`lib/content.ts`). `alt` est une chaîne simple : les deux langues sont obligatoires.
  - `getPhotos(locale: AppLocale, contentDir = defaultContentDir, publicDir = path.join(process.cwd(), "public")): Promise<ResolvedPhoto[]>` : valide `photos.json`, garde l'ordre du fichier, lève `ContentError("photos.json", "<index>.file", "expected <id>.jpg: run pnpm photos:meta")` si `file !== `${id}.jpg``, et `ContentError("photos.json", "<index>.file", "missing file public/photos/<file>")` si le fichier servi manque.
  - `formatExif(exif: PhotoExif | undefined, locale: AppLocale): string | undefined` (`lib/format-exif.ts`) : éléments présents joints par `" · "`, dans l'ordre caméra, focale (`"24 mm"`), ouverture (`"f/8"`, `"f/2,8"` en FR / `"f/2.8"` en EN via `Intl.NumberFormat(locale, { maximumFractionDigits: 1 })`), vitesse (`"1/400 s"` pour < 1 s en arrondissant `1 / exposureTime` à l'entier, sinon `"2 s"` / `"1,5 s"`), `"ISO 100"`. L'objectif n'apparaît pas (la maquette ne le montre pas). `undefined` si aucun élément.
- [ ] **Step 1: Écrire les tests qui échouent** :
  - `formatExif({ camera: "Sony A7 IV", focalLength: 24, aperture: 8, exposureTime: 0.0025, iso: 100 }, "fr")` → `"Sony A7 IV · 24 mm · f/8 · 1/400 s · ISO 100"` ; `aperture: 2.8` → `"f/2,8"` en FR et `"f/2.8"` en EN ; `exposureTime: 1.5` → `"1,5 s"` en FR ; `{}` et `undefined` → `undefined`.
  - `getPhotos` (dossiers `mkdtemp` comme les tests existants) : ordre du fichier conservé ; `caption` sans `en` → `{ text, lang: "fr" }` sur `en` ; fichier servi absent → erreur qui contient `missing file public/photos/` ; `file` différent de `<id>.jpg` → erreur qui contient `run pnpm photos:meta` ; `alt.en` vide → `ContentError` qui nomme `photos.json` et `alt.en`.
  - « the real photos are valid » : `getPhotos("fr")` et `getPhotos("en")` sur le vrai `content/` résolvent 90 photos, chacune avec un `alt` non vide.
- [ ] **Step 2: Lancer** `pnpm vitest run lib/content.test.ts lib/format-exif.test.ts` → FAIL.
- [ ] **Step 3: Implémenter** `getPhotos` et `formatExif`.
- [ ] **Step 4: Lancer** `pnpm test` → PASS.
- [ ] **Step 5: Commit** `feat(photos): load the photos and format the shooting data / charger les photos et formater les données de prise de vue`.

### Task 7: Page Photo, réglages `next/image` et scénarios

**Files:**

- Modify: `next.config.ts`, `app/[locale]/photo/page.tsx`, `components/skeleton-page.tsx` (retirer `PhotoPage` de `SkeletonNamespace`), `messages/fr.json`, `messages/en.json`, `content/profile.json` (rien à ajouter tant que l'adresse Instagram manque), `features/pages.feature`, `features/steps/content.steps.ts`
- Create: `components/photo-figure.tsx`, `features/photo.feature`

**Interfaces:**

- Consumes : `getPhotos`, `ResolvedPhoto` (Task 6), `formatExif` (Task 6), `getProfile` (`instagram?`, Task 1), `langAttr` (`lib/lang-attr.ts`), `pageMetadata`.
- Produces : `PhotoFigure({ photo, locale, priority }: { photo: ResolvedPhoto; locale: AppLocale; priority: boolean })`, Server Component.

- [ ] **Step 1: Réglages** dans `next.config.ts` : `images: { formats: ["image/avif", "image/webp"], qualities: [90], deviceSizes: [640, 1080, 1600, 2048, 2560] }`. Garder `imageSizes` par défaut. Vérifier les noms des options et le comportement du cache Vercel d'un déploiement à l'autre via Context7 / Next.js DevTools ; noter la réponse pour la doc (Task 8).
- [ ] **Step 2: Messages** `PhotoPage` FR / EN :
  - `title` reste « Photographie » / « Photography » (onglet et navigation) ;
  - `heading` : « Derrière l’objectif. » / « Behind the lens. » (apostrophe typographique comme dans la maquette) ;
  - `description` et `intro` : une phrase chacune, rédigée par le builder et signalée dans la PR ;
  - `instagram` : « Instagram » ;
  - `copyright` : « © Julien Gaudet, tous droits réservés. » / « © Julien Gaudet, all rights reserved. » ;
  - `takenOn` : « Prise le {date} » / « Taken on {date} » (date formatée `Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" })`) ;
  - `credit` : « Photo : {name} » / « Photo: {name} ».
  - Supprimer `placeholder`.
- [ ] **Step 3: Écrire les scénarios qui échouent** :
  - `features/photo.feature` :
    - Scenario Outline sur `/fr/photo` et `/en/photo` : `the main heading is "<heading>"` ; `the page shows as many photos as the content file` ; `every photo has a non-empty alternative text` ; `the page contains "<copyright>"` ; `the page has no accessibility violations`.
    - Scenario « Photos are never cropped » : `When I open "/fr/photo"` → `the first portrait photo keeps its ratio` et `the first landscape photo keeps its ratio`.
    - Scenario « Share a direct link to a photo » : `When I open "/fr/photo#<id de la 2e photo de photos.json>"` → `the photo "<id>" is shown`.
  - Steps dans `features/steps/content.steps.ts` :
    - compter `main figure` et comparer à la longueur de `content/photos.json` lue avec `node:fs` ;
    - `alt` non vide sur chaque `main figure img` ;
    - ratio : pour la première entrée de `photos.json` avec `height > width` (puis `width > height`), `boundingBox()` de `figure#<id> img` → `|w/h − width/height| < 0,01` après `scrollIntoViewIfNeeded()` ;
    - `figure#<id>` visible.
  - `features/pages.feature` : retirer les lignes `/fr/photo` et `/en/photo` du tableau des squelettes.
- [ ] **Step 4: Lancer** `pnpm build && pnpm test:e2e features/photo.feature` → FAIL (la page est encore un squelette).
- [ ] **Step 5: Implémenter la page** : `<h1>{heading}</h1>`, `<p>{intro}</p>`, lien Instagram seulement si `profile.instagram`, puis `<ol>` de `<li><PhotoFigure /></li>` (la première avec `priority`), puis `<p>{copyright}</p>`. `PhotoFigure` : `<figure id={id}>` ; `next/image` avec `src`, `width`, `height`, `alt`, `quality={90}`, `placeholder="blur"`, `blurDataURL`, `sizes="(min-width: 1280px) 1200px, 100vw"` (ajuster si la mise en page brute suggère mieux), `priority` ; `<figcaption>` avec légende, lieu, `<time dateTime={takenAt}>`, ligne `formatExif`, crédit — chaque élément seulement s'il existe, `lang={langAttr(text, locale)}` sur les textes repliés.
- [ ] **Step 6: Lancer** `pnpm build && pnpm check:static && pnpm test:e2e` → PASS (tous les scénarios, pas seulement `photo.feature`).
- [ ] **Step 7: Vérifier à la main** `pnpm start`, ouvrir `/fr/photo` : les images arrivent en AVIF (`content-type` des requêtes `/_next/image`), la largeur demandée ne dépasse jamais 2 560, une photo en portrait n'est pas recadrée.
- [ ] **Step 8: Commit** `feat(photos): show the photos uncropped on the photo page / afficher les photos sans recadrage sur la page photo`.

### Task 8: Copyright et documentation

**Files:**

- Create: `public/photos/COPYRIGHT.txt`, `README.md`, `docs/features/photos.md`
- Modify: `docs/features/content.md`, `CLAUDE.md`, `julien-gaudet - Document de conception.md` (local, non versionné)

- [ ] **Step 1: `public/photos/COPYRIGHT.txt`** (anglais puis français) : les photos de ce dossier sont © Julien Gaudet, tous droits réservés ; aucune réutilisation sans accord ; la licence du code ne s'y applique pas.
- [ ] **Step 2: `README.md`** court, en anglais puis en français : ce qu'est le site, lien vers https://julien-gaudet.vercel.app, commandes principales renvoyant au `CLAUDE.md`, section « Photos » qui reprend la mention de copyright.
- [ ] **Step 3: `docs/features/photos.md`** (français, comme `content.md`) : le parcours d'une photo ; `pnpm photos:meta <dossier>` et son rapport ; ce que le script écrit (champs calculés dont `file`, fichiers servis) et ne touche jamais ; renommer un `id` ; retirer une photo (supprimer l'entrée et le fichier à la main) ; ce qui fait échouer le build ; poids du dépôt (environ 170 Mo pour 90 photos) ; réglages `next/image`, quota Vercel et comportement du cache noté en Task 7.
- [ ] **Step 4: `docs/features/content.md`** : une ligne et un lien vers `photos.md`. **`CLAUDE.md`** : `pnpm photos:meta <dossier>` à la place de « prévu au lot 3 » ; `content/photos.json` décrit comme « tenu à jour par `pnpm photos:meta`, textes écrits à la main » ; `instagram` facultatif dans `content/profile.json`.
- [ ] **Step 5: Document de conception local** : cocher « Export des photos et réglages next/image » et « Script photos-meta.ts » ; laisser « Affichage de la galerie » ouvert (intégration UI) ; remplacer l'estimation à 40 photos / 120 Mo par 90 photos / 170 Mo à 2 560 px ; ajouter l'idée du globe 3D.
- [ ] **Step 6: Lancer** `pnpm format:check` → PASS.
- [ ] **Step 7: Commit** `docs(photos): document the photo pipeline and the copyright / documenter le pipeline photo et le copyright`.
