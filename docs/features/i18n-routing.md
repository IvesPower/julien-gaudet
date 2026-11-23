# Routage bilingue FR / EN

Le site existe en français (langue par défaut) et en anglais, avec des URLs traduites. Le routage repose sur [next-intl](https://next-intl.dev) v4.

## Table des chemins

Les dossiers de `app/[locale]/` portent le **chemin interne**, en français. La table `pathnames` de [`i18n/routing.ts`](../../i18n/routing.ts) donne l'URL publique de chaque langue.

| Interne               | FR                       | EN                    |
| --------------------- | ------------------------ | --------------------- |
| `/`                   | `/fr`                    | `/en`                 |
| `/parcours`           | `/fr/parcours`           | `/en/experience`      |
| `/projets`            | `/fr/projets`            | `/en/projects`        |
| `/projets/[slug]`     | `/fr/projets/[slug]`     | `/en/projects/[slug]` |
| `/photo`              | `/fr/photo`              | `/en/photo`           |
| `/conferences`        | `/fr/conferences`        | `/en/talks`           |
| `/conferences/[slug]` | `/fr/conferences/[slug]` | `/en/talks/[slug]`    |
| `/podcast`            | `/fr/podcast`            | `/en/podcast`         |
| `/mentions-legales`   | `/fr/mentions-legales`   | `/en/legal-notice`    |

## Parcours d'une requête

Exemple : `GET /en/talks`.

1. **`proxy.ts`** reçoit la requête (le matcher ignore `/_next`, `/api` et les fichiers avec une extension) et la passe au middleware next-intl.
2. Le middleware lit la langue dans l'URL (`en`) et **réécrit** `/en/talks` vers le chemin interne `/en/conferences`. Le visiteur voit toujours `/en/talks`.
3. Next.js sert `app/[locale]/conferences/page.tsx` avec `locale = "en"`. La page est déjà générée au build : rien n'est calculé à la requête.
4. La page appelle `resolveLocale(params)` ([`lib/locale.ts`](../../lib/locale.ts)) : langue inconnue → 404, sinon `setRequestLocale`, indispensable au rendu statique.
5. `getTranslations` lit les textes de [`messages/en.json`](../../messages/en.json), chargés par [`i18n/request.ts`](../../i18n/request.ts).

Cas particuliers gérés par le middleware :

- `/en/conferences` (chemin d'une autre langue) est redirigé vers `/en/talks`.
- `/fr/conferences/` (slash final) est redirigé vers `/fr/conferences`.
- Une URL inconnue (`/fr/nope`) passe par `app/[locale]/[...rest]` et affiche la 404 dans la langue de l'URL.

## Choix de la langue

- **Seule la racine `/` est redirigée.** L'ordre de choix : le cookie `NEXT_LOCALE`, puis l'en-tête `Accept-Language` (avec ses pondérations : `de, en;q=0.8` donne `/en`), sinon `fr`.
- Une URL qui porte déjà une langue (`/fr/conferences`) n'est jamais redirigée vers l'autre.
- Le cookie `NEXT_LOCALE` dure un an. next-intl ne le pose que lorsque la langue visitée diffère de celle du navigateur (sélecteur ou lien direct). C'est un cookie de préférence, exempté de consentement.
- Le sélecteur ([`components/locale-switcher.tsx`](../../components/locale-switcher.tsx)) est le seul Client Component : il lit la page courante et pointe vers la même page dans l'autre langue, slug compris.

## Référencement

Chaque page déclare son URL canonique et ses alternatives `hreflang` (`fr`, `en`, `x-default` = `/`) via [`lib/alternates.ts`](../../lib/alternates.ts). `metadataBase` ([`lib/site-url.ts`](../../lib/site-url.ts)) les rend absolues.

## Ajouter une page

1. Ajouter l'entrée dans `pathnames` (`i18n/routing.ts`).
2. Créer `app/[locale]/<chemin-interne>/page.tsx` : `resolveLocale(params)` en premier, `generateMetadata` avec `pageMetadata(...)`.
3. Ajouter le namespace de la page dans `messages/fr.json` **et** `messages/en.json` (`messages.test.ts` échoue si une langue a une clé en moins).
4. Ajouter le lien dans `components/site-nav.tsx` si la page fait partie de la navigation.
5. Ajouter les deux URLs dans `features/pages.feature`.
6. Vérifier : `pnpm build && pnpm check:static && pnpm test:e2e`.

## Limite connue : la 404 dépend de JavaScript

Une URL inconnue (`/fr/nope`, `/en/projects/x`) renvoie bien un statut 404, mais le HTML envoyé par le serveur est un shell vide (`<html id="__next_error__">`) : le titre « Page introuvable » et l'attribut `lang` n'apparaissent qu'après l'hydratation. C'est le comportement de Next 16.4 quand `notFound()` est levé au rendu d'une route dynamique (chemin `errorRecovery` de `app-render`), reproduit dans une app minimale sans next-intl. Une route fourre-tout statique (`dynamicParams = false`) servirait une 404 complète, mais seulement en français.

Décision du 23 novembre 2026 : on garde ce comportement pour le lot 1 et on le revoit au lot 5 (finitions, audit d'accessibilité). Pistes : version corrigée de Next, ou réécriture dans `proxy.ts` vers des 404 prérendues par langue. Le scénario à réactiver alors :

```gherkin
Scenario Outline: The 404 page is complete without JavaScript
  When I fetch the raw HTML of "<path>"
  Then the raw response status is 404
  And the raw HTML has the language "<lang>"
  And the raw HTML has the main heading "<heading>"

  Examples:
    | path                 | heading          | lang |
    | /fr/nope             | Page introuvable | fr   |
    | /en/nope             | Page not found   | en   |
    | /fr/projets/anything | Page introuvable | fr   |
```

Ses steps lisent la réponse avec `request.get(path)` (sans navigateur) et cherchent `<html … lang="…">` et `<h1>…</h1>` dans le texte.
