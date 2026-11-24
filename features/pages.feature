Feature: Skeleton pages
  Every page exists in both languages, with its title, the right language
  and no accessibility violation.

  Scenario Outline: Open a page
    When I open "<path>"
    Then the response status is 200
    And the main heading is "<heading>"
    And the page language is "<lang>"
    And the page has no accessibility violations

    Examples:
      | path                 | heading          | lang |
      | /fr                  | Julien Gaudet    | fr   |
      | /en                  | Julien Gaudet    | en   |
      | /fr/parcours         | Parcours         | fr   |
      | /en/experience       | Experience       | en   |
      | /fr/projets          | Projets          | fr   |
      | /en/projects         | Projects         | en   |
      | /fr/conferences      | Conférences      | fr   |
      | /en/talks            | Talks            | en   |
      | /fr/podcast          | Pizza Ananar     | fr   |
      | /en/podcast          | Pizza Ananar     | en   |
      | /fr/mentions-legales | Mentions légales | fr   |
      | /en/legal-notice     | Legal notice     | en   |

  Scenario Outline: A detail page without content is not found
    When I open "<path>"
    Then the response status is 404
    And the main heading is "<heading>"
    And the page language is "<lang>"

    Examples:
      | path                  | heading          | lang |
      | /fr/projets/anything  | Page introuvable | fr   |
      | /en/talks/anything    | Page not found   | en   |

  Scenario: The skip link is the first thing the keyboard reaches
    When I open "/fr"
    And I press "Tab"
    Then the focused element is the link "Aller au contenu"
