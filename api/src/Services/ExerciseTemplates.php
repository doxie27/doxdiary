<?php

declare(strict_types=1);

namespace Doxie\Services;

/**
 * Startvorlagen für neue Konten – identisch mit den Beispielübungen im Frontend
 * (src/data/mock.ts). Jede Person kann sie frei ändern oder löschen.
 */
final class ExerciseTemplates
{
    /** @return list<array<string, mixed>> */
    public static function all(): array
    {
        return [
            ['key' => 'sitz-steh', 'name' => 'Sitz-Steh-Wechsel', 'category' => 'kraft', 'reps' => 8, 'sets' => 2, 'duration_sec' => null, 'rest_sec' => 30,
                'description' => 'Aus dem geraden Sitz langsam in den Stand kommen und wieder zurück. Achte auf einen symmetrischen Sitz – beide Hinterbeine eng am Körper.',
                'equipment' => ['Leckerlis'], 'notes' => 'Langsam ist besser als schnell. Lieber weniger saubere Wiederholungen.'],
            ['key' => 'balancekissen', 'name' => 'Stand auf dem Balancekissen', 'category' => 'balance', 'reps' => null, 'sets' => 3, 'duration_sec' => 30, 'rest_sec' => 20,
                'description' => 'Vorderpfoten auf das Kissen stellen, ruhig stehen lassen. Mit einem Leckerli vor der Nase die Position halten.',
                'equipment' => ['Balancekissen', 'Rutschfeste Matte'], 'notes' => 'Kissen nur halb aufpumpen, damit es nicht zu wackelig wird.'],
            ['key' => 'cavaletti', 'name' => 'Cavaletti-Stangen', 'category' => 'wahrnehmung', 'reps' => 6, 'sets' => 1, 'duration_sec' => null, 'rest_sec' => 15,
                'description' => 'Im ruhigen Schritt über 4–6 Bodenstangen führen. Abstand etwa eine Schulterhöhe. Der Hund soll jede Stange bewusst übersteigen.',
                'equipment' => ['Bodenstangen', 'Leine'], 'notes' => ''],
            ['key' => 'dehnung-seite', 'name' => 'Leckerli-Dehnung zur Seite', 'category' => 'mobilitaet', 'reps' => 5, 'sets' => 2, 'duration_sec' => null, 'rest_sec' => 20,
                'description' => 'Im Stand ein Leckerli langsam Richtung Hüfte führen, sodass sich der Hund seitlich biegt. Kurz halten, dann zur anderen Seite.',
                'equipment' => ['Leckerlis'], 'notes' => 'Nur so weit, wie es angenehm ist – kein Ziehen in die Dehnung.'],
            ['key' => 'bergauf', 'name' => 'Ruhiges Bergaufgehen', 'category' => 'ausdauer', 'reps' => null, 'sets' => 1, 'duration_sec' => 300, 'rest_sec' => null,
                'description' => 'Eine sanfte Steigung im langsamen Schritt hinaufgehen. Gleichmäßiges Tempo, kein Ziehen an der Leine.',
                'equipment' => ['Geschirr', 'Leine'], 'notes' => ''],
            ['key' => 'rueckwaerts', 'name' => 'Rückwärtsgehen', 'category' => 'kraft', 'reps' => 5, 'sets' => 1, 'duration_sec' => null, 'rest_sec' => 20,
                'description' => 'In einem schmalen Gang 2–3 Meter langsam rückwärts gehen lassen. Fördert das bewusste Setzen der Hinterpfoten.',
                'equipment' => ['Schmaler Gang oder Begrenzung'], 'notes' => ''],
            ['key' => 'vorderpfoten-erhoeht', 'name' => 'Vorderpfoten erhöht', 'category' => 'kraft', 'reps' => null, 'sets' => 3, 'duration_sec' => 20, 'rest_sec' => 20,
                'description' => 'Vorderpfoten auf eine stabile, niedrige Stufe stellen und die Position halten. Rücken bleibt gerade.',
                'equipment' => ['Stabile Stufe (ca. 10 cm)'], 'notes' => ''],
            ['key' => 'achten', 'name' => 'Achten um Pylonen', 'category' => 'mobilitaet', 'reps' => 4, 'sets' => 1, 'duration_sec' => null, 'rest_sec' => 15,
                'description' => 'In weiten, ruhigen Achten um zwei Pylonen führen. Wechselt die Biegerichtung des Körpers gleichmäßig.',
                'equipment' => ['2 Pylonen'], 'notes' => ''],
            ['key' => 'massage', 'name' => 'Entspannungsmassage', 'category' => 'entspannung', 'reps' => null, 'sets' => 1, 'duration_sec' => 180, 'rest_sec' => null,
                'description' => 'Mit flacher Hand in langen, ruhigen Strichen vom Nacken entlang der Rückenmuskulatur streichen. Zum Abschluss jedes Trainings.',
                'equipment' => ['Weiche Decke'], 'notes' => 'Nicht direkt auf die Wirbelsäule drücken.'],
        ];
    }
}
