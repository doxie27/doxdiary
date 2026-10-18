<?php

declare(strict_types=1);

/**
 * Einziger öffentlicher PHP-Einstieg der API.
 * Entwicklung:  App liegt unter ../src
 * STRATO:       App liegt in doxie-private/app außerhalb des Webroots (siehe docs/05-deployment.md)
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// App-Code suchen: Umgebungsvariable, Repo-Layout (Entwicklung) oder ein Ordner
// doxie-private/app in einem der übergeordneten Verzeichnisse (STRATO).
$candidates = array_filter([getenv('DOXIE_APP_DIR') ?: null, dirname(__DIR__)]);
for ($level = 2; $level <= 5; $level++) {
    $candidates[] = dirname(__DIR__, $level) . '/doxie-private/app';
}
foreach ($candidates as $dir) {
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

$app = new Doxie\App(doxie_config());
$app->handle()->send();
// Antwort sofort ausliefern, danach ggf. Wartung (STRATO hat keine Cronjobs)
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}
$app->afterResponse();
