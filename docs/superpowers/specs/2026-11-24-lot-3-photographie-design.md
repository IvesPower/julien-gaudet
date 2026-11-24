# Lot 3 — Photographie : design

24 novembre 2026 · brief complet : document de conception local, non versionné (`julien-gaudet - Document de conception.md` à la racine, section « Photographie : pleine qualité, sans recadrage ») · lot précédent : [lot 2](2026-11-23-lot-2-parcours-projets-design.md)

## Intention

Montrer les photos préférées de Julien (architecture, paysage, street) **en pleine qualité, au ratio d'origine, sans recadrage**. Ce lot pose le pipeline complet, du dossier d'originaux sur le Mac jusqu'à la page statique `/fr/photo` et `/en/photo` : redimensionnement, métadonnées, validation, réglages `next/image`.

La règle du brief vaut ici aussi : **ajouter une photo = déposer un fichier, lancer un script, écrire son texte, commiter**, sans toucher au code.

## Objectifs

- Un script `pnpm photos:meta <dossier>` qui lit les originaux choisis par Julien, produit les fichiers servis dans `public/photos/` et tient à jour `content/photos.json`.
- Un schéma Zod `Photo` dans `lib/schemas.ts` et un chargeur `getPhotos(locale)` dans `lib/content.ts`. Le build échoue si une photo n'a pas de texte alternatif FR et EN, ou si un fichier manque.
- La page Photo affiche les 90 photos de la sélection actuelle (`~/Desktop/photos`, 51 portraits environ et le reste en paysage) avec `next/image`, sans recadrage, avec légende et informations de prise de vue.
- Les réglages `next/image` du brief dans `next.config.ts` : qualité 90, AVIF puis WebP, `sizes` justes.
- Statique, accessible, sans JavaScript client, couvert par des tests unitaires et des scénarios BDD.

## Non-objectifs

- **Aucun design**, comme au lot 2 : pas de tokens, de CSS Modules, de rail de vignettes, de visionneuse, de compteur ni de flèches. La galerie de la maquette viendra avec le lot d'intégration UI, sur toutes les pages d'un coup.
- Pas de téléchargement de l'original : la question reste ouverte dans le document de conception et sera tranchée plus tard.
- Pas de stockage objet (Cloudflare R2) ni de Git LFS.
- Pas de séries, d'albums ni de filtres.
- Rien sur les autres pages.

## Anti-objectifs

- Une photo recadrée, déformée ou recompressée en basse qualité.
- Une photo publiée avec ses coordonnées GPS ou d'autres métadonnées privées dans le fichier servi.
- Un texte écrit à la main (alt, légende) écrasé par le script.
- Une photo sans texte alternatif qui passe le build.
- Du texte de contenu en dur dans un composant ou une page.

## Contraintes

