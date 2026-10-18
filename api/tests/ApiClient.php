<?php

declare(strict_types=1);

namespace Doxie\Tests;

/** HTTP-Client für Tests mit eigenem Cookie-Speicher (= eigenes „Gerät“). */
final class ApiClient
{
    private \CurlHandle $curl;
    public ?string $csrf = null;
    public ?string $origin = null;

    public function __construct()
    {
        $this->curl = curl_init();
        curl_setopt($this->curl, CURLOPT_COOKIEFILE, '');
        curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curl, CURLOPT_HEADER, true);
    }

    public function get(string $path): ApiResponse
    {
        return $this->request('GET', $path);
    }

    public function post(string $path, array $body = []): ApiResponse
    {
        return $this->request('POST', $path, $body);
    }

    public function patch(string $path, array $body): ApiResponse
    {
        return $this->request('PATCH', $path, $body);
    }

    public function delete(string $path): ApiResponse
    {
        return $this->request('DELETE', $path);
    }

    public function upload(string $path, string $file, string $field = 'photo'): ApiResponse
    {
        return $this->request('POST', $path, null, [$field => new \CURLFile($file)]);
    }

    public function fetchCsrf(): void
    {
        $this->csrf = $this->get('/auth/csrf')->json['csrfToken'];
    }

    /** Registriert ein neues Konto und bleibt angemeldet. */
    public function register(string $email, string $password = 'ein-sicheres-passwort'): ApiResponse
    {
        $this->fetchCsrf();
        $res = $this->post('/auth/register', ['firstName' => 'Test', 'email' => $email, 'password' => $password, 'privacyAccepted' => true]);
        $this->csrf = $res->json['csrfToken'] ?? $this->csrf;
        return $res;
    }

    public function login(string $email, string $password): ApiResponse
    {
        $this->fetchCsrf();
        $res = $this->post('/auth/login', ['email' => $email, 'password' => $password]);
        $this->csrf = $res->json['csrfToken'] ?? $this->csrf;
        return $res;
    }

    public function cookie(string $name): ?string
    {
        foreach (curl_getinfo($this->curl, CURLINFO_COOKIELIST) as $line) {
            $parts = explode("\t", $line);
            if (($parts[5] ?? null) === $name) {
                return $parts[6] ?? null;
            }
        }
        return null;
    }

    private function request(string $method, string $path, ?array $json = null, ?array $multipart = null): ApiResponse
    {
        $headers = [];
        if ($this->csrf !== null && $method !== 'GET') {
            $headers[] = 'X-CSRF-Token: ' . $this->csrf;
        }
        if ($this->origin !== null) {
            $headers[] = 'Origin: ' . $this->origin;
        }
        curl_setopt($this->curl, CURLOPT_URL, DOXIE_TEST_BASE . $path);
        curl_setopt($this->curl, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($this->curl, CURLOPT_HTTPGET, $method === 'GET');
        if ($multipart !== null) {
            curl_setopt($this->curl, CURLOPT_POSTFIELDS, $multipart);
        } elseif ($method !== 'GET') {
            $headers[] = 'Content-Type: application/json';
            curl_setopt($this->curl, CURLOPT_POSTFIELDS, json_encode($json ?? new \stdClass()));
        }
        curl_setopt($this->curl, CURLOPT_HTTPHEADER, $headers);
        $raw = (string) curl_exec($this->curl);
        $status = (int) curl_getinfo($this->curl, CURLINFO_RESPONSE_CODE);
        $headerSize = (int) curl_getinfo($this->curl, CURLINFO_HEADER_SIZE);
        return new ApiResponse($status, substr($raw, 0, $headerSize), substr($raw, $headerSize));
    }
}
