<?php

declare(strict_types=1);

namespace Doxie\Support;

use Doxie\Http\HttpException;

/**
 * Serverseitige Validierung. Sammelt alle Fehler und wirft am Ende eine
 * 422-Antwort mit Meldungen je Feld. Gibt bereinigte, typisierte Werte zurück.
 */
final class Validator
{
    /** @var array<string, string> */
    private array $errors = [];

    /** @param array<string, mixed> $input */
    public function __construct(private readonly array $input)
    {
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->input);
    }

    public function string(string $key, int $min, int $max, bool $multiline = false): string
    {
        $raw = $this->input[$key] ?? '';
        if (!is_string($raw)) {
            $this->fail($key, 'Ungültiger Wert.');
            return '';
        }
        // Steuerzeichen entfernen (Zeilenumbrüche nur bei mehrzeiligen Feldern erlauben)
        $value = preg_replace($multiline ? '/[^\P{C}\n\t]/u' : '/\p{C}/u', '', $raw);
        if ($value === null) {
            $this->fail($key, 'Ungültige Zeichen.');
            return '';
        }
        $value = trim($value);
        $len = mb_strlen($value);
        if ($len < $min) {
            $this->fail($key, $min === 1 ? 'Bitte ausfüllen.' : "Mindestens {$min} Zeichen.");
        } elseif ($len > $max) {
            $this->fail($key, "Höchstens {$max} Zeichen.");
        }
        return $value;
    }

    public function email(string $key): string
    {
        $value = mb_strtolower($this->string($key, 1, 254));
        if (!isset($this->errors[$key]) && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->fail($key, 'Bitte eine gültige E-Mail-Adresse eingeben.');
        }
        return $value;
    }

    /** Passwörter werden nicht getrimmt; Länge in Zeichen, Obergrenze schützt vor teurem Hashing. */
    public function password(string $key, int $min = 10): string
    {
        $value = $this->input[$key] ?? '';
        if (!is_string($value)) {
            $this->fail($key, 'Ungültiger Wert.');
            return '';
        }
        if (mb_strlen($value) < $min) {
            $this->fail($key, "Das Passwort braucht mindestens {$min} Zeichen.");
        } elseif (strlen($value) > 1024) {
            $this->fail($key, 'Das Passwort ist zu lang.');
        }
        return $value;
    }

    public function number(string $key, float $min, float $max): float
    {
        $value = $this->input[$key] ?? null;
        if (!is_int($value) && !is_float($value)) {
            $this->fail($key, 'Bitte eine Zahl angeben.');
            return 0.0;
        }
        if ($value < $min || $value > $max) {
            $this->fail($key, sprintf('Bitte einen Wert zwischen %s und %s angeben.', $min, $max));
        }
        return (float) $value;
    }

    /** Ganzzahl oder null (z. B. optionale Wiederholungen). */
    public function nullableInt(string $key, int $min, int $max): ?int
    {
        $value = $this->input[$key] ?? null;
        if ($value === null) {
            return null;
        }
        if (!is_int($value) || $value < $min || $value > $max) {
            $this->fail($key, "Bitte eine ganze Zahl zwischen {$min} und {$max} angeben.");
            return null;
        }
        return $value;
    }

    /** ISO-8601-Zeitpunkt (z. B. 2026-10-18T07:30:00.000Z) → UTC-DATETIME. */
    public function datetime(string $key): string
    {
        $value = $this->input[$key] ?? '';
        try {
            $d = is_string($value) && $value !== '' ? new \DateTimeImmutable($value) : null;
        } catch (\Exception) {
            $d = null;
        }
        if ($d === null || $d->getTimestamp() > time() + 600 || $d->getTimestamp() < time() - 3 * 365 * 86400) {
            $this->fail($key, 'Ungültiger Zeitpunkt.');
            return gmdate('Y-m-d H:i:s');
        }
        return $d->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }

    /**
     * Liste von Strings (z. B. Hilfsmittel), bereinigt und dedupliziert.
     * @return list<string>
     */
    public function stringList(string $key, int $maxItems, int $maxLen): array
    {
        $value = $this->input[$key] ?? [];
        if (!is_array($value) || count($value) > $maxItems) {
            $this->fail($key, "Höchstens {$maxItems} Einträge.");
            return [];
        }
        $out = [];
        foreach ($value as $v) {
            $v = is_string($v) ? trim((string) preg_replace('/\p{C}/u', '', $v)) : '';
            if ($v !== '' && mb_strlen($v) <= $maxLen && !in_array($v, $out, true)) {
                $out[] = $v;
            }
        }
        return $out;
    }

    /** @return list<mixed> Rohliste (Einträge werden einzeln validiert) */
    public function list(string $key, int $maxItems): array
    {
        $value = $this->input[$key] ?? [];
        if (!is_array($value) || !array_is_list($value) || count($value) > $maxItems) {
            $this->fail($key, "Höchstens {$maxItems} Einträge.");
            return [];
        }
        return $value;
    }

    /** @return array<string, string> */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * @template T of string
     * @param list<T> $allowed
     * @return T
     */
    public function enum(string $key, array $allowed): string
    {
        $value = $this->input[$key] ?? null;
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            $this->fail($key, 'Ungültige Auswahl.');
            return $allowed[0];
        }
        return $value;
    }

    public function nullableBool(string $key): ?bool
    {
        $value = $this->input[$key] ?? null;
        if ($value !== null && !is_bool($value)) {
            $this->fail($key, 'Ungültiger Wert.');
            return null;
        }
        return $value;
    }

    public function accepted(string $key, string $message): void
    {
        if (($this->input[$key] ?? false) !== true) {
            $this->fail($key, $message);
        }
    }

    /** ISO-Datum (YYYY-MM-DD), optional nicht in der Zukunft. */
    public function date(string $key, bool $notInFuture = true, string $earliest = '1980-01-01'): string
    {
        $value = $this->input[$key] ?? '';
        $d = is_string($value) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if ($d === false || $d->format('Y-m-d') !== $value) {
            $this->fail($key, 'Bitte ein gültiges Datum angeben.');
            return '';
        }
        if ($notInFuture && $value > gmdate('Y-m-d', time() + 86400)) {
            $this->fail($key, 'Das Datum liegt in der Zukunft.');
        } elseif ($value < $earliest) {
            $this->fail($key, 'Das Datum liegt zu weit zurück.');
        }
        return $value;
    }

    public function fail(string $key, string $message): void
    {
        $this->errors[$key] ??= $message;
    }

    public function validate(): void
    {
        if ($this->errors) {
            throw HttpException::validation($this->errors);
        }
    }
}
