# Lot 1 — Socle en ligne : design

22 novembre 2026 · brief complet : document de conception local, non versionné (`julien-gaudet - Document de conception.md` à la racine)

## Intention

Mettre le site en ligne le plus tôt possible, **sans design**, pour que chaque lot suivant s'ajoute par un simple merge : une branche, une preview Vercel, une CI qui bloque, puis la production. Le lot 1 pose aussi les choix qui seront coûteux à changer plus tard : la structure du dépôt, les outils qualité et surtout le routage bilingue avec des URLs traduites.

Le site sert aussi de terrain d'apprentissage pour Next.js (App Router, Server Components, génération statique) : le fonctionnement du routage doit rester compréhensible et documenté.

## Objectifs

- Un dépôt GitHub public `julien-gaudet`, sans fichier `LICENSE` (droits réservés).
- Un projet Next.js 16 (App Router) en TypeScript strict, avec pnpm.
- Les outils qualité du brief, branchés en CI et bloquants : Oxlint (`--deny-warnings`), Prettier, typecheck, Vitest, Playwright BDD (Gherkin) avec contrôle `axe`.
- Un projet Vercel relié au dépôt : production sur `main`, preview sur chaque branche et pull request.
- Le routage FR / EN avec URLs traduites, et une page squelette par route.
- Le site en ligne sur `*.vercel.app` ; le domaine `julien-gaudet.fr` viendra dans une PR séparée, après l'achat.

## Non-objectifs

- Aucun design : pas de tokens CSS, de polices, de navigation stylée ni de composants UI. Ils viennent avec l'intégration des maquettes.
- Aucun contenu réel ni schéma Zod (lot 2). Pas de Velite ni de MDX.
- Pas de formulaire de contact, de Resend ni de redirection e-mail (lot 5).
- Pas de sitemap, d'images Open Graph, de JSON-LD ni de Web Analytics (lots 4 et 5).
- Pas de bandeau de suggestion de langue.

## Anti-objectifs

- Une page qui perd son rendu statique (rendu dynamique à chaque requête) à cause du routage i18n.
- Un lien ou un sélecteur de langue qui envoie vers une URL dans la mauvaise langue, ou vers une 404.
- Une CI qui passe alors que le lint, les types ou un scénario échouent.
- Du contenu en dur dans les pages qui obligerait à toucher au code pour le changer.

## Contraintes

- Les conventions du `CLAUDE.md` du projet : TypeScript strict sans `any`, code et messages en anglais, contenu FR et EN, CSS Modules plus tard, JavaScript client limité au strict nécessaire, accessibilité WCAG AA.
- Les conventions Git globales : branches `type/…`, commits Conventional Commits en anglais puis en français, PR bilingues avec `TL;DR`. Rien ne part directement sur `main`.
- Plan Vercel Hobby, gratuit, usage personnel.
- Les MCP `next-devtools` (`init` en début de session dès que le projet existe) et `context7` pour la doc des librairies.

## Décisions prises avec Julien

### Routes

« Outils » devient **« Projets »** partout : routes, dossier de contenu, nom du schéma (`Project`). Le contact n'est **pas une route** : c'est un bloc de l'accueil, ancré en `#contact`. Les mentions légales ont leur page, au contenu classique, rédigé plus tard.

| Page                   | Chemin interne (dossier) | FR                       | EN                    |
| ---------------------- | ------------------------ | ------------------------ | --------------------- |
| Accueil                | `/`                      | `/fr`                    | `/en`                 |
| Parcours               | `/parcours`              | `/fr/parcours`           | `/en/experience`      |
| Projets                | `/projets`               | `/fr/projets`            | `/en/projects`        |
| Fiche projet           | `/projets/[slug]`        | `/fr/projets/[slug]`     | `/en/projects/[slug]` |
| Photographie           | `/photo`                 | `/fr/photo`              | `/en/photo`           |
| Conférences            | `/conferences`           | `/fr/conferences`        | `/en/talks`           |
| Fiche talk             | `/conferences/[slug]`    | `/fr/conferences/[slug]` | `/en/talks/[slug]`    |
| Podcast (Pizza Ananar) | `/podcast`               | `/fr/podcast`            | `/en/podcast`         |
| Mentions légales       | `/mentions-legales`      | `/fr/mentions-legales`   | `/en/legal-notice`    |

