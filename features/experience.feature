Feature: Experience page
  The timeline lists jobs and education from the content files, newest first.

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
