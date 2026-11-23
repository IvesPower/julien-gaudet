# Lot 2 — Parcours et projets : design

23 novembre 2026 · brief complet : document de conception local, non versionné (`julien-gaudet - Document de conception.md` à la racine) · lot précédent : [lot 1](2026-11-22-lot-1-socle-design.md)

## Intention

Remplacer les squelettes des pages **Parcours** et **Projets** par le vrai contenu, chargé depuis `content/` et validé par Zod au build. C'est le premier lot qui fait vivre la règle centrale du brief : **ajouter une expérience ou un projet = éditer un fichier de contenu, sans toucher au code**. Le chargeur posé ici servira aux lots suivants (conférences, podcast).

Le site reste un terrain d'apprentissage de Next.js : le chemin du contenu, du fichier jusqu'à la page statique, doit rester lisible et documenté.

## Objectifs

- Des schémas Zod dans `lib/schemas.ts`, d'où dérivent les types TypeScript du contenu (`Experience`, `Project`).
- Un chargeur `lib/content.ts` qui lit `content/` au build, valide tout et fait **échouer le build** si une entrée est invalide.
- La page Parcours (`/fr/parcours`, `/en/experience`) affiche les 12 entrées de la maquette : 8 expériences et 4 formations, de la plus récente à la plus ancienne.
- La page Projets (`/fr/projets`, `/en/projects`) affiche les deux projets en entier, chacun avec une ancre partageable (`/fr/projets#podcleaner-clips`).
- Le tout en FR et en EN, statique, accessible, couvert par des tests unitaires et des scénarios BDD.

## Non-objectifs

- **Aucun design** (décision de Julien) : pas de tokens, de polices, de CSS Modules, de logos d'employeurs ni de chronologie interactive à deux colonnes. Le HTML est sémantique et brut ; l'intégration des maquettes viendra dans un lot dédié, sur toutes les pages d'un coup.
- Pas de page par projet : la route `/projets/[slug]` est retirée (voir plus bas). Elle reviendra le jour où un projet plus important le justifiera.
- Pas de CV PDF : le lien « CV en PDF » de la maquette attend un fichier qui n'existe pas encore.
- Pas de lecture des releases GitHub au build : aucun des deux dépôts n'a de release aujourd'hui.
- Rien sur les autres pages (photo, conférences, podcast, accueil, mentions légales).

## Anti-objectifs

- Un contenu invalide ou une traduction incohérente qui passe le build sans bruit.
- Du texte de contenu écrit en dur dans un composant ou une page.
- Une page Parcours ou Projets qui perd son rendu statique.
- Du JavaScript client ajouté pour ces deux pages : elles sont entièrement en Server Components.

## Contraintes

- Les conventions du `CLAUDE.md` du projet et les règles Git globales, comme au lot 1 : TypeScript strict sans `any`, code en anglais, contenu FR et EN, branche `feat/…`, PR bilingue.
- Les maquettes Claude Design font foi pour le contenu et la structure des pages : [canvas Site perso](https://claude.ai/artifact/R8bTr1kURQiuMejpL1wr5f), artboards `Parcours` / `Parcours.en` et `Projets` / `Projets.en`. Julien a beaucoup itéré dessus.
- Versions des paquets vérifiées à la source (npm, GitHub, Context7), jamais de mémoire.

## Décisions prises avec Julien

1. **Sans design** pour l'instant : contenu et structure seulement.
2. **Source du contenu** : les textes FR et EN des maquettes, repris tels quels (ils viennent du profil LinkedIn de Julien). LinkedIn n'est pas lu directement.
3. **Projets sur une seule page**, comme la maquette (option A) : chaque projet est un bloc complet de `/projets`, avec une ancre `id` égale à son slug. La route `/projets/[slug]` et son dossier disparaissent.
4. **Chargement du contenu par un chargeur maison avec Zod et `@next/mdx`** (option A, ci-dessous).

## Approches envisagées

| Approche                                            | Principe                                                                                                                                                                         | Pour                                                                                                                                                 | Contre                                                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Chargeur maison, Zod + `@next/mdx`** (retenue) | `lib/schemas.ts` porte les schémas ; `lib/content.ts` lit le JSON et le frontmatter MDX au build et les valide ; le corps MDX est rendu par `@next/mdx`, voie officielle de Next | Types dérivés de Zod comme l'exige le `CLAUDE.md` ; une seule dépendance MDX, officielle ; toute la mécanique est visible (objectif d'apprentissage) | Une centaine de lignes de chargeur et leurs tests à écrire                                                                                 |
| B. Velite                                           | Génère les données typées et compile le MDX dans une étape avant `next build`                                                                                                    | Moins de code à nous                                                                                                                                 | Version 0.4 (1.0 en alpha) ; schémas écrits avec son `s` plutôt que dans `lib/schemas.ts` ; une étape de build de plus en CI et sur Vercel |
| C. Tout en JSON, sans MDX                           | Projets décrits en JSON comme le parcours                                                                                                                                        | Le plus simple                                                                                                                                       | Contraire au brief (« MDX, une fiche par projet ») ; les futures fiches auront besoin de prose. Écartée                                    |

