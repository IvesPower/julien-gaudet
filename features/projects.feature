Feature: Projects page
  Every project from the content files is shown in full on one page, with an
  anchor to share a direct link.

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
      | path         | heading  | usable     | dev              | github          | podcast     |
      | /fr/projets  | Projets  | Utilisable | En développement | Voir sur GitHub | /fr/podcast |
      | /en/projects | Projects | Usable     | In development   | View on GitHub  | /en/podcast |

  Scenario: Share a direct link to a project
    When I open "/fr/projets#podcleaner-editor"
    Then the project "podcleaner-editor" shows "Raccourcit les blancs de plus d’une seconde."
