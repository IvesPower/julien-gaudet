Feature: Page not found
  An unknown URL shows a 404 page in the visitor's language.

  Scenario Outline: Unknown page in a known language
    When I open "<path>"
    Then the response status is 404
    And the main heading is "<heading>"
    And the page language is "<lang>"

    Examples:
      | path    | heading          | lang |
      | /fr/nope | Page introuvable | fr   |
      | /en/nope | Page not found   | en   |

  Scenario: Unknown page without a language
    Given my browser language is "en"
    When I open "/nope"
    Then the URL path is "/en/nope"
    And the response status is 404
    And the main heading is "Page not found"