`next-mdx-remote`, l'autre chargeur cité par le brief, est archivé sur GitHub (vérifié le 23 novembre 2026) : il n'est plus une option.

## Le lot, tel que décidé

### Modèle de contenu

Les marques _(choix du builder)_ signalent les décisions prises sans Julien : à relire.

**Textes localisés.** Un texte traduisible s'écrit `{ "fr": "…", "en": "…" }`. _(Choix du builder)_ `en` est facultatif : s'il manque, le français s'affiche, comme le prévoit le brief (« une entrée sans traduction retombe sur le français »). Le même repli vaut pour un projet sans fichier `.en.mdx`.

**Parcours : `content/parcours.json`.** Un tableau d'entrées `Experience` :

| Champ        | Type                                                     | Remarque                                                                                           |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `kind`       | `"work"` ou `"education"`                                | Range l'entrée sous « Expériences » ou « Formation »                                               |
| `contract`   | `"permanent"`, `"fixed-term"`, `"freelance"`, facultatif | CDI, CDD, freelance ; absent pour les formations et les postes sans précision (Lesaffre 2016, OVH) |
| `start`      | `"YYYY"` ou `"YYYY-MM"`                                  | Les formations n'ont que l'année                                                                   |
| `end`        | même format, facultatif                                  | Absent = en cours (« aujourd'hui », « present »)                                                   |
| `role`       | texte localisé                                           | Intitulé du poste ou du diplôme                                                                    |
| `org`        | chaîne ou texte localisé                                 | Nom de la structure ; localisé quand il change (« Université de Lille » / « University of Lille ») |
| `place`      | texte localisé, facultatif                               | « Wasquehal · hybride » / « Wasquehal, France · hybrid »                                           |
| `highlights` | liste de textes localisés, au moins un                   | Réalisations                                                                                       |
| `tags`       | liste de chaînes ou de textes localisés                  | Technologies, peut être vide ; un tag se localise s'il le faut (« Hébergement » / « Hosting »)     |

_(Choix du builder)_ `org` et chaque tag acceptent une chaîne simple ou un texte localisé, pour reprendre la maquette mot pour mot sans dupliquer les noms qui ne changent pas.

_(Choix du builder)_ Les libellés dérivés ne sont pas stockés : « Poste actuel », « Expérience », « Diplôme », « CDI », « Freelance » viennent de `messages/*.json` selon `kind`, `contract` et l'absence de `end`. Les périodes sont formatées par la langue de la page avec `Intl.DateTimeFormat` (« janv. 2024 – aujourd'hui », « Jan 2024 – present », « 2017 – 2019 »), et rendues dans des `<time datetime>`.

_(Choix du builder)_ L'ordre d'affichage est calculé, pas celui du fichier : par date de début décroissante dans chaque groupe, puis par date de fin décroissante en cas d'égalité (une entrée en cours passe devant). Ajouter une expérience en bas du fichier la place quand même au bon endroit. Ce tri reproduit l'ordre de la maquette, BOLD avant Néo Carbone compris (tous deux débutent en novembre 2022).

