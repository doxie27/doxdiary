<?php
// mod_rewrite-Test: Ordner hochladen und /rewrite-test/irgendwas aufrufen.
// Erscheint „mod_rewrite funktioniert“, ist alles bereit. Danach Ordner löschen.
header('Content-Type: text/plain; charset=utf-8');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
echo str_ends_with((string) $path, '/rewrite-test/') || str_ends_with((string) $path, '/index.php')
    ? "Bitte /rewrite-test/irgendwas aufrufen.\n"
    : "mod_rewrite funktioniert ✔\n";