Les dossiers de `app/[locale]/` portent les chemins internes en français.

### Langue

- Le français est la langue par défaut ; toutes les URLs portent le préfixe de langue (`/fr/…`, `/en/…`).
- Sur `/` seul, le visiteur est redirigé selon son choix précédent (cookie) puis la langue de son navigateur, sinon vers `/fr`. _Choix du builder :_ la correspondance porte sur toute la liste `Accept-Language` avec ses pondérations (comportement par défaut de `next-intl`) : `de, en;q=0.8` donne `/en`.
- Un lien direct avec préfixe (`/fr/conferences`) n'est **jamais** redirigé vers une autre langue.
- Le sélecteur FR / EN envoie vers la page équivalente, slug compris, et mémorise le choix.
- _Choix du builder :_ on garde le cookie `NEXT_LOCALE` de `next-intl` v4. Il n'est posé que lorsque la langue de la page visitée diffère de celle du navigateur, que ce soit par le sélecteur ou par un lien direct. Un anglophone qui ouvre un lien `/fr/…` partagé retombera donc sur `/fr` en revenant sur `/`. Respecter à la lettre « seulement après un changement via le sélecteur » demanderait de désactiver ce cookie et de le poser côté client, avec du JavaScript en plus pour un gain faible. Durée : un an (`maxAge`). C'est un cookie de préférence d'interface, exempté de consentement selon la CNIL, et il sera mentionné dans les mentions légales.
- Chaque page déclare ses alternatives `hreflang` (`fr`, `en`, `x-default`).

## Approches envisagées

| Approche                                      | Principe                                                                                                                              | Pour                                                                                                                            | Contre                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. `next-intl` avec `pathnames`** (retenue) | Un seul dossier par page, une table qui traduit les chemins ; la librairie gère détection, cookie, liens typés, sélecteur et messages | Les URLs traduites sont déclarées une seule fois ; liens et clés de messages vérifiés par TypeScript ; déjà prévue par le brief | Une dépendance ; `setRequestLocale` obligatoire dans chaque layout et page pour garder le rendu statique                                         |
| B. Routage natif fait main                    | `proxy.ts` maison, segment `[lang]`, dictionnaires JSON, réécritures écrites à la main                                                | Aucune dépendance, apprentissage de la mécanique HTTP                                                                           | Beaucoup de plomberie à écrire et tester (réécritures des fiches, URL dans la mauvaise langue, `Accept-Language`, cookie, `hreflang`, sélecteur) |
| C. Dossiers dupliqués par langue              | `app/en/talks/` et `app/fr/conferences/`                                                                                              | Aucune réécriture                                                                                                               | Chaque page existe deux fois, contraire à « une page lit `content/` » ; écartée                                                                  |

Julien a choisi **A** : elle couvre exactement le besoin des URLs traduites et garde l'apprentissage de Next.js (proxy, Server Components, `generateStaticParams`, `metadata`). Pour comprendre la mécanique, le parcours d'une requête de `proxy.ts` jusqu'à la page est documenté dans `docs/features/`.

## Le socle, tel que décidé

