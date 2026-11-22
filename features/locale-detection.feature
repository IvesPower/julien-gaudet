Feature: Language detection
  Only the root URL picks a language for the visitor. A URL that already
  carries a language keeps it.

  Scenario Outline: The root URL follows the browser language
    Given my browser language is "<header>"
    When I open "/"
    Then the URL path is "<path>"

    Examples:
      | header       | path |
      | en           | /en  |
      | en-GB        | /en  |
      | fr-FR        | /fr  |
      | fr-CA        | /fr  |
      | de           | /fr  |
      | de, en;q=0.8 | /en  |

  @lot1-pending
  Scenario: A prefixed URL is never redirected to another language
    Given my browser language is "en"
    When I open "/fr/conferences"
    Then the URL path is "/fr/conferences"

  @lot1-pending
  Scenario: Internal pathname in the wrong language
    When I open "/en/conferences"
    Then the URL path is "/en/talks"

  @lot1-pending
  Scenario: Trailing slash
    When I open "/fr/conferences/"
    Then the URL path is "/fr/conferences"
