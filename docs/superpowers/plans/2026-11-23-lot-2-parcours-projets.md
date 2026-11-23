# Lot 2 — Parcours et projets : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer les squelettes de Parcours et Projets par le vrai contenu FR / EN, lu dans `content/` et validé par Zod au build, sans design.

**Architecture :** `lib/schemas.ts` déclare la forme du contenu (Zod, types dérivés). `lib/content.ts` lit `content/parcours.json`, `content/profile.json` et le frontmatter de `content/projets/*.mdx` avec `node:fs`, valide, trie et résout chaque texte dans la langue de la page en gardant sa langue réelle (`{ text, lang }`). Le corps des fiches MDX est importé par `@next/mdx` (`import(\`@/content/projets/${slug}.${lang}.mdx\`)`). Les pages restent des Server Components statiques.

**Tech stack :** existante (Next.js 16.4.6, next-intl 4.15, Vitest 5, playwright-bdd 9) + `zod` 4.6.7, `@next/mdx` 16.4.6, `@mdx-js/loader` 3.1.1, `@mdx-js/react` 3.1.1, `@types/mdx` 2.0.14, `remark-frontmatter` 5.0.0, `gray-matter` 4.0.3 (versions npm vérifiées le 23 novembre 2026).

**Spec :** [docs/superpowers/specs/2026-11-23-lot-2-parcours-projets-design.md](../specs/2026-11-23-lot-2-parcours-projets-design.md). Brief local, non versionné : `julien-gaudet - Document de conception.md`.

**Données :** le contenu, repris mot pour mot des maquettes Claude Design, est déjà prêt dans [2026-11-23-lot-2-data/](2026-11-23-lot-2-data/) (`parcours.json`, `projets/*.mdx`). Les tâches le déplacent avec `git mv` vers `content/` ; ne pas le réécrire.

## Global Constraints

- TypeScript strict, aucun `any`. Code, commentaires, noms de tests, scénarios Gherkin et messages d'erreur en anglais ; textes du site en FR et EN, dans `content/` ou `messages/*.json`, jamais en dur dans un composant.
- Aucun style : pas de CSS, de tokens, de polices, de `className`.
- Aucun Client Component ajouté : Parcours et Projets sont entièrement rendus côté serveur.
- Toutes les pages sous `app/[locale]/` restent prérendues : `pnpm build && pnpm check:static` passe.
- Un contenu invalide fait échouer le build, avec un message qui nomme le fichier et le champ.
- Un texte affiché dans une autre langue que la page porte l'attribut `lang` de sa langue réelle (WCAG 3.1.2).
- Commits Conventional Commits `type(portée): English / français`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branche `feat/content-experience-projects` (déjà créée, la spec y est commitée).
- Avant chaque commit : `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`.

## Review Focus

- **Frontmatter affiché dans la page** : le YAML des fiches ne doit jamais apparaître dans le HTML rendu (`remark-frontmatter` oublié ou mal déclaré sous Turbopack). Testé en BDD, Task 5.
- **Fiche anglaise absente ou orpheline** : un `.fr.mdx` sans `.en.mdx` s'affiche en anglais avec `lang="fr"` ; un `.en.mdx` sans `.fr.mdx` fait échouer le chargement (le français est la source). Testé en Task 3.
- **Période incohérente** : une `end` antérieure à `start`, ou un mois `13`, sont rejetés par le schéma. Testé en Task 1.
- **Fuseau horaire** : `"2024-01"` doit s'afficher « janv. 2024 » quel que soit le fuseau de la machine de build (formatage en UTC). Testé en Task 2.
- **Ordre ambigu** : deux projets au même `order`, ou deux expériences aux mêmes dates, gardent un ordre stable (slug, puis ordre du fichier). Testé en Tasks 2 et 3.

---

### Task 1: Schémas Zod du contenu

**Files:**

- Create: `lib/schemas.ts`
- Test: `lib/schemas.test.ts`
- Modify: `package.json` (dépendance `zod`)

**Interfaces:**