- Conventions du `CLAUDE.md` du projet et règles Git globales : TypeScript strict sans `any`, code en anglais, contenu FR et EN, branche `feat/…`, PR bilingue.
- Maquettes Claude Design : [canvas Site perso](https://claude.ai/artifact/R8bTr1kURQiuMejpL1wr5f), artboards `Photo` et `Photo.en`. Elles fixent le contenu affiché pour chaque photo : légende, ligne de prise de vue au format « Sony A7 IV · 24 mm · f/8 · 1/400 s · ISO 100 », lien Instagram. Le titre de page est « Derrière l'objectif. » / « Behind the lens. ».
- Versions des paquets vérifiées à la source (npm, GitHub, Context7), jamais de mémoire.
- Plan Vercel Hobby : 5 000 transformations d'images par mois.

## Décisions prises avec Julien

1. **Sélection resserrée** : Julien est passé de 111 à 90 photos, dans `~/Desktop/photos`. Les originaux restent hors du dépôt.
2. **Tout dans le dépôt** (option A ci-dessous) : les fichiers servis vivent dans `public/photos/`, commités.
3. **Sans design** pour ce lot (proposé par Claude, accepté sans objection).
4. **Bord long de 2 560 px**, pas 3 840 px : les fichiers servis sont publics (dépôt public, `public/` servi tel quel) et téléchargeables ; Julien n'imprimera pas ses photos, 2 560 px reste net à l'écran. Écart assumé au brief.
5. **Mention de copyright** sur les photos : « © Julien Gaudet, tous droits réservés », distincte de la licence du code.
6. **Noms et textes rédigés par Claude** : Claude propose les `id` propres, les `alt`, légendes et lieux ; Julien les corrige au fur et à mesure, après la fusion comme avant.
7. **GPS lu pour le premier jet des lieux**, en local, jamais stocké ni publié.
8. **Ordre mélangé** : les photos alternent les lieux et les styles (architecture, paysage, street, nuit…) plutôt que d'être groupées.
9. `avatar-5.jpg` est un canyon en Islande, mal nommé : il reste dans la galerie.

## Approches envisagées

| Approche                                        | Principe                                                                                                                                     | Pour                                                                                   | Contre                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Fichiers dans le dépôt** (retenue)         | Le script redimensionne les originaux à 2 560 px et les écrit dans `public/photos/` ; `next/image` sur Vercel produit les tailles et formats | Le plus simple ; suit le brief ; aucun service de plus ; ajouter une photo = un commit | Dépôt lourd : environ 1,9 Mo par photo à 2 560 px mesurés sur un échantillon, soit environ 170 Mo pour 90 photos ; l'historique ne maigrit plus |
| B. Sources sur Cloudflare R2                    | Mêmes fichiers, envoyés sur R2 ; `next/image` les lit via `remotePatterns`                                                                   | Dépôt léger, extensible sans limite                                                    | Compte Cloudflare, envoi à chaque ajout, secrets en CI ; le lot grossit. Prévu par le brief si la galerie grossit fortement                     |
| C. Julien réexporte depuis Lightroom à 2 560 px | Le script ne redimensionne pas, il lit seulement                                                                                             | Script plus court                                                                      | Une étape manuelle de plus à chaque ajout, et des réglages d'export à ne pas oublier. Écartée                                                   |

## Le lot, tel que décidé

Les marques _(choix du builder)_ signalent les décisions prises sans Julien : à relire.

### Le parcours d'une photo

1. Julien range ses originaux choisis dans un dossier (aujourd'hui `~/Desktop/photos`).
2. Il lance `pnpm photos:meta ~/Desktop/photos`.
3. Le script, pour chaque JPEG du dossier :
   - calcule l'`id` à partir du nom de fichier ;
   - écrit `public/photos/<id>.jpg` : bord long ramené à 2 560 px (sans agrandir une photo plus petite), qualité 90, profil sRGB, **toutes les métadonnées retirées** (EXIF, GPS, XMP) ;
   - lit l'EXIF de l'original et le placeholder flou ;
   - met à jour l'entrée de `content/photos.json`.
4. Julien remplit les textes vides (alt, légende…) dans `content/photos.json`. Tant qu'un texte alternatif manque, `pnpm build` échoue en nommant la photo.
5. Commit, PR, Vercel redéploie.

_(Choix du builder)_ Le script ne regarde qu'un dossier à plat, ignore les fichiers autres que JPEG et signale les fichiers ignorés. Une photo présente dans `photos.json` mais absente du dossier n'est **pas** supprimée : le script l'indique, et la suppression se fait à la main (fichier + entrée). Ainsi, lancer le script sur un dossier partiel ne vide pas la galerie.

_(Choix du builder)_ Le script ne réécrit `public/photos/<id>.jpg` que si l'original a changé (empreinte de l'original gardée dans l'entrée), pour ne pas créer de faux changements binaires dans Git à chaque lancement.

### Identifiant

_(Choix du builder)_ Le lien entre un original et son entrée est `source` (le nom du fichier original), pas `id`. L'`id` est **écrit une fois puis modifiable à la main** :

- À la création d'une entrée, le script calcule un `id` à partir du nom de fichier : minuscules, accents retirés, tout caractère hors `a-z0-9` remplacé par `-`, tirets en double et en bordure retirés (`Black and white manhattan.jpg` → `black-and-white-manhattan`).
- Pour ce lot, Claude remplace ensuite ces `id` par des noms propres et descriptifs (`calgary librayr` → `calgary-library`, `A7402250` → un nom tiré du sujet, `avatar-5` → un nom de canyon islandais). Les originaux du Mac ne sont **pas renommés**.
- Si Julien change un `id` plus tard, le prochain lancement du script renomme `public/photos/<ancien>.jpg` en `<nouveau>.jpg`. L'ancre de la page change avec lui.
- Le schéma impose le format (`^[a-z0-9]+(-[a-z0-9]+)*$`) et l'unicité ; un doublon fait échouer le script et le build.

L'`id` sert de nom au fichier servi et d'ancre dans la page (`/fr/photo#calgary-library`).

### `content/photos.json`

Un tableau ; **l'ordre du fichier est l'ordre d'affichage**. Les nouvelles photos sont ajoutées en fin de tableau ; Julien déplace les entrées pour réordonner. Le script garde l'ordre existant. Pour ce lot, Claude fixe l'ordre de départ en **alternant lieux et styles** (décision 8) : pas deux photos du même lieu ni du même genre à la suite quand c'est possible. _(Choix du builder)_ L'ordre est figé dans le fichier, pas tiré au hasard au build : un ordre aléatoire changerait à chaque déploiement et casserait le rendu statique stable.

Chaque entrée mélange deux sortes de champs. Le script réécrit les champs calculés et **ne touche jamais aux champs écrits à la main**.

| Champ         | Qui l'écrit         | Type                                    | Remarque                                                                                                                 |
| ------------- | ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`          | script, puis Julien | chaîne                                  | Voir plus haut ; modifiable                                                                                              |
| `source`      | script              | chaîne                                  | Nom du fichier original : clé de rapprochement entre l'original et l'entrée                                              |
| `sourceHash`  | script              | chaîne                                  | Empreinte de l'original                                                                                                  |
| `width`       | script              | entier                                  | Du fichier servi                                                                                                         |
| `height`      | script              | entier                                  | Du fichier servi                                                                                                         |
| `blurDataURL` | script              | chaîne `data:image/…;base64,…`          | Quelques centaines d'octets au plus                                                                                      |
| `takenAt`     | script              | `YYYY-MM-DD`, facultatif                | `DateTimeOriginal`                                                                                                       |
| `exif`        | script              | objet, facultatif                       | `camera`, `lens`, `focalLength` (mm), `aperture`, `exposureTime` (s), `iso` ; chaque champ facultatif. **Jamais de GPS** |
| `alt`         | Julien              | `{ fr, en }`, **les deux obligatoires** | Vide à la création ; le build échoue tant qu'il manque                                                                   |
| `caption`     | Julien              | texte localisé, facultatif              | Repli FR comme ailleurs                                                                                                  |
| `place`       | Julien              | texte localisé, facultatif              | « Reykjavik, Islande » / « Reykjavík, Iceland »                                                                          |
| `credit`      | Julien              | chaîne, facultatif                      | Absent = photo de Julien                                                                                                 |

_(Choix du builder)_ Un seul fichier, comme le prévoient le brief et le `CLAUDE.md`, plutôt qu'un fichier écrit à la main et un fichier généré. Le prix est un script qui fusionne au lieu d'écraser ; c'est testé.

_(Choix du builder)_ Le script écrit le JSON formaté comme Prettier le ferait, pour que `pnpm format:check` passe sans retouche.

### Ligne de prise de vue

La maquette affiche « Sony A7 IV · 24 mm · f/8 · 1/400 s · ISO 100 ». L'EXIF donne `ILCE-7M4` et `DC-GX9`. _(Choix du builder)_ Le script stocke le nom lisible (« Sony A7 IV », « Panasonic Lumix GX9 ») grâce à une petite table de correspondance dans le script ; un modèle inconnu garde `Make Model` brut et le script le signale. Le formatage de la ligne (unités, `1/400 s`, séparateur) se fait à l'affichage, dans la langue de la page (`f/2,8` en français, `f/2.8` en anglais).

### Placeholder

_(Choix du builder)_ Une version minuscule de la photo (bord long d'environ 16 px), au même ratio, encodée en base64 et passée à `next/image` en `placeholder="blur"`. Avec 90 photos, `photos.json` reste sous les 100 Ko.

### Réglages `next/image`

Dans `next.config.ts` :

- `images.formats` : `["image/avif", "image/webp"]` ;
- `images.qualities` : `[90]`, et `quality={90}` sur chaque image ;
- _(Choix du builder)_ `images.deviceSizes` réduit à cinq largeurs environ (par exemple 640, 1080, 1600, 2048, 2560 : rien au-delà de la taille des fichiers servis) : 90 photos × 5 largeurs × 2 formats ≈ 900 transformations, loin des 5 000 mensuelles ;
- `sizes` posé selon la mise en page brute (photo pleine largeur de la colonne de texte, avec un plafond).

_Laissé au builder_ : vérifier dans la doc Vercel et Next.js à jour comment le cache des images transformées se comporte d'un déploiement à l'autre, et l'écrire dans la doc de la feature.

### Page Photo, sans style

`/fr/photo` et `/en/photo` (route existante, squelette du lot 1) :

- `<h1>` « Derrière l'objectif. » / « Behind the lens. », depuis `messages` ;
- une courte introduction et le lien Instagram (voir questions ouvertes) ;
- une liste de `<figure id="<id>">`, une par photo, dans l'ordre du fichier : `next/image` avec `width`, `height`, `alt`, `placeholder="blur"`, `quality={90}`, `sizes`, puis `<figcaption>` avec légende, lieu, date (`<time datetime>`), ligne de prise de vue et crédit s'il existe.
- Rien ne recadre : pas de `fill`, pas d'`object-fit: cover`, ratio porté par `width` et `height`.
- Les premières photos ne sont pas différées (`priority` ou `loading="eager"` sur la première) ; les autres sont chargées en différé, comportement par défaut de `next/image`.
- Langue des textes repliés : `lang="fr"` quand un texte français s'affiche sur la page anglaise, comme au lot 2.
- La mention « © Julien Gaudet, tous droits réservés » / « © Julien Gaudet, all rights reserved » en bas de la liste, depuis `messages`. _(Choix du builder)_ Elle est aussi écrite dans `public/photos/COPYRIGHT.txt` et dans le `README` du dépôt, pour que quelqu'un qui parcourt le dépôt public la voie aussi.
- Métadonnées : `title` du lot 1, `description` FR et EN rédigée par le builder et signalée dans la PR.

### Dépendances

- `sharp` (redimensionnement, sRGB, retrait des métadonnées, placeholder) et `exifr` (lecture de l'EXIF), en `devDependencies` : ils ne servent qu'au script. Vercel a déjà son propre optimiseur d'images.
- Le script suit la forme de `scripts/check-static.mts` (TypeScript exécuté directement par Node).

### Tests

**Unitaires (Vitest)** :

- calcul de l'`id` (accents, espaces, majuscules, collisions) ;
- fusion : un champ écrit à la main survit à un nouveau lancement ; une photo nouvelle arrive en fin de tableau avec un `alt` vide ; une photo absente du dossier reste et est signalée ; l'ordre est conservé ;
- extraction EXIF vers l'objet `exif` : correspondance des boîtiers, aucun champ GPS même si l'original en contient ;
- formatage de la ligne de prise de vue en FR et en EN, champs manquants compris ;
- schéma : `alt` FR ou EN manquant ou vide échoue ; le vrai `content/photos.json` passe, et chaque `id` a son fichier dans `public/photos/`.
- Un test d'intégration du script sur deux petites images de test (une en portrait, une en paysage avec GPS) : dimensions servies, ratio inchangé, pas d'EXIF ni de GPS dans le fichier écrit.

**BDD (Playwright, Gherkin)** : `features/photo.feature`

- Photo FR et EN : titre, nombre de photos égal à celui de `photos.json`, chaque image a un `alt` non vide, aucune violation `axe`.
- Une photo en portrait et une en paysage s'affichent avec le ratio de leur fichier (rapport largeur / hauteur rendu ≈ `width` / `height`).
- `/fr/photo#<id>` : la figure existe avec cet `id`.
- Le tableau des squelettes de `pages.feature` ne vérifie plus Photo comme squelette.

`pnpm check:static` doit toujours passer.

### Contenu de départ

Claude rédige un premier jet des `id`, `alt`, `caption` et `place` FR et EN des 90 photos en les regardant, avec les noms de fichiers et le GPS des originaux comme indices pour les lieux (lu en local, jamais écrit). Julien les corrige au fur et à mesure. Le jet est signalé dans la description de la PR.

### Documentation

- `docs/features/photos.md` : le parcours d'une photo, la commande, ce que le script écrit et ne touche pas, ce qui fait échouer le build, le poids du dépôt, les réglages `next/image` et le quota Vercel.
- `docs/features/content.md` : renvoi vers `photos.md`.
- `CLAUDE.md` : la commande `pnpm photos:meta <dossier>` (aujourd'hui « prévu au lot 3 »).
- Document de conception local : cases du lot 3 cochées (sauf l'affichage de la galerie, qui attend l'intégration UI) ; poids réel noté à la place de l'estimation à 40 photos.

### Lien Instagram

_(Choix du builder)_ `instagram` est un champ **facultatif** de `content/profile.json` (URL). Tant qu'il est absent, la page n'affiche pas le lien ; les scénarios BDD le vérifient seulement s'il existe.

## Questions ouvertes

- L'adresse Instagram de Julien (la maquette pointe vers `instagram.com` sans compte).

## Idées pour plus tard

- **Un globe 3D** qui place chaque photo à l'endroit où elle a été prise (idée de Julien, 24 novembre 2026). Il faudra alors stocker une position, volontairement arrondie (ville ou région), ce que ce lot interdit : ce sera une décision explicite de ce futur lot, pas un effet de bord. Le GPS des originaux reste disponible sur le Mac.

## Laissé au builder

- Versions exactes de `sharp` et `exifr` (dernières stables, vérifiées à la source).
- Le nom exact des clés de `messages` et la répartition en composants serveur.
- La valeur exacte de `sizes`.
- Le découpage en commits ; une seule PR pour le lot.