- **Création** : `create-next-app` (Next 16, App Router, TypeScript, sans ESLint ni Tailwind), puis ajout des outils. _Choix du builder :_ le dossier n'étant pas vide (`CLAUDE.md`, `.mcp.json`, `.claude/`, docs), le projet est généré dans un dossier temporaire puis ses fichiers sont fusionnés ici, sans écraser l'existant.
- **Compte GitHub** : `IvesPower`, déjà connecté à `gh`.
- **Contenu du dépôt public** (décision de Julien) : le document de conception (`julien-gaudet - Document de conception.md`) reste **hors du dépôt**, dans `.gitignore`. Il reste la référence locale du projet. Tout le reste est publié : code, `CLAUDE.md`, `.mcp.json`, `.claude/` (skills, agents, `settings.json`) et `docs/`. Exception : `.claude/settings.local.json` va aussi dans `.gitignore`. Le lien de `CLAUDE.md` vers le document de conception reste en place, puisqu'il sert en local ; une phrase précise que le document n'est pas versionné.
- **Premier commit** (décision de Julien) : un seul commit initial directement sur `main`, avec les docs et la configuration existantes, sans code. Ensuite, la protection de branche est activée sur `main` (contrôles CI requis, pas de push direct), et tout le reste passe par des pull requests.
- **Qualité** : Oxlint avec les plugins `typescript`, `react`, `nextjs`, `jsx-a11y` et `--deny-warnings` ; Prettier ; `tsc --noEmit` ; Vitest pour les utilitaires ; `playwright-bdd` pour les parcours, avec `@axe-core/playwright`.
- **CI** : GitHub Actions sur chaque push et pull request : lint, format, typecheck, tests unitaires, build, tests BDD contre le build. Les contrôles sont requis avant merge sur `main`.
- **Déploiement** : intégration Git native de Vercel, pas de déploiement depuis GitHub Actions. Production sur `main`, preview par branche.
- **Node** : 26 LTS (« Lithium », 26.13.1 au 22 novembre 2026, vérifié sur nodejs.org) en CI et sur Vercel, déclaré dans `package.json` (`"engines": { "node": "26.x" }`, que Vercel respecte) et `.nvmrc`. Le poste local est en Node 23.11 (version impaire, hors support) : à passer en 26.
- **Vercel** : le MCP Vercel est autorisé ; le projet est créé et relié au dépôt par ce biais.
- **Domaine** (décision de Julien) : le domaine n'est pas encore acheté. **Le lot 1 se clôt sur l'adresse `*.vercel.app`.** Le branchement de `julien-gaudet.fr` se fera dans une petite PR à part, une fois l'achat fait par Julien : DNS délégués à Cloudflare, `@` et `www` vers Vercel, `www` redirigé vers l'apex. Les réglages Cloudflare sont manuels, faute de MCP Cloudflare.

### Pages squelettes

Chaque route affiche un titre `<h1>` et une phrase d'attente, tirés de `messages/fr.json` et `messages/en.json`, rien en dur dans les pages. Un layout minimal sans style fournit :

- `<html lang>` correct selon la langue ;
- une navigation en liste de liens vers toutes les pages (le libellé « Podcast » pour Pizza Ananar) ;
- le sélecteur FR / EN ;
- un lien d'évitement vers le contenu principal ;
- les métadonnées `title` et `hreflang` par page.

Les pages `[slug]` ne génèrent aucun paramètre tant qu'il n'y a pas de contenu (lot 2) : toute fiche renvoie une 404 localisée.

### Scénarios BDD du lot

- Ouvrir chaque page en FR et en EN : le titre attendu s'affiche, `lang` est correct, aucune violation `axe`.
- Changer de langue depuis une page : on arrive sur la page équivalente (`/fr/conferences` → `/en/talks`).
- Ouvrir `/` avec un navigateur en anglais : redirection vers `/en` ; en français ou autre langue : `/fr`.
- Ouvrir `/fr/conferences` avec un navigateur en anglais : pas de redirection.
- Ouvrir une URL inconnue : page 404 dans la bonne langue.

### Documentation

- `docs/features/i18n-routing.md` : le parcours d'une requête, la table des chemins, comment ajouter une page.
- `CLAUDE.md` : section Commandes complétée (`dev`, `build`, `lint`, `format`, `typecheck`, `test`, `test:e2e`).
- Document de conception mis à jour : Projets, routes, podcast, contact sur l'accueil, question des URLs anglaises tranchée.

## Laissé au builder

- Versions exactes des paquets (les dernières stables, vérifiées avec Context7).
- Organisation des fichiers `i18n/` (`routing.ts`, `navigation.ts`, `request.ts`) selon la doc `next-intl`.
- Configuration détaillée d'Oxlint, Prettier, Vitest et Playwright.
- Découpage en commits et en pull requests.
- Texte des phrases d'attente des squelettes.
