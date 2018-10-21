<?php

namespace Drupal\cmis_ckeditor_link\Controller;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\OpenModalDialogCommand;
use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Class CmisLinkDialogController.
 */
class CmisLinkDialogController extends ControllerBase {

  /**
   * Generate ajax response for initial CMIS dialog.
   */
  public function ajaxContent(Request $request) {
    $element['#tree'] = TRUE;
    $element['#attached']['library'][] = 'editor/drupal.editor.dialog';
    $element['#attached']['library'][] = 'core/drupal.dialog.ajax';
    $element['#attached']['library'][] = 'cmis_ckeditor_link/ckeditor-link';

    $dialogOptions = $request->request->get('dialogOptions', []);
    $cmisConfig = !empty($dialogOptions['cmisConfig'])
      ? $dialogOptions['cmisConfig']
      : '';

    $element['cmis_link_form'] = [
      '#type' => 'container',
      '#attributes' => [
        'id' => 'cmis-editor-link-dialog-form',
        'data-cmis-config' => $cmisConfig,
      ],
    ];

    $element['cmis_link_form']['cmis_browser'] = [
      '#theme' => 'cmis_browser',
      '#header' => [],
      '#elements' => [],
      '#breadcrumbs' => [],
      '#operations' => [],
    ];

    $response = new AjaxResponse();
    $response->addCommand(new OpenModalDialogCommand(
      $this->t('Add Document Link'),
      $element,
      $dialogOptions
    ));

    return $response;
  }

}
