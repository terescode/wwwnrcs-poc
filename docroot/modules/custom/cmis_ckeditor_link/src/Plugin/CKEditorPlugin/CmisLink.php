<?php

namespace Drupal\cmis_ckeditor_link\Plugin\CKEditorPlugin;

/**
 * @file
 * CKEditor CMIS link plugin.
 */

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\ckeditor\CKEditorPluginBase;
use Drupal\editor\Entity\Editor;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Defines the "CmisLink" CKEditor plugin.
 *
 * @CKEditorPlugin(
 *   id = "cmislink",
 *   label = @Translation("CMIS Link")
 * )
 */
class CmisLink extends CKEditorPluginBase implements ContainerFactoryPluginInterface {

  /**
   * Constructs a CmisLink object.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param array $plugin_definition
   *   The plugin implementation definition.
   */
  public function __construct(
    array $configuration,
    $plugin_id,
    array $plugin_definition
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(
    ContainerInterface $container,
    array $configuration,
    $plugin_id,
    $plugin_definition
  ) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition
    );
  }

  /**
   * {@inheritdoc}
   */
  public function isInternal() {
    return FALSE;
  }

  /**
   * {@inheritdoc}
   */
  public function getFile() {
    return drupal_get_path('module', 'cmis_ckeditor_link') . '/js/plugins/cmislink/plugin.js';
  }

  /**
   * {@inheritdoc}
   */
  public function getButtons() {
    return [
      'CmisLink' => [
        'label' => t('External Document Link'),
        'image' => drupal_get_path('module', 'cmis_ckeditor_link') . '/js/plugins/cmislink/icons/cmislink.png',
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getConfig(Editor $editor) {
    $configs = cmis_get_configurations();
    unset($configs['_none']);
    reset($configs);
    return [
      'cmisConfig' => (
        !empty($configs) ? key($configs) : ''
      ),
    ];
  }

}
