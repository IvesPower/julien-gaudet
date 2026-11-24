# Contenu du site

Les photos ont leur propre chemin (script, fichiers servis) : voir [`photos.md`](photos.md).

Le texte des pages vit dans `content/`, pas dans le code. Ajouter une expérience ou un projet, c'est éditer un fichier et commiter : le build valide tout et Vercel redéploie.

## Le chemin du contenu

1. **Fichier** : `content/parcours.json`, `content/profile.json`, `content/projets/<slug>.<langue>.mdx`.
2. **Schéma** : [`lib/schemas.ts`](../../lib/schemas.ts) décrit la forme de chaque fichier avec Zod. Les types TypeScript du contenu en sont dérivés (`z.infer`) et ne sont déclarés nulle part ailleurs.
3. **Chargeur** : [`lib/content.ts`](../../lib/content.ts) lit les fichiers avec `node:fs` pendant le build. Il les valide, trie les entrées et résout chaque texte dans la langue de la page : `getExperiences(locale)`, `getProjects(locale)`, `getProfile()`.
4. **Page statique** : `app/[locale]/parcours/page.tsx` et `app/[locale]/projets/page.tsx` appellent le chargeur pendant le prérendu. Rien n'est lu à la requête.
5. **Corps MDX** : pour chaque projet, [`components/project-card.tsx`](../../components/project-card.tsx) importe `content/projets/<slug>.<langue>.mdx`, compilé par `@next/mdx`. `remark-frontmatter` (déclaré dans `next.config.ts`) retire le frontmatter du rendu, et le chargeur le lit de son côté avec `gray-matter`.

## Textes localisés

Un texte traduisible s'écrit `{ "fr": "…", "en": "…" }`. Si `en` manque, la page anglaise affiche le français. Le chargeur renvoie alors `{ text, lang: "fr" }`, et le composant pose `lang="fr"` sur ce texte (WCAG 3.1.2, langue d'un passage).

Une chaîne simple veut dire « identique dans toutes les langues ». C'est possible pour le nom d'une structure (`org`) et pour les tags.

## Ajouter une expérience

Ajouter un objet dans `content/parcours.json`, à n'importe quelle place : l'ordre affiché est calculé (date de début décroissante, puis date de fin, une entrée en cours passe devant).

```json
{
  "kind": "work",
  "contract": "permanent",
  "start": "2024-01",
  "role": { "fr": "Développeur front", "en": "Front-end developer" },
  "org": "AXA France",
  "place": { "fr": "Wasquehal · hybride", "en": "Wasquehal, France · hybrid" },
  "highlights": [{ "fr": "Une réalisation.", "en": "An achievement." }],
  "tags": ["React", { "fr": "Hébergement", "en": "Hosting" }]
}
```

- `kind` : `work` ou `education`.
- `contract` (facultatif) : `permanent`, `fixed-term` ou `freelance`.
- `start` et `end` : `YYYY` ou `YYYY-MM`. Sans `end`, l'entrée est en cours (« Poste actuel » pour un poste).
- Les libellés « CDI », « Diplôme », « aujourd'hui » viennent de `messages/*.json`, pas du contenu.

## Ajouter un projet

Créer `content/projets/<slug>.fr.mdx` et, si possible, `<slug>.en.mdx`. Le slug devient l'ancre de la page (`/fr/projets#<slug>`).

```mdx
---
name: podcleaner-clips
tagline: Découpe les extraits de films notés pendant le visionnage.
status: usable
platforms: [macos, windows]
stack: [Python 3.11/3.12, uv, ffmpeg, Whisper]
repo: https://github.com/IvesPower/podcleaner-clips
license: MIT
install: uv tool install git+https://github.com/IvesPower/podcleaner-clips
order: 1
---

- Un point fort.
- Un autre.
```

- `status` : `in-development`, `usable` ou `archived`. `platforms` : `macos`, `windows`, `linux`.
- `install` est facultatif : sans lui, la page dit que l'installation arrivera avec la première version.
- `order` fixe l'ordre d'affichage (puis le slug en cas d'égalité).
- Seuls `tagline` et le corps changent d'une langue à l'autre. Les autres champs doivent être **identiques** dans les deux fichiers.
- Un projet sans `.en.mdx` s'affiche en français sur la page anglaise, avec `lang="fr"`.

## Ce qui fait échouer le build

Toute erreur lève une `ContentError` qui nomme le fichier et le champ, et le prérendu s'arrête :

- un champ obligatoire manquant ou une valeur hors liste (`status: done`) : `projets/a.fr.mdx: status: Invalid option…` ;
- une date mal formée (`2024-13`) ou une fin avant le début : `parcours.json: 3.end: end is before start` ;
- un champ inconnu (faute de frappe) ;
- un `.en.mdx` sans `.fr.mdx` : `projets/a.en.mdx: missing French source` ;
- un champ neutre différent entre FR et EN : `projets/a.en.mdx: status: differs from the French file` ;
- un fichier MDX mal nommé (`outil.mdx`, `outil.de.mdx`, `Mon outil.fr.mdx`) : `projets/outil.mdx: expected <slug>.fr.mdx or <slug>.en.mdx`. Un slug s'écrit en minuscules, chiffres et tirets.

Les fichiers qui ne sont pas en `.mdx` dans `content/projets/` (un `README.md`, des notes) sont ignorés.

Pour tester un changement sans build complet : `pnpm test` charge le vrai contenu (`lib/content.test.ts`, « loads the real content »).