- Produces (exportés de `lib/schemas.ts`) :
  - `localizedTextSchema` : `{ fr: string (non vide), en?: string (non vide) }`, objet strict. Type `LocalizedText`.
  - `textSchema` : `string (non vide) | LocalizedText`. Type `Text`. Utilisé pour `org` et chaque tag.
  - `periodDateSchema` : chaîne `YYYY` ou `YYYY-MM` (mois `01` à `12`). Type `PeriodDate`.
  - `experienceSchema` / `Experience` : `{ kind: "work" | "education"; contract?: "permanent" | "fixed-term" | "freelance"; start: PeriodDate; end?: PeriodDate; role: LocalizedText; org: Text; place?: LocalizedText; highlights: LocalizedText[] (≥ 1); tags: Text[] }`, strict, avec la règle `end >= start` (comparaison de chaînes après avoir complété `YYYY` en `YYYY-01` pour `start` et `YYYY-12` pour `end`).
  - `experiencesSchema` : `z.array(experienceSchema)`.
  - `projectFrontmatterSchema` / `ProjectFrontmatter` : `{ name: string; tagline: string; status: "in-development" | "usable" | "archived"; platforms: ("macos" | "windows" | "linux")[] (≥ 1); stack: string[] (≥ 1); repo: URL commençant par "https://github.com/"; license: string; install?: string; order: entier }`, strict.
  - `profileSchema` / `Profile` : `{ linkedin: URL; github: string }`, strict.
  - Les types sont `z.infer<…>` ; aucun type de contenu déclaré ailleurs.

- [ ] **Step 1: Installer Zod**

Run: `pnpm add zod@4.6.7`

- [ ] **Step 2: Écrire les tests qui échouent** (`lib/schemas.test.ts`)

```ts
const valid = {
  kind: "work",
  contract: "permanent",
  start: "2024-01",
  role: { fr: "Développeur", en: "Developer" },
  org: "AXA France",
  highlights: [{ fr: "Un point." }],
  tags: ["React", { fr: "Hébergement", en: "Hosting" }],
};
```

- `accepts a valid experience` : `experienceSchema.parse(valid)` ne lève pas.
- `accepts a year-only education entry` : `{ ...valid, kind: "education", contract: undefined, start: "2017", end: "2019" }` passe.
- `rejects a missing role`, `rejects an unknown kind ("job")`, `rejects month 13 ("2024-13")`, `rejects an end before the start ({ start: "2024-01", end: "2023-12" })`, `rejects empty highlights`, `rejects an unknown key` : `safeParse(...).success === false`.
- `accepts an end in the start month ({ start: "2015-07", end: "2015-07" })` et `accepts a year end in the start year ({ start: "2017-09", end: "2017" })`.
- Projet : `accepts the podcleaner-clips frontmatter` (valeurs de `2026-11-23-lot-2-data/projets/podcleaner-clips.fr.mdx`) ; `rejects status "done"`, `rejects a non-GitHub repo ("https://gitlab.com/x")`, `rejects empty platforms`, `accepts a missing install`.
- Profil : `accepts { linkedin: "https://www.linkedin.com/in/juliengaudet/", github: "IvesPower" }`, `rejects a linkedin that is not a URL`.

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run: `pnpm test lib/schemas.test.ts` — Expected: FAIL (module `./schemas` introuvable).

- [ ] **Step 4: Implémenter `lib/schemas.ts`** selon le bloc Interfaces.

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `pnpm test lib/schemas.test.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/schemas.ts lib/schemas.test.ts
git commit -m "feat(content): add Zod schemas for experience, projects and profile / ajouter les schémas Zod du parcours, des projets et du profil"
```

---

### Task 2: Chargeur du parcours et du profil, formatage des périodes

**Files:**

- Create: `lib/content.ts`, `lib/format-period.ts`, `lib/lang-attr.ts`
- Create (par `git mv`) : `content/parcours.json` ← `docs/superpowers/plans/2026-11-23-lot-2-data/parcours.json`
- Create: `content/profile.json` : `{ "linkedin": "https://www.linkedin.com/in/juliengaudet/", "github": "IvesPower" }`
- Test: `lib/content.test.ts`, `lib/format-period.test.ts`, `lib/lang-attr.test.ts`

