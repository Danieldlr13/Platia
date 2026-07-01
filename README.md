# CUENTAS

Plataforma web que consolida los gastos de Bancolombia a partir de sus correos de
notificación y los muestra en un panel, separando **cuánto se gasta en transporte**
del resto.

> Diseño completo en
> [`docs/superpowers/specs/2026-07-01-cuentas-gastos-bancolombia-design.md`](docs/superpowers/specs/2026-07-01-cuentas-gastos-bancolombia-design.md).

## Cómo funciona

```
Bancolombia → correo del cliente → [filtro Gmail reenvía] → buzón dedicado
   → cron (GitHub Actions) lee por IMAP → parser → clasificador → Supabase
   → panel web (Next.js)
```

## Estructura

| Ruta | Qué es |
|---|---|
| `src/lib/parser.ts` | Extrae monto, comercio, fecha, tarjeta del correo (núcleo, probado) |
| `src/lib/classifier.ts` | Reglas comercio → Transporte / Otros |
| `src/lib/agregaciones.ts` | Totales por mes y categoría para el panel |
| `src/ingest/ingest.ts` | Lee el buzón por IMAP y guarda en Supabase |
| `db/schema.sql` · `db/seed.sql` | Base de datos y datos iniciales |
| `app/` · `src/components/` | Panel web (Next.js + Recharts) |
| `.github/workflows/ingest.yml` | Cron de ingesta cada 15 min |

## Desarrollo local

```bash
npm install
npm test              # pruebas del parser (fixtures)
npm run ingest:eml    # valida el parser contra los .eml reales de la carpeta
npm run dev           # abre el panel en http://localhost:3000 (con datos demo)
```

El panel funciona sin Supabase: muestra **datos de demostración** hasta que
configures las variables de entorno.

## Puesta en marcha (producción)

1. **Buzón de ingesta** — en `dandelessp@gmail.com`: activar verificación en dos
   pasos y generar una **contraseña de aplicación** (Google → Seguridad → Contraseñas
   de aplicaciones).
2. **Reenvío** — en el Gmail del cliente, crear un filtro:
   *De:* `notificacionesbancolombia.com` → **Reenviar a** `dandelessp@gmail.com`.
   (Para el histórico: buscar esos correos y reenviarlos en lote.)
3. **Supabase** — crear proyecto, ejecutar `db/schema.sql`, crear el usuario en
   *Authentication → Users*, ajustar el correo en `db/seed.sql` y ejecutarlo.
4. **Variables** — copiar `.env.example` a `.env` y completar (ver más abajo).
5. **Cron** — subir el repo a GitHub y cargar los mismos valores como *Secrets*
   (Settings → Secrets → Actions). El workflow corre solo cada 15 min.
6. **Web** — desplegar en Vercel con las variables `NEXT_PUBLIC_SUPABASE_*`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `CUENTAS_USER_ID`.

Ver `.env.example` para la lista completa de variables.

## Estado actual

- ✅ Parser probado contra correos reales (Uber/DiDi → Transporte)
- ✅ Panel con KPIs, gráfico por categoría, tendencia y lista (datos demo)
- ✅ Ingestor IMAP + esquema Supabase + cron
- ⏳ Pendiente: login (Supabase Auth) y persistir la edición manual de categorías
