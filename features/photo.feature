Feature: Photo page
  Every photo from the content file is shown uncropped on one page, with an
  anchor to share a direct link.

  Scenario Outline: Browse the photos
    When I open "<path>"
    Then the main heading is "<heading>"
    And the page shows as many photos as the content file
    And every photo has a non-empty alternative text
    And the page contains "<copyright>"
    And the page has no accessibility violations

    Examples:
      | path     | heading            | copyright                                     |
      | /fr/photo | Derrière l’objectif. | © Julien Gaudet, tous droits réservés.        |
      | /en/photo | Behind the lens.   | © Julien Gaudet, all rights reserved.         |

  Scenario: Photos are never cropped
    When I open "/fr/photo"
    Then the first portrait photo keeps its ratio
    And the first landscape photo keeps its ratio

  Scenario: Share a direct link to a photo
    When I open the photo page at the second photo's anchor
    Then the second photo is shown

  Scenario: Photos fit a phone screen
    Given the viewport is 390 pixels wide
    When I open "/fr/photo"
    Then the first photo fits the viewport width and keeps its ratio