**Projets : `content/projets/<slug>.fr.mdx` et `<slug>.en.mdx`.** Le slug est le nom du fichier. Frontmatter :

| Champ       | Type                                                     | Remarque                                                                                                             |
| ----------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`      | chaîne                                                   | `podcleaner-clips`                                                                                                   |
| `tagline`   | chaîne                                                   | L'accroche, dans la langue du fichier                                                                                |
| `status`    | `"in-development"`, `"usable"`, `"archived"`             | Libellés « En développement », « Utilisable », « Archivé » dans `messages`                                           |
| `platforms` | liste de `"macos"`, `"windows"`, `"linux"`, au moins une | Libellés dans `messages`                                                                                             |
| `stack`     | liste de chaînes                                         | `Python 3.11/3.12`, `uv`, `ffmpeg`, `Whisper`…                                                                       |
| `repo`      | URL GitHub                                               | Lien « Voir sur GitHub »                                                                                             |
| `license`   | chaîne                                                   | `MIT`                                                                                                                |
| `install`   | chaîne, facultatif                                       | Commande d'installation ; absente = phrase « L'installation arrivera avec la première version. » tirée de `messages` |
| `order`     | entier                                                   | Ordre d'affichage sur la page                                                                                        |

Le corps MDX contient la liste des points (5 par projet dans la maquette) et pourra accueillir plus de prose plus tard.

_(Choix du builder)_ Les champs qui ne dépendent pas de la langue (`name`, `status`, `platforms`, `stack`, `repo`, `license`, `install`, `order`) sont écrits dans les deux fichiers, pour que chaque fichier se lise seul. Le chargeur **fait échouer le build s'ils diffèrent** entre le FR et l'EN : pas de statut « Utilisable » en français et « En développement » en anglais.

**Liens du profil : `content/profile.json`.** _(Choix du builder)_ L'URL LinkedIn (`https://www.linkedin.com/in/juliengaudet/`) et le compte GitHub (`IvesPower`) vivent dans un petit fichier de contenu, validé lui aussi, plutôt qu'en dur dans les pages. L'accueil et le bloc contact s'en serviront aux lots suivants.

**Textes de page.** Le titre, l'introduction (« Expériences et formation, de la plus récente à la plus ancienne. », « Deux outils open source… »), les intertitres et le bloc « Pourquoi ces outils ? » avec son lien vers `/podcast` vont dans `messages/fr.json` et `messages/en.json`, comme les autres textes d'interface. _(Choix du builder)_ L'introduction des projets mentionne « deux outils » : elle sera à reformuler quand un troisième projet arrivera.

### Chargeur

