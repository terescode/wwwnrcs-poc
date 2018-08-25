<?php

// Automatic Platform.sh settings.
if (file_exists($app_root . '/' . $site_path . '/settings/settings.platformsh.php')) {
  include $app_root . '/' . $site_path . '/settings/settings.platformsh.php';
}
