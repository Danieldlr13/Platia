# Arquitectura de CUENTAS

Documentación técnica del sistema: cómo un correo de Bancolombia termina como un
gráfico en el panel, y cómo encajan la ingesta, la base de datos y la web.

> Los diagramas están en [Mermaid](https://mermaid.js.org/); GitHub los renderiza
> automáticamente. Complementa a los specs en `docs/superpowers/specs/`.

## Índice

1. [Visión general](#1-visión-general)
2. [Flujo de ingesta](#2-flujo-de-ingesta)
3. [Recibos de Uber y doble conteo](#3-recibos-de-uber-y-doble-conteo)
4. [Autenticación y multi-tenant](#4-autenticación-y-multi-tenant)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Onboarding de un cliente nuevo](#6-onboarding-de-un-cliente-nuevo)
7. [Estado y próximos pasos](#7-estado-y-próximos-pasos)

---

## 1. Visión general

El sistema es una tubería: los correos de notificación de Bancolombia (y los
recibos de Uber) se reenvían a un buzón dedicado, un cron los lee y parsea, los
guarda en Supabase, y la web los muestra por usuario.

```mermaid
flowchart LR
    BC[Bancolombia] -->|"correo de notificación"| GC[Gmail del cliente]
    UBER[Recibo de Uber] -->|correo| GC
    GC -->|"filtro reenvía"| BZ["Buzón dedicado (Gmail)"]
    BZ -->|IMAP| CRON["Cron — GitHub Actions<br/>cada 15 min"]
    CRON --> ING["Ingestor<br/>parser + clasificador"]
    ING -->|upsert| DB[("Supabase<br/>Postgres + RLS")]
    DB -->|"lectura por sesión (RLS)"| WEB["Web Next.js<br/>login + panel"]
    WEB --> U([Usuario])
```

| Pieza | Archivo | Rol |
|---|---|---|
| Parser | `src/lib/parser.ts`, `src/lib/parser-uber.ts` | Extrae monto, comercio, fecha, tarjeta del correo |
| Clasificador | `src/lib/classifier.ts` | Reglas comercio → Transporte / Otros |
| Ingestor | `src/ingest/ingest.ts` | Lee IMAP y guarda en Supabase |
| Cron | `.github/workflows/ingest.yml` | Ejecuta el ingestor cada 15 min |
| Web | `app/`, `src/components/` | Login + panel con filtros y gráficos |
| Base de datos | `db/schema.sql` | Tablas + seguridad por fila (RLS) |

---

## 2. Flujo de ingesta

El ingestor corre sin interfaz (backend). Lee los correos no leídos del buzón,
saca los movimientos y hace `upsert` idempotente: correr el cron varias veces no
duplica datos, porque la clave `(user_id, email_message_id)` es única.

```mermaid
flowchart TD
    A[Cron cada 15 min] --> B[Conecta IMAP al buzón]
    B --> C["Busca correos no leídos de Bancolombia"]
    C --> D{"¿Hay correos?"}
    D -->|no| Z[Fin]
    D -->|sí| E["Por cada correo: extraerCandidatos"]
    E --> F["Cuerpo del correo + adjuntos .eml"]
    F --> G[parsearCorreo]
    G --> H{"¿Es un gasto reconocible?"}
    H -->|no| I[Ignorar]
    H -->|sí| J["clasificar: Transporte / Otros"]
    J --> K[Acumular movimiento]
    K --> L["upsert en Supabase<br/>dedup por (user_id, email_message_id)"]
    I --> M[Marcar correos como leídos]
    L --> M
    M --> Z
```

**Puntos clave**

- `extraerCandidatos` cubre el reenvío normal (el cuerpo del correo) y el
  "reenviar como adjunto" (varios `.eml` dentro de un correo, para migrar el
  histórico).
- El `upsert` usa `ignoreDuplicates: true`: si una transacción ya existe, **no**
  se sobreescribe → las ediciones manuales de categoría (`categoria_manual`) se
  conservan entre corridas.

---

## 3. Recibos de Uber y doble conteo

Un mismo viaje de Uber puede llegar por **dos fuentes**: el recibo de Uber
(cubre efectivo *y* tarjeta) y la notificación de Bancolombia (solo tarjeta).
Sin cuidado, los viajes con tarjeta se contarían dos veces.

```mermaid
flowchart TD
    T[Viaje en Uber] --> P{"¿Cómo se pagó?"}
    P -->|Efectivo| RU[Recibo de Uber]
    P -->|Tarjeta| RU2[Recibo de Uber]
    P -->|Tarjeta| BN[Notificación Bancolombia]
    RU --> DBt[("transacciones")]
    RU2 -.->|"mismo día y monto"| DUP{{"Doble conteo"}}
    BN -.-> DUP
    DUP --> DEC["Regla: Bancolombia es la fuente de verdad<br/>para tarjeta; el recibo de Uber se descarta"]
    DEC --> DBt
    BN --> DBt
```

- **Efectivo:** solo existe en el recibo de Uber → se conserva.
- **Tarjeta:** existe en ambas fuentes → se conserva la notificación de
  Bancolombia (fuente continua vía el ingestor) y se descarta el recibo de Uber.
- Detalle completo y decisión en la memoria del proyecto (`uber-doble-fuente`).

---

## 4. Autenticación y multi-tenant

La web es **multi-cliente**: cada usuario inicia sesión y ve solo sus datos. Esto
lo garantiza la *seguridad por fila* (RLS) de Postgres: las consultas se filtran
por `auth.uid()`, no por un id fijo en el código.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant MW as middleware.ts
    participant SB as Supabase Auth
    participant P as Panel
    U->>MW: GET /
    MW->>SB: getUser (cookie de sesión)
    alt Sin sesión
        SB-->>MW: null
        MW-->>U: redirect a /login
        U->>SB: signInWithPassword(email, contraseña)
        SB-->>U: cookie de sesión
        U->>MW: GET / (reintento)
        MW->>SB: getUser
    end
    SB-->>MW: user
    MW->>P: continúa
    P->>SB: select transacciones (RLS por auth.uid)
    SB-->>P: solo las filas del usuario
    P-->>U: panel con sus datos
```

**Web vs. ingesta** — hoy la web ya es multi-tenant; la ingesta aún no:

```mermaid
flowchart LR
    subgraph WEB ["Web — multi-tenant (hecho)"]
        L[Login] --> R["RLS por auth.uid"]
        R --> A[Usuario A ve solo lo suyo]
        R --> B[Usuario B ve solo lo suyo]
    end
    subgraph ING ["Ingesta — pendiente"]
        BZ[Buzón único] --> CID["Atribuye todo a CUENTAS_USER_ID"]
        CID -.->|"falta: ruteo correo→usuario"| RT["Alias por cliente<br/>o buzón por cliente"]
    end
```

- La web usa la **anon key + sesión** (`src/lib/supabase-server.ts`), no la
  service role.
- El ingestor sigue usando la **service role** + `CUENTAS_USER_ID` (backend). El
  ruteo correo→usuario es el siguiente paso para multi-tenant real de datos.

---

## 5. Modelo de datos

Todo cuelga de `auth.users`. Cada tabla lleva `user_id` y una política RLS que
restringe filas al dueño (`auth.uid() = user_id`).

```mermaid
erDiagram
    users ||--o{ categorias : tiene
    users ||--o{ reglas : tiene
    users ||--o{ transacciones : tiene
    categorias ||--o{ transacciones : clasifica
    categorias ||--o{ reglas : define

    users {
        uuid id PK
        text email
    }
    categorias {
        uuid id PK
        uuid user_id FK
        text nombre
        text color
    }
    reglas {
        uuid id PK
        uuid user_id FK
        text patron
        uuid categoria_id FK
        int prioridad
    }
    transacciones {
        uuid id PK
        uuid user_id FK
        timestamptz fecha
        numeric monto
        text comercio
        uuid categoria_id FK
        boolean categoria_manual
        text tarjeta
        text email_message_id
    }
```

- `unique (user_id, email_message_id)` en `transacciones` evita duplicados y
  hace idempotente al ingestor.
- `categoria_manual = true` marca una categoría editada por el usuario para que
  el reclasificador no la pise.

---

## 6. Onboarding de un cliente nuevo

Los pasos para dar de alta un cliente (misma info que la guía en `/guia`). El
paso marcado lo hace el **cliente**; el resto, el **operador**.

```mermaid
flowchart TD
    S1["1 · Buzón dedicado + contraseña de app"] --> S2["2 · Reenvío desde el Gmail del cliente"]
    S2 --> S3["3 · Base de datos: schema.sql + seed.sql"]
    S3 --> S4["4 · Crear usuario: email + contraseña"]
    S4 --> S5["5 · Variables de entorno"]
    S5 --> S6["6 · Secrets + cron en GitHub"]
    S6 --> S7["7 · Deploy en Vercel"]
    S7 --> S8["8 · Reenviar histórico y verificar"]
    classDef cliente fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a;
    class S2 cliente;
```

La guía in-app (`/guia`) muestra estos pasos con valores copiables (host IMAP,
remitente a filtrar, nombres de variables, comandos de migración).

---

## 7. Estado y próximos pasos

```mermaid
flowchart LR
    subgraph Hecho ["Hecho"]
        H1[Parser + tests]
        H2[Ingestor + cron 15 min]
        H3[Panel: filtros y gráficos]
        H4[Login + RLS]
        H5["Guía /guia"]
    end
    subgraph Falta ["Pendiente"]
        F1["Ruteo correo→usuario<br/>(ingesta multi-tenant)"]
        F2[Deploy en Vercel]
        F3[Crear usuarios reales]
    end
    Hecho --> Falta
```

| Estado | Ítem |
|---|---|
| ✅ | Parser (Bancolombia + Uber) probado |
| ✅ | Ingestor IMAP + cron cada 15 min |
| ✅ | Panel con filtros, agrupaciones y gráficos (responsive) |
| ✅ | Login con Supabase Auth + RLS (web multi-tenant) |
| ✅ | Guía de onboarding en `/guia` |
| ⏳ | Ruteo correo→usuario en el ingestor (datos multi-tenant automáticos) |
| ⏳ | Deploy en Vercel + creación de usuarios reales |