- `lib/schemas.ts` : les schémas Zod et les types exportés (`z.infer`). Aucun autre endroit ne déclare la forme du contenu.
- `lib/content.ts` : fonctions serveur `getExperiences(locale)`, `getProjects(locale)`, `getProfile()`. Elles lisent les fichiers avec `node:fs` au build, valident avec Zod et renvoient des données déjà résolues dans la langue demandée (repli FR compris). Une erreur de validation lève une exception qui nomme le fichier et le champ fautifs.
- **Langue des textes repliés** (exigence WCAG AA 3.1.2, langue d'un passage) : quand un texte s'affiche en français sur une page anglaise, il porte `lang="fr"`. Le chargeur garde donc l'information : chaque texte résolu indique sa langue réelle (par exemple `{ text, lang }`), et un projet sans `.en.mdx` est marqué comme français. Les composants posent `lang` seulement quand elle diffère de celle de la page. Le vrai contenu étant entièrement traduit, ce cas n'apparaît que dans les tests.
- Le frontmatter est lu par le chargeur (pour la validation et la liste) ; le corps MDX est importé et rendu par `@next/mdx`, configuré dans `next.config.ts` avec `mdx-components.tsx` à la racine. Le frontmatter ne doit pas apparaître dans le rendu.

_Laissé au builder :_ la librairie de lecture du frontmatter, les plugins remark nécessaires (avec Turbopack, ils se déclarent par leur nom), la façon d'importer le bon fichier MDX par slug et par langue en gardant le rendu statique.

### Pages, sans style

**Parcours** : `<h1>`, introduction, lien LinkedIn externe ; deux sections titrées `<h2>` (« Expériences », « Formation ») ; dans chacune une liste ordonnée d'entrées, chacune avec le rôle en `<h3>`, la structure, le lieu, la période, le type de poste et de contrat, les réalisations en liste et les tags.

**Projets** : `<h1>`, introduction ; un `<article id="<slug>">` par projet avec le nom en `<h2>`, le statut, l'accroche, le corps MDX, une liste de définitions (installation en `<code>`, plateformes, stack, licence) et le lien « Voir sur GitHub » ; puis le bloc « Pourquoi ces outils ? » et son lien vers la page podcast.

_(Choix du builder)_ Les liens externes (LinkedIn, GitHub) s'ouvrent dans le même onglet, sans `target="_blank"` : plus simple pour le clavier et les lecteurs d'écran. La flèche ↗ de la maquette viendra avec le design.

Les métadonnées `title` et `hreflang` restent celles du lot 1 ; une `description` par page s'ajoute, tirée de `messages`. _(Choix du builder)_ Les maquettes n'ont pas de texte pour ces descriptions : le builder les rédige, en FR et en EN, et les signale à Julien pour relecture dans la PR.

### Retrait de `/projets/[slug]`

- Suppression du dossier `app/[locale]/projets/[slug]/` et de l'entrée `/projets/[slug]` dans `i18n/routing.ts`.
- `/fr/projets/x` et `/en/projects/x` tombent alors dans la route fourre-tout `[...rest]` et restent des 404 localisées : le scénario « A detail page without content is not found » garde un exemple de fiche talk et vérifie que `/fr/projets/anything` est toujours introuvable.
- Mise à jour de `i18n/routing.test.ts` et de `docs/features/i18n-routing.md` (table des chemins, exemples).

### Tests

**Unitaires (Vitest)** :

- Schémas : une entrée valide passe ; un champ obligatoire manquant, un `kind`, `status` ou format de date invalide échouent.
- Chargeur : tri par date décroissante dans chaque groupe, égalités comprises ; repli sur le français quand `en` manque ou quand le fichier `.en.mdx` manque, avec la langue réelle `fr` signalée ; erreur quand les champs neutres diffèrent entre FR et EN ; erreur lisible qui nomme le fichier.
- Formatage des périodes en FR et en EN, avec et sans mois, avec et sans fin.
- Le vrai contenu de `content/` passe la validation (un test qui charge tout).

**BDD (Playwright, Gherkin)** :

- Parcours FR et EN : titre, 8 expériences et 4 formations, AXA France en premier avec « Poste actuel » / « Current role », aucune violation `axe`.
- Projets FR et EN : les deux projets, leur statut, un lien GitHub vers le bon dépôt, aucune violation `axe`.
- Ouvrir `/fr/projets#podcleaner-editor` : le bloc du projet existe avec cet `id`.
- Le tableau des squelettes de `pages.feature` ne vérifie plus Parcours et Projets comme squelettes, mais leur titre reste vérifié.

`pnpm check:static` doit toujours passer.

### Documentation

- `docs/features/content.md` : le chemin du contenu (fichier → Zod → chargeur → page statique), comment ajouter une expérience ou un projet, ce qui fait échouer le build.
- `CLAUDE.md` : la structure `content/` mise à jour (`parcours.json`, `projets/`, `profile.json`).
- Document de conception local : cases du lot 2 cochées ; « podcleaner-editing » corrigé en « podcleaner-editor » ; route `/projets/[slug]` retirée de l'arborescence et du tableau des sections ; décision « pas de page par projet pour l'instant » notée.

## Laissé au builder

- Versions exactes de `@next/mdx`, `@mdx-js/*`, Zod et des utilitaires de frontmatter (dernières stables, vérifiées à la source).
- Les noms exacts des clés de `messages` et la répartition en composants serveur.
- Le découpage en commits ; une seule PR pour le lot.
