<?php

declare(strict_types=1);

namespace Doxie\Http;

/** Minimaler Router: Methode + Pfadmuster mit {platzhaltern}. */
final class Router
{
    /** @var list<array{string, string, callable(Request): Response, bool}> */
    private array $routes = [];

    /** @param callable(Request): Response $handler */
    public function add(string $method, string $pattern, callable $handler, bool $auth = true): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler, $auth];
    }

    /** @return array{callable(Request): Response, bool} */
    public function match(Request $request): array
    {
        $allowed = false;
        foreach ($this->routes as [$method, $regex, $handler, $auth]) {
            if (!preg_match($regex, $request->path, $m)) {
                continue;
            }
            if ($method !== $request->method) {
                $allowed = true;
                continue;
            }
            $request->params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            return [$handler, $auth];
        }
        if ($allowed) {
            throw new HttpException(405, 'method_not_allowed', 'Methode nicht erlaubt.');
        }
        throw HttpException::notFound();
    }
}
