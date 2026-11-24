# Site perso Julien Gaudet

Site carte de visite bilingue FR / EN en Next.js (App Router) + TypeScript strict, généré au build et déployé sur Vercel. Le brief complet est dans [julien-gaudet - Document de conception.md](julien-gaudet%20-%20Document%20de%20conception.md) (document local, volontairement absent du dépôt public) : le relire avant de démarrer un lot.

## Début de session

- Appeler l'outil `init` du MCP `next-devtools` en début de session, dès que le projet Next.js existe (Next.js 16+, Node 20.19+).
- Pour la doc d'une librairie (Next.js, Velite, Zod, next-intl, Resend, playwright-bdd…), passer par Context7 ou Next.js DevTools plutôt que par la mémoire.

## Méthode

- Superpowers : brainstorm, plan, TDD et revue, un lot de la roadmap à la fois.
- Pas de décision UX ou UI sans validation : les maquettes Claude Design et la charte graphique du document de conception font foi. En cas de doute, demander.
- Le plugin `frontend-design` est installé mais désactivé : ne l'activer qu'à la phase d'intégration UI (`claude plugin enable frontend-design@claude-plugins-official --scope project`).

## Conventions

- TypeScript strict, pas de `any`. Les types du contenu sont dérivés des schémas Zod (`lib/schemas.ts`).
- Code, commentaires et messages en anglais. Le contenu du site est en français et en anglais.
- Styles en CSS Modules, uniquement avec les tokens CSS définis dans la charte (aucune autre couleur).
- Images via `next/image`, photos jamais recadrées ; texte alternatif FR/EN obligatoire.
- Pages statiques (`generateStaticParams`), JavaScript client limité au strict nécessaire.
- Accessibilité WCAG AA : clavier, focus visible, contrastes, `prefers-reduced-motion`.

## Structure

- `app/[locale]/…` : pages uniquement, elles lisent `content/` sans contenu en dur.
- `content/` : MDX (un fichier par langue : `slug.fr.mdx`, `slug.en.mdx`) et JSON, validés par `lib/schemas.ts` et lus par `lib/content.ts` (voir `docs/features/content.md`). Ajouter un talk, un projet ou une photo ne doit pas toucher au code.
  - `content/parcours.json` : expériences et formation.
  - `content/projets/<slug>.<langue>.mdx` : un projet par slug, tous affichés sur `/projets` (pas de page par projet pour l'instant).
  - `content/profile.json` : liens LinkedIn et GitHub, et `instagram` (URL facultative, le lien n'apparaît sur `/photo` que s'il est renseigné).
- `messages/fr.json`, `messages/en.json` : textes d'interface (`next-intl`).
- `public/photos/` + `content/photos.json` : tenu à jour par `pnpm photos:meta`, textes écrits à la main (voir `docs/features/photos.md`).
- `features/` : scénarios Gherkin et steps Playwright BDD.
- `docs/features/` : documentation des features.

## Commandes

Node 26 LTS (`.nvmrc`) et pnpm.

- `pnpm dev` : serveur de développement.
- `pnpm build` puis `pnpm start` : build de production et serveur local.
- `pnpm lint` : Oxlint avec les types, les avertissements font échouer.
- `pnpm format` / `pnpm format:check` : Prettier, écriture ou vérification.
- `pnpm typecheck` : génère les types des routes (`next typegen`) puis `tsc --noEmit`.
- `pnpm test` : tests unitaires Vitest (`**/*.test.ts`).
- `pnpm test:e2e` : scénarios Gherkin (`features/`) avec Playwright BDD et `axe`, contre `pnpm start` (lancer `pnpm build` avant). `PLAYWRIGHT_BASE_URL=<url>` les lance contre un site déployé.
- `pnpm check:static` : après `pnpm build`, échoue si une page de `app/[locale]/` n'est plus prérendue.
- `pnpm photos:meta <dossier>` : synchronise un dossier d'originaux avec `public/photos/` et `content/photos.json`.

## MCP du projet

Déclarés dans `.mcp.json` : `next-devtools`, `vercel` (connexion OAuth au premier usage), `context7`, `playwright`. Cloudflare est optionnel et pas encore ajouté.
