(function ($, Drupal) {
  Drupal.behaviors.cmisCkeditorLink = {
    attach: function(context, settings) {
      var $context = $(context);
      $context.find('#cmis-editor-link-dialog-form')
        .once('cmisEditorDialogLink')
        .each(function () {
          var $form = $(this),
            cmisConfig = $form.attr('data-cmis-config');
          if (!cmisConfig) {
            return;
          }
          if ($form && !$form.attr('data-processed')) {
            $form.attr('data-processed', 'processed');
            var ajax = Drupal.ajax({
              url: '/cmis/browser/nojs/' + cmisConfig + '?type=popup',
              progress: {
                type: 'throbber',
                message: 'Connecting to CMIS server...'
              },
              element: this
            });
            ajax.execute();
          }
        });
      $context.find('.cmis-field-insert', context).click(function() {
        var cmisName = $(this).attr('id');
        var cmisPath = $(this).attr('name');
        $('.edit-field-cmis-field').val(cmisName);
        $('.edit-field-cmis-path').val(cmisPath);
        $(window).trigger('editor:dialogsave', {
          text: cmisPath,
          attributes: {
            href: cmisName
          }
        });
        Drupal.dialog('#drupal-modal').close();
        return false;
      });
    },
    detach: function detach(context, settings, trigger) {
    }
  };
}(jQuery, Drupal));
