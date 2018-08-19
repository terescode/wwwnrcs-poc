<?php

namespace Drupal\nrcs_core\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\CurrentRouteMatch;
use Drupal\node\NodeInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a custom block that displays the NRCS page banner.
 *
 * @Block(
 *   id = "nrcs_page_banner",
 *   admin_label = @Translation("NRCS Page Banner"),
 *   category = @Translation("nrcs"),
 * )
 */
class PageBannerBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The current Drupal route.
   *
   * @var \Drupal\Core\Routing\CurrentRouteMatch
   */
  private $currentRoute;

  /**
   * Create a new LandingPageHeaderBlock.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $pluginId
   *   The plugin ID for the plugin instance.
   * @param mixed $pluginDefinition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Routing\CurrentRouteMatch $currentRoute
   *   The current Drupal route.
   */
  public function __construct(
    array $configuration,
    $pluginId,
    $pluginDefinition,
    CurrentRouteMatch $currentRoute
  ) {
    parent::__construct($configuration, $pluginId, $pluginDefinition);
    $this->currentRoute = $currentRoute;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(
    ContainerInterface $container,
    array $configuration,
    $pluginId,
    $pluginDefinition
  ) {
    return new static(
      $configuration,
      $pluginId,
      $pluginDefinition,
      $container->get('current_route_match')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $node = $this->currentRoute->getParameter('node');
    if (!$node || !$node instanceof NodeInterface) {
      return [];
    }

    if (!in_array(
      $node->bundle(),
      ['nrcs_overview_page', 'nrcs_detail_page']
    )) {
      return [];
    }

    $fieldPageHeading = $node
      ->get('field_nrcs_page_heading')
      ->getValue();
    $fieldBackgroundImage = $node
      ->get('field_nrcs_page_banner_image');
    return [
      '#theme' => 'nrcs_page_banner',
      '#heading' => !empty($fieldPageHeading)
      ? $fieldPageHeading[0]['value'] : $node->getTitle(),
      '#image_url' => !$fieldBackgroundImage->isEmpty()
      ? file_create_url($fieldBackgroundImage->entity->getFileUri()) : '',
      '#cache' => [
        'tags' => Cache::mergeTags(
          $this->getCacheTags(),
          $node->getCacheTags()
        ),
        'contexts' => Cache::mergeContexts(
          $this->getCacheContexts(),
          Cache::mergeContexts(
            $node->getCacheContexts(),
            ['url']
          )
        ),
      ],
    ];
  }

}