**Interfaces:**

- Consumes: Task 1 (`experiencesSchema`, `profileSchema`, `Experience`, `Text`, `LocalizedText`, `Profile`) ; `AppLocale` de `@/i18n/routing`.
- Produces :
  - `lib/content.ts` :
    - `type ResolvedText = { text: string; lang: AppLocale }`
    - `type ResolvedExperience = { kind: Experience["kind"]; contract?: Experience["contract"]; start: PeriodDate; end?: PeriodDate; role: ResolvedText; org: ResolvedText; place?: ResolvedText; highlights: ResolvedText[]; tags: ResolvedText[] }`
    - `class ContentError extends Error` : message `"<chemin relatif au dossier de contenu>: <chemin du champ>: <message Zod>"`, par exemple `parcours.json: 3.role.fr: …`.
    - `resolveText(value: Text, locale: AppLocale): ResolvedText` : une chaîne simple prend la langue de la page ; un texte localisé donne `value[locale]` s'il existe, sinon `{ text: value.fr, lang: "fr" }`.
    - `getExperiences(locale: AppLocale, contentDir?: string): Promise<{ work: ResolvedExperience[]; education: ResolvedExperience[] }>` : tri par `start` décroissant, puis `end` décroissant (absent = en cours = le plus récent), puis ordre du fichier.
    - `getProfile(contentDir?: string): Promise<Profile>`.
    - `contentDir` vaut par défaut `path.join(process.cwd(), "content")`.
  - `lib/format-period.ts` : `formatPeriod(start: PeriodDate, end: PeriodDate | undefined, locale: AppLocale, presentLabel: string): string`. `YYYY-MM` → `Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" })` ; `YYYY` → l'année seule ; séparateur `" – "` (tiret demi-cadratin entouré d'espaces) ; sans `end`, `presentLabel`.
  - `lib/lang-attr.ts` : `langAttr(text: { lang: AppLocale }, pageLocale: AppLocale): AppLocale | undefined`, qui renvoie `text.lang` seulement s'il diffère de la langue de la page.

- [ ] **Step 1: Écrire les tests qui échouent**

`lib/format-period.test.ts` :

