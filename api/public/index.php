<?php

declare(strict_types=1);

/**
 * Einziger öffentlicher PHP-Einstieg der API.
 * Entwicklung:  App liegt unter ../src
 * STRATO:       App liegt unter <home>/doxie-private/app/src (siehe docs/05-deployment.md)
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$appDir = getenv('DOXIE_APP_DIR') ?: null;
foreach (array_filter([$appDir, dirname(__DIR__), dirname(__DIR__, 2) . '/doxie-private/app']) as $dir) {
    if (is_file($dir . '/src/bootstrap.php')) {
        require $dir . '/src/bootstrap.php';
        break;
    }
}
if (!function_exists('doxie_config')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo '{"error":{"code":"server_error","message":"Server ist nicht vollständig eingerichtet."}}';
    exit;
}

(new Doxie\App(doxie_config()))->handle()->send();
