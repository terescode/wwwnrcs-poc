<?php

namespace Drupal\nrcs_core;

/**
 * @file
 * NRCS Taxonomy Path Token service.
 */

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Path\AliasManagerInterface;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\node\NodeInterface;

/**
 * NrcsPathHelper provides logic related to NRCS page paths.
 */
class NrcsPathHelper {

  const NRCS_PAGE_PATH_TOKEN = 'nrcs_page_path';

  /**
   * Drupal entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  private $entityTypeManager;

  /**
   * The current Drupal route.
   *
   * @var \Drupal\Core\Routing\CurrentRouteMatch
   */
  private $currentRoute;

  /**
   * The Drupal alias manager.
   *
   * @var \Drupal\Core\Path\AliasManagerInterface
   */
  private $aliasManager;

  /**
   * The Drupal language manager.
   *
   * @var \Drupal\Core\Language\LanguageManagerInterface
   */
  private $languageManager;

  /**
   * Create a new NrcsPathHelper service.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entityTypeManager
   *   The Drupal entity type manager.
   * @param \Drupal\Core\Routing\CurrentRouteMatch $currentRoute
   *   The current Drupal route.
   * @param \Drupal\Core\Path\AliasManagerInterface $aliasManager
   *   The Drupal alias manager.
   * @param \Drupal\Core\Language\LanguageManagerInterface $languageManager
   *   The Drupal language manager.
   */
  public function __construct(
    EntityTypeManagerInterface $entityTypeManager,
    CurrentRouteMatch $currentRoute,
    AliasManagerInterface $aliasManager,
    LanguageManagerInterface $languageManager
  ) {
    $this->entityTypeManager = $entityTypeManager;
    $this->currentRoute = $currentRoute;
    $this->aliasManager = $aliasManager;
    $this->languageManager = $languageManager;
  }

  /**
   * Return the node for the current route or NULL.
   *
   * @return \Drupal\node\NodeInterface|null
   *   The current node or NULL.
   */
  public function getCurrentNode() {
    $node = $this->currentRoute->getParameter('node');
    if (!$node || !$node instanceof NodeInterface) {
      return NULL;
    }
    return $node;
  }

  /**
   * Return the current NRCS subsite information for the given node.
   *
   * @param \Drupal\node\NodeInterface $node
   *   A node instance.
   *
   * @return array
   *   NRCS subsite info.
   */
  public function getSiteInfo(NodeInterface $node) {
    if (!in_array(
      $node->bundle(),
      ['nrcs_home_page', 'nrcs_overview_page', 'nrcs_detail_page']
    )) {
      return [];
    }

    $langcode = $this->languageManager->getCurrentLanguage()->getId();
    $siteInfo = [];
    $siteInfo['alias'] = $this
      ->aliasManager
      ->getAliasByPath('/node/' . $node->id(), $langcode);
    $siteInfo['path'] = (
      $node->bundle() === 'nrcs_home_page'
      ? ''
      : $this->buildPagePath($node)
    );

    $fieldPageSite = $node->get(NrcsFields::PAGE_SITE)->getValue();
    if (!empty($fieldPageSite)) {
      $termId = $fieldPageSite[0]['target_id'];
      $termStorage = $this->entityTypeManager->getStorage('taxonomy_term');
      $term = $termStorage->load($termId);
      $siteInfo['title'] = $term->label();
      $fieldPathSeg = $term->get(NrcsFields::SITE_PATH_SEGMENT)->getValue();
      if (!empty($fieldPathSeg)) {
        $siteInfo['site'] = $fieldPathSeg[0]['value'];
      }
    }

    return $siteInfo;
  }

  /**
   * Generate an nrcs page path for the given $node.
   *
   * @param \Drupal\node\NodeInterface $node
   *   The node.
   *
   * @return string
   *   The replacement string.
   */
  public function buildPagePath(NodeInterface $node) {
    $fieldPagePath = $node->get(NrcsFields::PAGE_PATH)->getValue();
    if (empty($fieldPagePath)) {
      return '';
    }

    $termId = $fieldPagePath[0]['target_id'];
    $termStorage = $this->entityTypeManager->getStorage('taxonomy_term');
    $terms = $termStorage->loadAllParents($termId);
    $path = [];
    foreach (array_reverse($terms) as $parent) {
      $fieldPathSeg = $parent->get(NrcsFields::PATH_SEGMENT)->getValue();
      if (!empty($fieldPathSeg)) {
        $path[] = $fieldPathSeg[0]['value'];
      }
    }
    return implode('/', $path);
  }

}
