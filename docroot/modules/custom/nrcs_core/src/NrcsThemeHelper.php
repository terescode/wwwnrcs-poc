<?php

namespace Drupal\nrcs_core;

/**
 * @file
 * NRCS Core theme helper methods/hooks.
 */

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Template\Attribute;

/**
 * NrcsThemeHelper provides preprocessing and custom code for the nrcs theme.
 */
class NrcsThemeHelper {

  use StringTranslationTrait;

  /**
   * Drupal config factory.
   *
   * @var \Drupal\Core\Config\ConfigFactoryInterface
   */
  private $configFactory;

  /**
   * Drupal entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  private $entityTypeManager;

  /**
   * NRCS path helper.
   *
   * @var \Drupal\nrcs_core\NrcsPathHelper
   */
  private $pathHelper;

  /**
   * Create a new NrcsThemeHelper service.
   *
   * @param \Drupal\Core\Config\ConfigFactoryInterface $configFactory
   *   The Drupal entity type manager.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entityTypeManager
   *   The Drupal entity type manager.
   * @param \Drupal\nrcs_core\NrcsPathHelper $pathHelper
   *   The NRCS path helper.
   */
  public function __construct(
    ConfigFactoryInterface $configFactory,
    EntityTypeManagerInterface $entityTypeManager,
    NrcsPathHelper $pathHelper
  ) {
    $this->configFactory = $configFactory;
    $this->entityTypeManager = $entityTypeManager;
    $this->pathHelper = $pathHelper;
  }

  /**
   * Implements hook_theme().
   */
  public function hookTheme($existing, $type, $theme, $path) {
    return [
      'nrcs_page_banner' => [
        'variables' => [
          'heading' => '',
          'image_url' => '',
        ],
      ],
      'nrcs_primary_navigation' => [
        'variables' => [
          'links' => [],
        ],
      ],
    ];
  }

  /**
   * Implements hook_preprocess_HOOK().
   */
  public function hookPreprocessBlock(&$variables) {
    if (isset($variables['elements']['#id'])) {
      $blockStorage = $this->entityTypeManager->getStorage('block');
      $region = $blockStorage->load($variables['elements']['#id'])->getRegion();
      $variables['content']['#attributes']['region'] = $region;
    }
  }

  /**
   * Implements hook_preprocess_HOOK().
   */
  public function hookPreprocessSystemBrandingBlock(&$variables) {
    $node = $this->pathHelper->getCurrentNode();
    if ($node === NULL) {
      return;
    }

    $siteConfig = $this->configFactory->get('system.site');
    $siteInfo = $this->pathHelper->getSiteInfo($node);
    $variables['site_name'] = $this->t(
      '@site_name | @site',
      [
        '@site_name' => $siteConfig->get('name'),
        '@site' => $siteInfo['title'],
      ]
    );

    $variables['#cache']['contexts'][] = 'url.path';
  }

  /**
   * Implements hook_preprocess_HOOK().
   */
  public function hookPreprocessRegionFooterSecondary(&$variables) {
    $node = $this->pathHelper->getCurrentNode();
    if ($node === NULL) {
      return;
    }

    $siteConfig = $this->configFactory->get('system.site');
    $siteInfo = $this->pathHelper->getSiteInfo($node);
    $variables['site_name'] = $this->t(
      '@site_name | @site',
      [
        '@site_name' => $siteConfig->get('name'),
        '@site' => $siteInfo['title'],
      ]
    );
    $variables['site_slogan'] = $siteConfig->get('slogan');
  }

  /**
   * Implements hook_preprocess_HOOK().
   */
  public function hookPreprocessParagraphCallToAction(
    array &$variables
  ) {
    if (!empty($variables['content']['field_nrcs_cta_link'])) {
      $attributes = new Attribute();
      $attributes->addClass('usa-button');
      if ($variables['view_mode'] === 'nrcs_hero_callout_view') {
        $attributes->addClass('usa-button-big');
      }
      $variables['content']['field_nrcs_cta_link'][0]['#attributes']
        = $attributes->toArray();
    }
  }

  /**
   * Implements hook_theme_suggestions_HOOK_alter().
   */
  public function hookThemeSuggestionsMenuAlter(
    &$suggestions,
    array $variables
  ) {
    if (isset($variables['attributes']['region'])) {
      $suggestions[] = 'menu__' . $variables['menu_name'] . '__' .
        $variables['attributes']['region'];
    }
  }

}
