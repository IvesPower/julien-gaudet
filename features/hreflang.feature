Feature: Language alternates
  Search engines find each page in both languages.

  Scenario: A page lists its alternates and canonical URL
    When I open "/fr/conferences"
    Then the "en" alternate link ends with "/en/talks"
    And the "fr" alternate link ends with "/fr/conferences"
    And the "x-default" alternate link ends with "/"
    And the canonical link ends with "/fr/conferences"
