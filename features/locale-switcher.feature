Feature: Language switcher
  The switcher leads to the same page in the other language and the choice
  is remembered for the root URL.

  Scenario Outline: Switch to the equivalent page
    When I open "<from>"
    And I click the link "<label>"
    Then the URL path is "<to>"

    Examples:
      | from             | label    | to                   |
      | /fr/conferences  | English  | /en/talks            |
      | /en/legal-notice | Français | /fr/mentions-legales |

  Scenario: The chosen language is remembered
    Given my browser language is "fr"
    When I open "/fr"
    And I click the link "English"
    And I open "/"
    Then the URL path is "/en"
