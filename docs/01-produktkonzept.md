# 01 · Produktkonzept & Informationsarchitektur

> **Doxie Diary – Dein Hund. Dein Alltag. Ein Ort für alles.**

## Leitgedanken

1. **Der Hund steht im Mittelpunkt.** Name, Porträt und Akzentfarbe des ausgewählten Hundes ziehen sich durch die App. Wechselt man den Hund, wechselt die ganze App den Kontext.
2. **„Heute“ zuerst.** Die App beantwortet beim Öffnen eine Frage: *Was steht heute an und wie läuft es?* Alles andere ist einen Tipp entfernt.
3. **Ruhig statt laut.** Keine Gamification-Überladung, keine Pfoten-Clipart. Fortschritt wird ehrlich und ohne Gesundheitsversprechen gezeigt – es geht um Trainingsaktivität, nicht um Heilung.
4. **Für Halter gemacht, für Fachleute ernstzunehmen.** Sauber strukturierte Übungen (Sätze, Wiederholungen, Dauer, Pausen, Hilfsmittel) und nachvollziehbare Protokolle, die eine Physiotherapeutin später lesen möchte.
5. **Privat by default.** Alles gehört dem Konto, das es angelegt hat. Freigaben gibt es nur ausdrücklich.

## Zielgruppen

| Gruppe | Bedürfnis | V1 |
|---|---|---|
| Halter:innen mit Reha-/Physio-Hund | Übungen strukturiert und zuverlässig durchführen, Beobachtungen festhalten | ✅ Kern |
| Alle Hundehalter:innen | Tagebuch, Profil, Erinnerungen an Momente | ✅ Basis |
| Familienmitglieder | Gemeinsam dokumentieren | 🔜 Architektur vorbereitet |
| Tierphysiotherapeut:innen | Pläne bereitstellen, Fortschritt (mit Freigabe) einsehen | 🔜 Architektur vorbereitet |

## Informationsarchitektur

```
Doxie Diary
├── Öffentlich
│   ├── Willkommen
│   ├── Anmelden
│   ├── Registrieren
│   └── Passwort zurücksetzen (+ später: neues Passwort setzen via Link)
│
└── Angemeldet  (Kontext: ausgewählter Hund)
    ├── Heute (Dashboard)
    │   ├── Hund-Hero mit Kennzahlen (Serie, Einheiten der Woche, aktive Minuten)
    │   ├── Heutige Trainings (Start / erledigt)
    │   ├── Wochenstreifen Mo–So
    │   ├── Zuletzt (letzte Einheit, letzte Tagebucheinträge)
    │   └── Schnellzugriff
    │
    ├── Training (Physiotherapie)
    │   ├── Pläne ─ Plan-Detail ─ Plan bearbeiten / neu
    │   ├── Übungen ─ Übungs-Detail ─ Übung bearbeiten / neu
    │   ├── Verlauf (Kennzahlen, Kalender, Häufigkeit, Beobachtungen, Einheiten)
    │   └── Trainingsmodus (Vollbild): Intro → Übung → Pause → Rückmeldung → Zusammenfassung
    │
    ├── Tagebuch
    │   ├── Chronologische Timeline mit Kategorien-Filter
    │   └── Eintrag anlegen / bearbeiten (Bottom Sheet)
    │
    ├── Profil (Hund)
    │   ├── Hero mit Porträt, Steckbrief, Beschreibung
    │   ├── Gesundheitliche Hinweise (privat)
    │   ├── Aktive Pläne
    │   └── Bearbeiten (Sheet) · Hund hinzufügen
    │
    └── Konto
        ├── Persönliches Profil
        ├── Hunde verwalten
        ├── Teilen (bald: Familie, Therapeut:in)
        ├── Datenschutz: Export, Konto löschen
        └── Abmelden
```

## Seitenübersicht & Routen

| Route | Seite | Zweck |
|---|---|---|
| `/welcome` | Willkommen | Wertversprechen, Einstieg |
| `/login`, `/register`, `/reset` | Auth | Konto-Zugang |
| `/` | Heute | Tagesübersicht für den gewählten Hund |
| `/training` | Pläne | Nächste Einheit, aktive & archivierte Pläne |
| `/training/plans/new`, `/:id`, `/:id/edit` | Plan | Ansehen, starten, bearbeiten, archivieren |
| `/training/exercises`, `/new`, `/:id`, `/:id/edit` | Übungsbibliothek | Suchen, filtern, verwalten |
| `/training/history` | Verlauf | Kalender, Statistiken, vergangene Einheiten |
| `/training/session/:planId` | Trainingsmodus | Vollbild, ohne Navigation – volle Konzentration |
| `/diary` (`?new=1`) | Tagebuch | Timeline, Eintrag anlegen |
| `/dog`, `/dogs/new` | Hundeprofil | Profil ansehen/bearbeiten, Hund anlegen |
| `/account` | Konto | Einstellungen, Datenschutz |

## Navigation

### Mobile (< 1024 px)
- **Schwebende Bottom Navigation** mit vier Zielen + zentraler Aktionstaste:
  `Heute · Training · [ + ] · Tagebuch · Profil`
- Die **+ Taste** öffnet ein Bottom Sheet mit den häufigsten Aktionen: *nächstes Training starten*, *Tagebucheintrag*, *neue Übung*, *Hund hinzufügen*. Damit sind die Kernaktionen von überall in zwei Taps erreichbar.
- **Hund wechseln** über die Pille im Dashboard-Hero bzw. im Profil (Bottom Sheet).
- **Konto** über den Avatar oben rechts im Dashboard – bewusst nicht in der Tab-Leiste, weil selten genutzt.
- **Training** hat eine eigene Unternavigation (Segmented Control: Pläne · Übungen · Verlauf), jede Ansicht mit eigener URL.
- **Trainingsmodus** blendet die Navigation komplett aus.
- Primäre Aktionen in Formularen sitzen fixiert im Daumenbereich über der Tab-Leiste.

### Desktop / Tablet (≥ 1024 px)
- **Linke Seitenleiste** mit Marke, Hund-Wechsler, denselben vier Zielen, einer „Als Nächstes“-Karte mit Start-Button und Konto unten.
- Inhalt zentriert mit max. 768 px Breite – die App bleibt fokussiert und wirkt nicht wie ein Admin-Dashboard.
- Dialoge werden als zentrierte Modals statt Bottom Sheets dargestellt.

## Kernabläufe

**Training durchführen** (≤ 2 Taps bis zur ersten Übung)
`Heute → ▶ → Intro (Übersicht, Hilfsmittel) → „Los geht’s“`
→ je Übung: Timer *oder* Tipp-Zähler · Satz für Satz · automatische Pausen
→ Rückmeldung *Gut / Schwierig / Beschwerden* + Notiz
→ bei *Beschwerden*: Hinweis auf Rücksprache mit Fachperson, Option „Einheit hier beenden“ – **keine** automatische Anpassung
→ Zusammenfassung mit Notiz → Speichern → Verlauf

**Moment festhalten**
`+ → Tagebucheintrag → Kategorie, Titel, Notiz, Fotos → Speichern`

## Inhaltliche Leitplanken (Gesundheit)

- Statistiken zeigen **nur Aktivität** (Anzahl, Minuten, Serie, Häufigkeit) und **eigene Beobachtungen** – niemals „Lola ist 20 % beweglicher“.
- Beschwerden werden dokumentiert, nicht bewertet. Die App verweist auf Tierärzt:in/Physiotherapeut:in.
- Gesundheitliche Hinweise am Profil sind als „nur für dich sichtbar“ gekennzeichnet.