- `formatPeriod("2024-01", undefined, "fr", "aujourd’hui")` → `"janv. 2024 – aujourd’hui"`
- `formatPeriod("2024-01", undefined, "en", "present")` → `"Jan 2024 – present"`
- `formatPeriod("2015-07", "2015-10", "fr", "…")` → `"juil. 2015 – oct. 2015"`
- `formatPeriod("2022-06", "2022-11", "en", "…")` → `"Jun 2022 – Nov 2022"`
- `formatPeriod("2017", "2019", "fr", "…")` → `"2017 – 2019"`
- `uses UTC` : `formatPeriod("2024-01", "2024-01", "en", "…")` → `"Jan 2024 – Jan 2024"` (l'implémentation doit passer `timeZone: "UTC"` ; le test documente le cas).

`lib/lang-attr.test.ts` : `langAttr({ lang: "fr" }, "en") === "fr"` ; `langAttr({ lang: "en" }, "en") === undefined`.

`lib/content.test.ts` : un utilitaire de test `writeContent(files: Record<string, string>): Promise<string>` écrit les fichiers dans un dossier `fs.mkdtemp(os.tmpdir())` et renvoie son chemin.

- `resolveText`: `("AXA France", "en")` → `{ text: "AXA France", lang: "en" }` ; `({ fr: "Lille", en: "Lille, France" }, "en")` → `{ text: "Lille, France", lang: "en" }` ; `({ fr: "Diplôme" }, "en")` → `{ text: "Diplôme", lang: "fr" }`.
- `sorts by start date, newest first, within each group` : trois entrées `work` (2016-01, 2024-01, 2022-06) et une `education` → `work.map(e => e.start)` vaut `["2024-01", "2022-06", "2016-01"]`, `education` a une entrée.
- `breaks a start tie with the end date, ongoing first` : `{ start: "2022-11", end: "2023-02" }`, `{ start: "2022-11", end: "2024-01" }` et `{ start: "2022-11" }` → ordre des `end` : `[undefined, "2024-01", "2023-02"]`.
- `keeps the file order on a full tie`.
- `throws a ContentError naming the file and the field` : une entrée sans `role` → `rejects.toThrow(/parcours\.json: 0\.role/)`.
- `loads the real content` : `getExperiences("fr")` (dossier par défaut) renvoie 8 `work` et 4 `education`, `work[0].org.text === "AXA France"`, `work[2].org.text === "BOLD"` ; `getExperiences("en")` donne `education[2].org.text === "University of Lille"` ; `getProfile()` donne `github === "IvesPower"`.

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `pnpm test lib/` — Expected: FAIL (modules introuvables).

- [ ] **Step 3: Déplacer les données**

```bash
mkdir -p content
git mv docs/superpowers/plans/2026-11-23-lot-2-data/parcours.json content/parcours.json
```

puis créer `content/profile.json` (valeur dans Files).

- [ ] **Step 4: Implémenter `lib/format-period.ts`, `lib/lang-attr.ts` et `lib/content.ts`** selon le bloc Interfaces. Lecture en `fs/promises`, `JSON.parse`, puis `safeParse` ; en cas d'échec, `ContentError` construit à partir du premier `issue` (`issue.path.join(".")`).

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content lib docs/superpowers/plans/2026-11-23-lot-2-data
git commit -m "feat(content): load and sort the experience timeline / charger et trier le parcours"
```

---

### Task 3: Chargeur des projets

**Files:**

- Modify: `lib/content.ts`, `lib/content.test.ts`
- Modify: `package.json` (dépendance `gray-matter`)
- Create (par `git mv`) : `content/projets/podcleaner-clips.fr.mdx`, `.en.mdx`, `content/projets/podcleaner-editor.fr.mdx`, `.en.mdx` ← `docs/superpowers/plans/2026-11-23-lot-2-data/projets/`

**Interfaces:**

- Consumes: Task 1 (`projectFrontmatterSchema`, `ProjectFrontmatter`), Task 2 (`ResolvedText`, `ContentError`, `contentDir` par défaut).
- Produces (`lib/content.ts`) :
  - `type ResolvedProject = Omit<ProjectFrontmatter, "tagline"> & { slug: string; tagline: ResolvedText; contentLocale: AppLocale }`, où `contentLocale` est la langue du fichier MDX à importer pour le corps.
  - `getProjects(locale: AppLocale, contentDir?: string): Promise<ResolvedProject[]>` :
    - Ne lit que `projets/*.fr.mdx` et `projets/*.en.mdx`, et ignore tout autre fichier. Le slug est le nom sans `.<langue>.mdx`.
    - Le frontmatter est lu avec `gray-matter` et validé.
    - Un `.en.mdx` sans `.fr.mdx` lève `ContentError` (`projets/<slug>.en.mdx: missing French source`).
    - Si `name`, `status`, `platforms`, `stack`, `repo`, `license`, `install` ou `order` diffèrent entre FR et EN, une `ContentError` nomme le premier champ (`projets/<slug>.en.mdx: status: differs from the French file`).
    - Sur une page EN sans `.en.mdx` : tagline et corps français, `contentLocale: "fr"`, `tagline.lang: "fr"`.
    - Tri par `order`, puis par slug.

- [ ] **Step 1: Installer gray-matter**

Run: `pnpm add gray-matter@4.0.3`

- [ ] **Step 2: Écrire les tests qui échouent** (dans `lib/content.test.ts`, avec `writeContent`, frontmatter minimal valide)

- `reads both languages` : `getProjects("en")` → `[0].tagline` vaut `{ text: "<tagline EN>", lang: "en" }` et `contentLocale === "en"`.
- `falls back to French when the English file is missing` : seulement `a.fr.mdx` → sur `"en"`, `contentLocale === "fr"` et `tagline.lang === "fr"`.
- `rejects an English file without a French source` → `rejects.toThrow(/b\.en\.mdx: missing French source/)`.
- `rejects a neutral field that differs between languages` : `status: usable` en FR, `in-development` en EN → `rejects.toThrow(/status: differs/)`.
- `ignores other files` : un `README.md` et un `notes.txt` dans `projets/` ne changent rien.
- `sorts by order, then slug` : `b` (`order: 1`), `a` (`order: 1`), `c` (`order: 0`) → slugs `["c", "a", "b"]`.
- `throws a ContentError on an invalid frontmatter` : `status: done` → message qui contient `projets/a.fr.mdx: status`.
- `loads the real projects` : `getProjects("fr")` → slugs `["podcleaner-clips", "podcleaner-editor"]`, `[0].status === "usable"`, `[1].install === undefined`.

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run: `pnpm test lib/content.test.ts` — Expected: FAIL (`getProjects` n'existe pas).

- [ ] **Step 4: Déplacer les fiches**

```bash
git mv docs/superpowers/plans/2026-11-23-lot-2-data/projets content/projets
```

Le dossier `2026-11-23-lot-2-data/` est alors vide et disparaît.

- [ ] **Step 5: Implémenter `getProjects`** selon le bloc Interfaces.

- [ ] **Step 6: Lancer les tests, vérifier le succès**

Run: `pnpm test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml content lib docs/superpowers/plans
git commit -m "feat(content): load the project files with a French fallback / charger les fiches projets avec repli sur le français"
```

---

### Task 4: Page Parcours

**Files:**

- Modify: `app/[locale]/parcours/page.tsx`
- Create: `components/experience-entry.tsx` (Server Component)
- Modify: `messages/fr.json`, `messages/en.json` (namespace `ExperiencePage`)
- Modify: `lib/page-metadata.ts`, `components/skeleton-page.tsx`
- Create: `features/experience.feature`, `features/steps/content.steps.ts`

**Interfaces:**

- Consumes: Task 2 (`getExperiences`, `getProfile`, `formatPeriod`, `langAttr`, `ResolvedExperience`).
- Produces :
  - `PageNamespace` est déplacé dans `lib/page-metadata.ts`. `components/skeleton-page.tsx` n'accepte plus que `SkeletonNamespace = Exclude<PageNamespace, "ExperiencePage" | "ProjectsPage">`.
  - `pageMetadata(params, namespace, href)` garde sa signature et ajoute `description: t("description")` quand le namespace en a une (`t.has("description")`).
  - Les steps BDD réutilisables par la Task 5 (`features/steps/content.steps.ts`) :
    - `Then the section {string} lists {int} entries` : compte les `article` dans `getByRole("region", { name })`.
    - `Then the first entry of {string} contains {string}`.
    - `Then the page has a link {string} to {string}` : le lien porte ce nom accessible et un `href` exact.
    - `Then the page does not contain {string}`.

Messages `ExperiencePage` (FR / EN), à remplacer en entier (la clé `placeholder` disparaît) :

| Clé                   | FR                                                                          | EN                                                                 |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `title`               | Parcours                                                                    | Experience                                                         |
| `description`         | Le parcours de Julien Gaudet, développeur front : expériences et formation. | Julien Gaudet's path as a front-end developer: jobs and education. |
| `intro`               | Expériences et formation, de la plus récente à la plus ancienne.            | Jobs and education, newest first.                                  |
| `linkedin`            | LinkedIn                                                                    | LinkedIn                                                           |
| `groups.work`         | Expériences                                                                 | Experience                                                         |
| `groups.education`    | Formation                                                                   | Education                                                          |
| `kind.current`        | Poste actuel                                                                | Current role                                                       |
| `kind.work`           | Expérience                                                                  | Experience                                                         |
| `kind.education`      | Diplôme                                                                     | Degree                                                             |
| `contract.permanent`  | CDI                                                                         | Permanent                                                          |
| `contract.fixed-term` | CDD                                                                         | Fixed-term                                                         |
| `contract.freelance`  | Freelance                                                                   | Freelance                                                          |
| `present`             | aujourd’hui                                                                 | present                                                            |
| `tags`                | Technologies                                                                | Technologies                                                       |

Les deux `description` sont rédigées par le builder et seront relues par Julien dans la PR.

Structure HTML (sans style) :

- `<h1>`, puis `<p>` d'intro, puis le lien LinkedIn (`profile.linkedin`, même onglet).
- Pour chaque groupe, une `<section aria-labelledby>` avec un `<h2>`, puis un `<ol>` de `<li><article>`.
- Chaque `article` contient :
  - le libellé `kind` (`current` si `kind === "work"` et pas de `end`), suivi de `·` et du contrat s'il existe ;
  - la période dans un `<time dateTime={start}>` ;
  - le rôle en `<h3>`, la structure, puis le lieu s'il existe ;
  - un `<ul>` de réalisations ;
  - les tags, dans un `<ul aria-label={t("tags")}>` s'il y en a.
- Chaque texte résolu porte `lang={langAttr(text, locale)}`.

- [ ] **Step 1: Écrire le scénario qui échoue** (`features/experience.feature`)

```gherkin
Feature: Experience page
  Scenario Outline: Read the experience timeline
    When I open "<path>"
    Then the main heading is "<heading>"
    And the section "<work>" lists 8 entries
    And the section "<education>" lists 4 entries
    And the first entry of "<work>" contains "AXA France"
    And the first entry of "<work>" contains "<current>"
    And the page has a link "LinkedIn" to "https://www.linkedin.com/in/juliengaudet/"
    And the page has no accessibility violations

    Examples:
      | path           | heading    | work        | education | current      |
      | /fr/parcours   | Parcours   | Expériences | Formation | Poste actuel |
      | /en/experience | Experience | Experience  | Education | Current role |
```

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm build && pnpm test:e2e features/experience.feature` — Expected: FAIL (steps non définis ou section introuvable).

- [ ] **Step 3: Implémenter** les messages, `pageMetadata`, `SkeletonNamespace`, `components/experience-entry.tsx`, la page et `features/steps/content.steps.ts`.

- [ ] **Step 4: Vérifier le succès**

Run: `pnpm build && pnpm check:static && pnpm test:e2e` — Expected: tous les scénarios PASS, « All 14 pages are prerendered. »

- [ ] **Step 5: Commit**

```bash
git add app components lib messages features
git commit -m "feat(experience): render the experience timeline from content / afficher le parcours depuis le contenu"
```

---

### Task 5: MDX, page Projets et retrait de `/projets/[slug]`

**Files:**

- Modify: `package.json` (`@next/mdx@16.4.6`, `@mdx-js/loader@3.1.1`, `@mdx-js/react@3.1.1`, `@types/mdx@2.0.14`, `remark-frontmatter@5.0.0`)
- Modify: `next.config.ts` : `withNextIntl(withMDX(nextConfig))`, `createMDX({ options: { remarkPlugins: ["remark-frontmatter"] } })` (plugin déclaré par son nom pour Turbopack). Ne pas ajouter `mdx` à `pageExtensions` : aucune route n'est en MDX.
- Create: `mdx-components.tsx` (racine, `useMDXComponents` qui renvoie `{}`)
- Create: `components/project-card.tsx` (Server Component, importe le corps MDX)
- Modify: `app/[locale]/projets/page.tsx`
- Delete: `app/[locale]/projets/[slug]/`
- Modify: `i18n/routing.ts` (retirer `"/projets/[slug]"`), `i18n/routing.test.ts` (le test des fiches ne garde que `/conferences/[slug]` → `/en/talks/devlille-2026`, et prend le nom `localizes talk detail pages with their slug`)
- Modify: `messages/fr.json`, `messages/en.json` (namespace `ProjectsPage`)
- Create: `features/projects.feature`

**Interfaces:**

- Consumes: Task 3 (`getProjects`, `ResolvedProject`), Task 4 (steps BDD, `pageMetadata` avec description), Task 2 (`langAttr`).
- Produces: `ProjectCard({ project, locale }: { project: ResolvedProject; locale: AppLocale })`. Le corps se charge par `(await import(\`@/content/projets/${project.slug}.${project.contentLocale}.mdx\`)).default`.

Messages `ProjectsPage` (FR / EN), à remplacer en entier :

| Clé                     | FR                                                                                                                       | EN                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `title`                 | Projets                                                                                                                  | Projects                                                                                             |
| `description`           | Les outils open source de Julien Gaudet, nés pour monter le podcast Pizza Ananar.                                        | Julien Gaudet's open source tools, built to edit the Pizza Ananar podcast.                           |
| `intro`                 | Deux outils open source en ligne de commande, nés pour monter Pizza Ananar. Ils tournent en local, Claude est en option. | Two open source command-line tools, born to edit Pizza Ananar. They run locally; Claude is optional. |
| `status.in-development` | En développement                                                                                                         | In development                                                                                       |
| `status.usable`         | Utilisable                                                                                                               | Usable                                                                                               |
| `status.archived`       | Archivé                                                                                                                  | Archived                                                                                             |
| `platform.macos`        | macOS                                                                                                                    | macOS                                                                                                |
| `platform.windows`      | Windows                                                                                                                  | Windows                                                                                              |
| `platform.linux`        | Linux                                                                                                                    | Linux                                                                                                |
| `details.install`       | Installation                                                                                                             | Install                                                                                              |
| `details.installLater`  | L’installation arrivera avec la première version.                                                                        | Install steps will come with the first release.                                                      |
| `details.platforms`     | Plateformes                                                                                                              | Platforms                                                                                            |
| `details.stack`         | Stack                                                                                                                    | Stack                                                                                                |
| `details.license`       | Licence                                                                                                                  | License                                                                                              |
| `github`                | Voir sur GitHub                                                                                                          | View on GitHub                                                                                       |
| `why.title`             | Pourquoi ces outils ?                                                                                                    | Why these tools?                                                                                     |
| `why.text`              | Ils existent pour <link>Pizza Ananar</link>, le podcast cinéma que je co-anime.                                          | They exist for <link>Pizza Ananar</link>, the film podcast I co-host.                                |

`why.text` est rendu avec `t.rich`, et `<link>` devient un `Link` de `@/i18n/navigation` vers `/podcast`. Les deux `description` sont à relire par Julien.

Structure HTML :

- `<h1>`, puis l'intro.
- Un `<article id={slug} aria-labelledby>` par projet, qui porte `lang={langAttr({ lang: contentLocale }, locale)}`. Il contient :
  - le nom en `<h2>`, le statut et l'accroche `<p>` ;
  - le corps MDX ;
  - un `<dl>` : installation (`<code>` de `install`, ou `installLater`), plateformes jointes par `·`, stack jointe par `·`, licence ;
  - le lien `github` vers `repo`.
- Une `<section aria-labelledby>` « Pourquoi ces outils ? ».

- [ ] **Step 1: Écrire le scénario qui échoue** (`features/projects.feature`)

```gherkin
Feature: Projects page
  Scenario Outline: Read the projects
    When I open "<path>"
    Then the main heading is "<heading>"
    And the project "podcleaner-clips" shows "<usable>"
    And the project "podcleaner-editor" shows "<dev>"
    And the project "podcleaner-clips" links "<github>" to "https://github.com/IvesPower/podcleaner-clips"
    And the project "podcleaner-editor" links "<github>" to "https://github.com/IvesPower/podcleaner-editor"
    And the page does not contain "order:"
    And the page does not contain "status:"
    And the page has a link "Pizza Ananar" to "<podcast>"
    And the page has no accessibility violations

    Examples:
      | path         | heading  | usable     | dev              | github          | podcast      |
      | /fr/projets  | Projets  | Utilisable | En développement | Voir sur GitHub | /fr/podcast  |
      | /en/projects | Projects | Usable     | In development   | View on GitHub  | /en/podcast  |

  Scenario: Share a direct link to a project
    When I open "/fr/projets#podcleaner-editor"
    Then the project "podcleaner-editor" shows "Raccourcit les blancs de plus d’une seconde."
```

Deux steps s'ajoutent à `features/steps/content.steps.ts` : `the project {string} shows {string}` (texte dans `article#<slug>`) et `the project {string} links {string} to {string}` (lien de ce nom et de ce `href` exact dans `article#<slug>`). Le step `the page has a link {string} to {string}` de la Task 4 compare le `href` exact, et le lien Pizza Ananar est relatif (`/fr/podcast`).

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm build && pnpm test:e2e features/projects.feature` — Expected: FAIL.

- [ ] **Step 3: Installer les paquets MDX**

Run: `pnpm add @next/mdx@16.4.6 @mdx-js/loader@3.1.1 @mdx-js/react@3.1.1 remark-frontmatter@5.0.0 && pnpm add -D @types/mdx@2.0.14`

- [ ] **Step 4: Implémenter** la config MDX, `mdx-components.tsx`, `ProjectCard`, la page et les messages ; supprimer `app/[locale]/projets/[slug]/` et la route dans `i18n/routing.ts` ; mettre à jour `i18n/routing.test.ts`.

- [ ] **Step 5: Vérifier le succès**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:static && pnpm test:e2e` — Expected:

- tout passe ;
- « All 14 pages are prerendered. » ;
- le scénario `/fr/projets/anything` de `pages.feature` renvoie toujours une 404 « Page introuvable » (via `[...rest]`).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts mdx-components.tsx app components i18n messages features
git commit -m "feat(projects): render the projects from MDX on a single page / afficher les projets depuis le MDX sur une seule page"
```

---

### Task 6: Documentation et clôture du lot

**Files:**

- Create: `docs/features/content.md`
- Modify: `docs/features/i18n-routing.md` (retirer la ligne `/projets/[slug]` de la table ; l'exemple `/en/projects/x` reste valable comme URL inconnue)
- Modify: `CLAUDE.md` (section Structure : `content/parcours.json`, `content/profile.json`, `content/projets/<slug>.<langue>.mdx`)
- Modify (local, non versionné) : `julien-gaudet - Document de conception.md`

`docs/features/content.md` couvre, en français, comme `i18n-routing.md` :

- le chemin du contenu : fichier → `lib/schemas.ts` → `lib/content.ts` → page statique, puis import MDX ;
- le modèle des deux types de contenu, avec un exemple d'entrée de chaque ;
- comment ajouter une expérience, puis un projet (les deux fichiers, les champs neutres identiques) ;
- le repli sur le français et l'attribut `lang` ;
- ce qui fait échouer le build, avec un exemple de message `ContentError`.

Document de conception :

- cocher les trois cases du lot 2 ;
- remplacer `podcleaner-editing` par `podcleaner-editor` ;
- retirer `projets/[slug]/page.tsx` de l'arborescence et « une fiche par projet » du tableau des sections ;
- noter « pas de page par projet pour l'instant, décision du 23 novembre 2026, voir la spec du lot 2 » ;
- dans le tableau Stack, remplacer « Velite ou `next-mdx-remote` + script maison » par « chargeur maison (Zod + `@next/mdx`) ».

- [ ] **Step 1: Écrire la documentation et mettre à jour `CLAUDE.md` et le document de conception**

- [ ] **Step 2: Vérification complète**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm check:static && pnpm test:e2e` — Expected: tout passe.

- [ ] **Step 3: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs(content): document the content model and how to add entries / documenter le modèle de contenu et l'ajout d'entrées"
```

- [ ] **Step 4: Pousser la branche et ouvrir la PR**, avec l'accord de Julien. Titre : `feat: experience and projects from content / parcours et projets depuis le contenu`. Description bilingue selon le `CLAUDE.md` global ; dans `## Notes`, les deux paires de `description` à relire.
