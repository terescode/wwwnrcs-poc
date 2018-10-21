(function ($, Drupal, drupalSettings, CKEDITOR) {
  CKEDITOR.plugins.add('cmislink', {
    icons: 'cmislink',
    init: function(editor) {
      editor.addCommand('CmisLink', {
        allowedContent: {
          a: {
            attributes: {
              '!href': true
            },
            classes: {}
          }
        },
        requiredContent: new CKEDITOR.style({
          element: 'a',
          attributes: {
            href: ''
          }
        }),
        modes: { wysiwyg: 1 },
        canUndo: true,
        exec: function(editor) {
          var drupalImageUtils = CKEDITOR.plugins.drupalimage;
          var focusedImageWidget
            = drupalImageUtils && drupalImageUtils.getFocusedWidget(editor);
          var linkElement = getSelectedLink(editor);
          var cmisConfig = editor.config.cmisConfig;

          if (!cmisConfig) {
            alert(Drupal.t(
              'You must create a CMIS configuration before external document links can be created.'
            ));
            return;
          }

          var existingValues = {};
          if (linkElement && linkElement.$) {
            existingValues = parseAttributes(editor, linkElement);
          } else if (focusedImageWidget && focusedImageWidget.data.link) {
            existingValues = CKEDITOR.tools.clone(focusedImageWidget.data.link);
          }

          var saveCallback = function saveCallback(returnValues) {
            if (focusedImageWidget) {
              focusedImageWidget.setData(
                'link',
                CKEDITOR.tools.extend(
                  returnValues.attributes,
                  focusedImageWidget.data.link
                )
              );
              editor.fire('saveSnapshot');
              return;
            }

            editor.fire('saveSnapshot');

            if (returnValues.attributes.href) {
              returnValues.attributes.href
                = '/cmis/document/' + cmisConfig + '/'
                  + returnValues.attributes.href
            }
            if (!linkElement && returnValues.attributes.href) {
              var range = getSelectionRange(editor);

              if (range.collapsed) {
                var text = new CKEDITOR.dom.text(
                  returnValues.text,
                  editor.document
                );
                range.insertNode(text);
                range.selectNodeContents(text);
              }

              var style = new CKEDITOR.style({
                element: 'a',
                attributes: returnValues.attributes
              });
              style.type = CKEDITOR.STYLE_INLINE;
              style.applyToRange(range);
              range.select();

              linkElement = getSelectedLink(editor);
            } else if (linkElement) {
              Object.keys(returnValues.attributes || {}).forEach(
                function (attrName) {
                  if (returnValues.attributes[attrName].length > 0) {
                    var value = returnValues.attributes[attrName];
                    linkElement.data('cke-saved-' + attrName, value);
                    linkElement.setAttribute(attrName, value);
                  } else {
                    linkElement.removeAttribute(attrName);
                  }
                }
              );
            }

            editor.fire('saveSnapshot');
          };

          var dialogSettings = {
            title: linkElement
              ? editor.config.drupalLink_dialogTitleEdit
              : editor.config.drupalLink_dialogTitleAdd,
            dialogClass: 'editor-link-dialog editor-cmis-link-dialog',
            cmisConfig: cmisConfig
          };

          Drupal.ckeditor.openDialog(
            editor,
            Drupal.url('cmis_ckeditor_link/dialog/link/' + editor.config.drupal.format),
            existingValues,
            saveCallback,
            dialogSettings
          );
        }
      });

      editor.ui.addButton('CmisLink', {
        label: Drupal.t('External Document Link'),
        command: 'CmisLink'
      });

      editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.SHIFT + 75, 'CmisLink');
    }
  });

  function getSelectionRange(editor) {
    var selection = editor.getSelection();
    var ranges = selection.getRanges(true);

    if (ranges.length === 0) {
      range = editor.createRange();
      range.root.equals( editor.editable() );
      return range;
    }

    return ranges[0]
  }

  function parseAttributes(editor, element) {
    var parsedAttributes = {};

    var domElement = element.$;
    var attribute = void 0;
    var attributeName = void 0;
    for (
      var attrIndex = 0;
      attrIndex < domElement.attributes.length;
      attrIndex++
    ) {
      attribute = domElement.attributes.item(attrIndex);
      attributeName = attribute.nodeName.toLowerCase();

      if (attributeName.indexOf('data-cke-') === 0) {
        continue;
      }

      parsedAttributes[attributeName]
        = element.data('cke-saved-' + attributeName) || attribute.nodeValue;
    }

    if (parsedAttributes.class) {
      parsedAttributes.class
        = CKEDITOR.tools.trim(parsedAttributes.class.replace(/cke_\S+/, ''));
    }

    return parsedAttributes;
  }

  function getSelectedLink(editor) {
    var selection = editor.getSelection();
    var selectedElement = selection.getSelectedElement();
    if (selectedElement && selectedElement.is('a')) {
      return selectedElement;
    }

    var range = selection.getRanges(true)[0];

    if (range) {
      range.shrink(CKEDITOR.SHRINK_TEXT);
      return editor.elementPath(range.getCommonAncestor()).contains('a', 1);
    }
    return null;
  }

  CKEDITOR.plugins.cmislink = {};
})(jQuery, Drupal, drupalSettings, CKEDITOR);
