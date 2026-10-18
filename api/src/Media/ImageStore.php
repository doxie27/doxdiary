<?php

declare(strict_types=1);

namespace Doxie\Media;

use Doxie\Http\HttpException;

/**
 * Prüft hochgeladene Bilder und speichert sie neu kodiert außerhalb des Webroots.
 * Durch das Neu-Kodieren gehen EXIF-Daten (inkl. GPS) verloren und eventuell
 * eingeschleuster Code im Bild wird entfernt.
 */
final class ImageStore
{
    private const MAX_BYTES = 10 * 1024 * 1024;
    private const MAX_PIXELS = 40_000_000;
    private const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

    public function __construct(private readonly string $dir, private readonly int $maxEdge = 1600)
    {
    }

    /**
     * @param array<string, mixed>|null $upload Eintrag aus $_FILES
     * @return array{storage_key: string, mime: string, bytes: int, width: int, height: int}
     */
    public function storeUpload(?array $upload): array
    {
        $fail = static fn (string $msg) => HttpException::validation(['photo' => $msg]);
        if (!$upload || !isset($upload['error'], $upload['tmp_name']) || is_array($upload['error'])) {
            throw $fail('Bitte ein Foto auswählen.');
        }
        if ($upload['error'] === UPLOAD_ERR_INI_SIZE || $upload['error'] === UPLOAD_ERR_FORM_SIZE) {
            throw $fail('Das Foto ist zu groß (max. 10 MB).');
        }
        if ($upload['error'] !== UPLOAD_ERR_OK || !is_uploaded_file((string) $upload['tmp_name'])) {
            throw $fail('Der Upload ist fehlgeschlagen. Bitte erneut versuchen.');
        }
        $tmp = (string) $upload['tmp_name'];
        if (filesize($tmp) > self::MAX_BYTES) {
            throw $fail('Das Foto ist zu groß (max. 10 MB).');
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($tmp);
        if (!in_array($mime, self::ALLOWED, true)) {
            throw $fail('Bitte ein JPEG-, PNG- oder WebP-Bild hochladen.');
        }
        $info = @getimagesize($tmp);
        if ($info === false || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > self::MAX_PIXELS) {
            throw $fail('Das Bild konnte nicht gelesen werden.');
        }

        $src = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($tmp),
            'image/png' => @imagecreatefrompng($tmp),
            'image/webp' => @imagecreatefromwebp($tmp),
        };
        if ($src === false) {
            throw $fail('Das Bild konnte nicht gelesen werden.');
        }
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $src = $this->applyOrientation($src, (int) (@exif_read_data($tmp)['Orientation'] ?? 1));
        }

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, $this->maxEdge / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        // Transparenz auf hellen Hintergrund legen (Ausgabe ist JPEG)
        imagefill($dst, 0, 0, imagecolorallocate($dst, 246, 242, 234));
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($src);

        if (!is_dir($this->dir)) {
            mkdir($this->dir, 0700, true);
        }
        $key = bin2hex(random_bytes(20));
        $path = $this->path($key);
        if (!imagejpeg($dst, $path, 85)) {
            throw new \RuntimeException('Bild konnte nicht gespeichert werden');
        }
        imagedestroy($dst);
        chmod($path, 0600);

        return ['storage_key' => $key, 'mime' => 'image/jpeg', 'bytes' => (int) filesize($path), 'width' => $nw, 'height' => $nh];
    }

    public function path(string $key): string
    {
        if (!preg_match('/^[a-f0-9]{40}$/', $key)) {
            throw new \InvalidArgumentException('Ungültiger Schlüssel');
        }
        return $this->dir . '/' . substr($key, 0, 2) . '-' . $key . '.jpg';
    }

    public function delete(string $key): void
    {
        $p = $this->path($key);
        if (is_file($p)) {
            unlink($p);
        }
    }

    private function applyOrientation(\GdImage $img, int $orientation): \GdImage
    {
        $rotated = match ($orientation) {
            3 => imagerotate($img, 180, 0),
            6 => imagerotate($img, -90, 0),
            8 => imagerotate($img, 90, 0),
            default => $img,
        };
        return $rotated === false ? $img : $rotated;
    }
}
