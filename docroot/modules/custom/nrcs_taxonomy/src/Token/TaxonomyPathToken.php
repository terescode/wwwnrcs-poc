<?php

namespace Drupal\nrcs_taxonomy\Token;

/**
 * @file
 * NRCS Taxonomy Path Token service.
 */

use Drupal\Core\Render\BubbleableMetadata;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\nrcs_core\NrcsPathHelper;

/**
 * TaxonomyPathToken provides logic for the custom nrcs_page_path token.
 */
class TaxonomyPathToken {

  use StringTranslationTrait;

  const NRCS_PAGE_PATH_TOKEN = 'nrcs_page_path';

  /**
   * NRCS path helper.
   *
   * @var \Drupal\nrcs_core\NrcsPathHelper
   */
  private $pathHelper;

  /**
   * Create a new TaxonomyPathToken.
   *
   * @param \Drupal\nrcs_core\NrcsPathHelper $pathHelper
   *   The NRCS path helper.
   */
  public function __construct(
    NrcsPathHelper $pathHelper
  ) {
    $this->pathHelper = $pathHelper;
  }

  /**
   * Implements hook_token_info().
   */
  public function hookTokenInfo() {
    return [
      'tokens' => [
        'node' => [
          'nrcs_page_path' => [
            'name' => $this->t("NRCS Page Path"),
            'description' => $this->t("Generate the NRCS page path."),
          ],
        ],
      ],
    ];
  }

  /**
   * Implements hook_tokens().
   */
  public function hookTokens(
    $type,
    $tokens,
    $data,
    $options,
    BubbleableMetadata $bubbleableMetadata
  ) {
    $replacements = [];
    if ($type === 'node') {
      foreach ($tokens as $name => $original) {
        if ($name === self::NRCS_PAGE_PATH_TOKEN) {
          $replacements[$original] = $this
            ->pathHelper
            ->buildPagePath($data['node']);
          break;
        }
      }
    }
    return $replacements;
  }

}
