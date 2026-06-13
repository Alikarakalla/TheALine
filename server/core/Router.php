<?php
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/Response.php';

// Tiny pattern router. Patterns use {param} segments, e.g. "products/{id}".
class Router
{
    /** @var array<int,array{method:string,parts:array,handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'parts' => explode('/', trim($pattern, '/')),
            'handler' => $handler,
        ];
    }

    public function get(string $p, callable $h): void { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void { $this->add('POST', $p, $h); }
    public function put(string $p, callable $h): void { $this->add('PUT', $p, $h); }
    public function patch(string $p, callable $h): void { $this->add('PATCH', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    public function dispatch(): void
    {
        $method = Request::method();
        $path = Request::path();
        $segments = $path === '' ? [] : explode('/', $path);

        $matchedPath = false;
        foreach ($this->routes as $r) {
            if (count($r['parts']) !== count($segments)) {
                continue;
            }
            $params = [];
            $ok = true;
            foreach ($r['parts'] as $i => $part) {
                if (strlen($part) > 1 && $part[0] === '{') {
                    $params[trim($part, '{}')] = $segments[$i];
                } elseif ($part !== $segments[$i]) {
                    $ok = false;
                    break;
                }
            }
            if (!$ok) {
                continue;
            }
            $matchedPath = true;
            if ($r['method'] === $method) {
                ($r['handler'])($params);
                return;
            }
        }
        if ($matchedPath) {
            Response::error('Method not allowed', 405);
        }
        Response::error('Not found: ' . $path, 404);
    }
}
