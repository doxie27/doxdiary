# 02 · Designsystem

Die Tokens leben in `src/index.css` (`@theme`, Tailwind v4). Komponenten verwenden ausschließlich diese Tokens – ein Dark Mode tauscht später nur Werte.

## Charakter

*Warm, ruhig, hochwertig.* Inspiration aus Wellness- und Fitness-Apps: viel Luft, wenige klare Flächen, eine ausdrucksstarke Display-Schrift für Emotion und eine sehr gut lesbare Grotesk für alles Funktionale.

## Logo

Ein „d“, dessen Oberlänge zum Dackelkopf mit Ohr, Auge und Schnauze wird, dazu eine kleine Rute am Bogen. Daneben die Wortmarke in Fraunces.

| Datei | Einsatz |
|---|---|
| `public/favicon.svg` | Browser-Tab, Vektor-Master |
| `src/components/ui/Logo.tsx` (`LogoMark`) | In der App (Willkommen, Seitenleiste, Ladebildschirm) |
| `public/icons/icon-192.png`, `icon-512.png` | PWA-Icons |
| `public/icons/icon-maskable-512.png` | Android (mit Schutzzone für runde/abgerundete Masken) |
| `public/icons/apple-touch-icon.png` | iOS-Startbildschirm (iOS rundet die Ecken selbst) |

Markenfarben: Fläche `#687F69`, Zeichen `#FBF8EF`, Auge `#2E3A30`, Wortmarke `sage-800`.

## Farben

| Rolle | Token | Wert | Einsatz |
|---|---|---|---|
| Hintergrund | `canvas` | `#F6F2EA` | Haferton, App-Hintergrund |
| Fläche | `surface` | `#FFFDF9` | Karten, Eingabefelder |
| Vertieft | `sunken` | `#EFE9DE` | Segmented Controls, Kennzahl-Kacheln |
| Linie | `line` / `line-strong` | `#E7E0D3` / `#D8CFBF` | Rahmen, Trenner |
| Text | `ink` / `ink-2` / `ink-3` | `#1E2420` / `#4A514B` / `#7B8079` | Primär / Sekundär / Hinweis |
| **Primär** | `sage-50 … 800` | `#637F5D` (500), `#4E6B57` (600) | Aktionen, aktive Zustände, Fortschritt |
| Akzent | `honey-100/400/600` | `#E2B866` (400) | Pausen, Highlights, Hund-Akzent |
| Akzent | `clay-100/400/600` | `#D08A62` (400) | Gesundheit, Warnhinweise |
| Akzent | `sky-100/600` | `#4B6F86` (600) | Beweglichkeit, Verhalten |
| Status | `good` / `warn` / `alert` | `#4E7A4F` / `#A87A24` / `#B2533B` | Ausschließlich für Rückmeldungen – immer mit Icon **und** Text |

**Regeln**
- Salbei ist die einzige „laute“ Farbe. Akzente erscheinen nur als zarte Tönung (`*-100`) mit farbigem Icon.
- Jeder Hund hat eine persönliche Akzentfarbe (Salbei, Honig, Ton, Himmel) für Porträt und Hero – das macht Mehrhunde-Haushalte auf einen Blick unterscheidbar.
- Kontrast: Fließtext `ink`/`ink-2` auf `canvas`/`surface` erfüllt WCAG AA; `ink-3` nur für ergänzende Hinweise.

## Typografie

| Rolle | Schrift | Größe / Gewicht |
|---|---|---|
| Display (Titel, Namen, große Zahlen) | **Fraunces** Variable (Soft-Achse) | 28–48 px, 500 |
| UI & Fließtext | **Plus Jakarta Sans** Variable | 15–17 px Text, 600 für Labels |
| Overline / Sektionen | Plus Jakarta Sans | 13 px, 600, Versalien, +0,08 em |
| Zahlen | `tabular-nums` | Timer, Zähler, Statistiken |

Beide Schriften werden über `@fontsource` **selbst gehostet** – keine Requests an Google (DSGVO, vgl. LG München I, 3 O 17493/20).

## Form & Raum

- Raster 4 px; Seitenränder 20 px mobil, 32 px Desktop.
- Radien: Karten `24 px` (`rounded-card`), Kacheln `18 px`, Buttons/Felder `16 px`, Pillen voll rund, Sheets `32 px`.
- Schatten: `shadow-card` (kaum sichtbar, warm), `shadow-float` (schwebende Elemente: Navigation, Sheets, CTAs).
- Touch-Ziele mind. 44 × 44 px; Primärbuttons 48–56 px hoch.

## Bewegung

| Name | Dauer | Einsatz |
|---|---|---|
| `rise` | 480 ms, ease-out-soft | Einblenden von Inhalten, gestaffelt (`.stagger`, 40 ms Versatz) |
| `fade` | 320 ms | Seitenwechsel, Overlays |
| `sheet` | 420 ms | Bottom Sheets |
| `pop` | 360 ms, leichtes Überschwingen | Bestätigungen (Haken, Zähler) |
| Press | `active:scale-[0.97]` | Jede tappbare Fläche |

`prefers-reduced-motion` schaltet Animationen ab. Auf Geräten mit Vibration gibt es kurzes haptisches Feedback beim Zählen und bei Phasenwechseln im Training.

## Ikonografie

Lucide, 2 px Strichstärke, 16–22 px. Keine Pfoten-Motive; Kategorien bekommen eindeutige, sachliche Symbole (Hantel = Kräftigung, Waage = Balance, Pfeilkreuz = Beweglichkeit, Fußspuren = Koordination …).

## Komponenten (`src/components/ui`)

| Komponente | Beschreibung |
|---|---|
| `Button`, `IconButton` | Varianten primary · secondary · soft · ghost · danger; Größen sm/md/lg |
| `Card`, `SectionHeader`, `Chip`, `EmptyState` | Grundbausteine für Listen und Sektionen |
| `Sheet` | Bottom Sheet (mobil) / Dialog (Desktop), mit Fokusrückgabe & Escape |
| `TextField`, `TextArea`, `Select` | Große, ruhige Eingabefelder mit Fokus-Ring |
| `Stepper` | Zahlenwerte per +/– statt kleiner Number-Inputs |
| `ChoiceGroup` | Pillen-Auswahl (Geschlecht, Kategorie) |
| `Segmented` | Umschalter mit gleitendem Indikator |
| `ProgressRing` | Kreisfortschritt für Timer, Zähler, Zusammenfassung |
| `DogPortrait`, `DogBackdrop` | Foto oder warmes Verlaufsporträt mit Initiale |
| `Toast` | Dezente Bestätigung oben |

## Diagramme

- Ein Maß pro Diagramm (Umschalter *Einheiten / Minuten* statt zweiter Y-Achse).
- Sequenzielle Salbei-Skala (Kalender: 1 Einheit hell, 2+ dunkel), aktuelle Woche hervorgehoben.
- Dünne Balken mit 4 px gerundeter Oberkante, zurückhaltende Gitterlinien, Tooltip bei Hover/Tap.
- Rückmeldungen als 100 %-Balken mit Legende inkl. Icon, Anzahl und Prozent – Farbe ist nie alleiniger Informationsträger.

## Dark Mode (vorbereitet)

Alle Farben sind Tokens. Für Dark Mode werden in einer späteren Phase eigene Werte für `canvas`, `surface`, `ink*`, `line*` sowie aufgehellte Salbei-Stufen definiert (nicht automatisch invertiert).
