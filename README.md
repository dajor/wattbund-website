# WattBund Solar Map MVP

Regionsfähige Solar- und Community-Karte für WattBund. Poing und Vaterstetten sind die ersten Pilotregionen; neue Regionen werden über Datenbankkonfiguration und den LoD2-Import ergänzt.

## Lokal starten

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Ohne `DATABASE_URL` läuft die öffentliche Karte mit deutlich gekennzeichneten Beispieldaten. Profilanlage, Authentifizierung und Administration benötigen PostgreSQL und die externen Schlüssel.

## Datenbank einrichten

```bash
pnpm db:migrate
pnpm db:seed
```

Die Migration aktiviert `postgis` und `pgcrypto`. `db:seed` legt Poing, Vaterstetten, Quellenangaben und einige markierte Beispieldächer an. Vor dem öffentlichen Start sind die Beispieldächer durch echte LoD2-Importe zu ersetzen.

## LoD2 importieren

Die bayerischen Gemeinde-Dateien im CityGML-Format werden in EPSG:25832 erwartet. Der Import verwendet `python3`, `psql` und `DATABASE_URL`.

```bash
pnpm import:lod2 -- --region poing --file /path/to/poing.gml --source-version 2026-08-23
pnpm import:lod2 -- --region vaterstetten --file /path/to/vaterstetten.gml --source-version 2026-08-23
```

Der Import streamt die XML-Datei, berechnet Orientierungswerte und ist über Quell-ID und Prüfsumme wiederholbar.

## MaStR-Aggregate importieren

Aus Datenschutzgründen werden nur Gemeindeaggregate importiert. Erwartete CSV-Spalten:

```csv
municipality_code,installations,installed_capacity_kwp,data_as_of
09175135,0,0,2026-08-23
```

```bash
pnpm import:mastr -- --file /path/to/municipality-aggregates.csv
```

## Externe Konfiguration

- Resend: Domain verifizieren, `AUTH_RESEND_KEY` und `EMAIL_FROM` setzen.
- MapTiler: getrennte öffentliche und serverseitige Keys setzen; den Browser-Key auf die WattBund-Domain beschränken.
- DigitalOcean: `.do/app.yaml` ist die Zielkonfiguration. Während der Entwicklung kann `dev-db-680212` verwendet werden.
- Vor öffentlichen Profilen: DEV-Datenbank auf Managed PostgreSQL in Frankfurt migrieren und Wiederherstellung testen.
- Recht: Anbieterangaben und vollständige Datenschutzerklärung vor Veröffentlichung ergänzen und fachlich prüfen lassen.

## Qualität

```bash
pnpm test
pnpm lint
pnpm build
```
