# CUENTAS — Seguimiento de gastos de Bancolombia

**Fecha:** 2026-07-01
**Estado:** Diseño aprobado (pendiente revisión final del documento)
**Cliente:** Daniel de la Rosa · Correo personal: `danieldelarosa706@gmail.com`
**Buzón de ingesta (nuestro):** `bancogastos13@gmail.com`

---

## 1. Problema

El cliente no tiene visibilidad de en qué se le va el dinero. Bancolombia le envía un
correo por cada movimiento (con el monto y el comercio), pero esa información queda
enterrada en su bandeja de entrada y nunca se consolida. En concreto, **no sabe cuánto
gasta en transporte** (Uber, DiDi, etc.), que es su mayor inquietud, ni cuánto suma su
gasto total en el mes.

**Necesidad principal:** aislar y medir el gasto en **transporte**, y de paso conocer el
gasto total mensual, sin que el cliente tenga que registrar nada a mano.

## 2. Objetivo y criterio de éxito

Construir una plataforma web que, de forma automática, capture los correos de Bancolombia,
los convierta en movimientos estructurados, los clasifique (Transporte vs Otros) y los
muestre en un panel claro.

**Criterios de éxito del MVP:**
- El cliente entra a una web y ve, sin hacer nada manual, **cuánto gastó en transporte
  este mes** y su gasto total.
- Cada compra de Bancolombia aparece automáticamente en un plazo de ~15 minutos.
- El cliente puede corregir la categoría de un movimiento mal clasificado.
- Costo de operación: **$0/mes**.

## 3. Alcance

### Incluye (MVP)
- Captura automática de los correos de Bancolombia vía un Gmail dedicado (`bancogastos13@gmail.com`).
- Parseo del cuerpo del correo para extraer: monto, comercio, fecha/hora, tarjeta y tipo.
- Registro de **solo gastos** (salidas de dinero).
- Clasificación automática por reglas en **dos categorías: Transporte y Otros**, con
  corrección manual desde la web.
- Importación de **todo el histórico** que el cliente reenvíe al buzón.
- Login del cliente (autenticación).
- Panel web con: **total mensual**, **gasto por categoría** (Transporte vs Otros),
  **lista de transacciones** (con edición de categoría) y **tendencia mes a mes**.

### No incluye (futuro)
- Registro de ingresos / balance neto (por ahora solo gastos).
- Auto-registro de nuevos usuarios (la base queda preparada, pero lanzamos con 1 cliente).
- Otros bancos u otras fuentes de datos.
- Presupuestos, metas de gasto y alertas.
- App móvil nativa.
- Categorización con IA/ML (por ahora, reglas por comercio).
- Subcategorías dentro de "Otros" (todo lo no-transporte va junto por decisión del cliente).

## 4. Solución y arquitectura

### 4.1. Flujo de datos (punta a punta)

```
Bancolombia envía correo del movimiento
   → llega al Gmail personal del cliente (danieldelarosa706@gmail.com)
   → [filtro de Gmail] reenvía SOLO los correos de Bancolombia
   → buzón de ingesta nuestro (bancogastos13@gmail.com)
   → un cron gratuito (GitHub Actions, cada ~15 min) lee por IMAP los correos nuevos
   → el parser extrae: monto, comercio, fecha/hora, tarjeta, tipo
   → las reglas asignan categoría (Transporte / Otros)
   → se guarda en la base de datos (Supabase), evitando duplicados
   → el cliente lo ve en la web (Next.js en Vercel)
```

### 4.2. Por qué este enfoque de captura

Se evaluaron tres opciones para leer el correo (API de Gmail OAuth, IMAP sobre el correo
personal, y reenvío a un buzón propio). Se eligió el **reenvío a un Gmail dedicado que
nosotros controlamos** porque:

- **Privacidad:** nunca accedemos a la bandeja personal del cliente. El buzón de ingesta
  solo contiene reenvíos de Bancolombia, así que leerlo por IMAP no expone nada más.
- **Costo cero:** al usar un Gmail propio nos ahorramos comprar un dominio.
- **Sin fricción de Google:** evitamos la verificación de "scopes restringidos" de la API
  de Gmail (que en modo prueba caduca el token cada 7 días).
- **Escala:** para multiusuario futuro, cada cliente reenvía a
  `bancogastos13+cliente@gmail.com`; Gmail entrega todo al mismo buzón conservando la
  etiqueta, y así se identifica de quién es cada movimiento.

### 4.3. Componentes

Cada componente tiene una responsabilidad única y se puede probar por separado:

1. **Ingestor (IMAP):** se conecta a `bancogastos13@gmail.com`, descarga los correos no
   leídos cuyo remitente sea Bancolombia, los pasa al parser y los marca como leídos.
   Corre en GitHub Actions con un cron.
2. **Parser:** recibe el texto del correo y devuelve un objeto estructurado
   (`monto`, `comercio`, `fecha`, `tarjeta`, `tipo`). Es una función pura, fácil de testear
   con los correos de muestra.
3. **Clasificador:** aplica las reglas (comercio → categoría). Lo que no coincide con
   ninguna regla de transporte cae en "Otros".
4. **Base de datos (Supabase):** almacena transacciones, categorías y reglas. Con seguridad
   por fila (RLS) lista para multiusuario.
5. **Web / Panel (Next.js):** login + dashboard (total mensual, por categoría, lista
   editable, tendencia).
6. **Auth (Supabase Auth):** login del cliente con enlace mágico.

## 5. Stack propuesto

Todo en capa gratuita. Costo objetivo: **$0/mes**.

| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | **TypeScript** (en todo el proyecto) | Un solo lenguaje, menos fricción, tipado |
| Captura de correo | **Gmail dedicado** + **IMAP** (`imapflow`) + `mailparser` | Gratis, privado, sin dominio, sin caducidad de token |
| Ejecución del cron | **GitHub Actions** (workflow programado cada ~15 min) | Gratis, sin servidor que mantener |
| Base de datos + Auth | **Supabase** (PostgreSQL + Auth + RLS) | Capa gratuita, trae auth y multi-tenencia lista |
| Web / Frontend | **Next.js** (App Router) + **React** en **Vercel** | Gratis, rápido de desarrollar y desplegar |
| Gráficos | **Recharts** | Ligero, suficiente para torta/barras/línea |
| Estilos / UI | **Tailwind CSS** | Estándar, rápido |

**Nota:** la credencial del buzón de ingesta será una **contraseña de aplicación** de Gmail
(requiere activar 2FA en `bancogastos13@gmail.com`). Se guardará como *secret* en GitHub
Actions y en las variables de entorno de Supabase/Vercel según corresponda — **nunca** en
el repositorio.

## 6. Modelo de datos (Supabase / PostgreSQL)

```
usuarios            (gestionado por Supabase Auth: auth.users)

categorias
  id            uuid PK
  user_id       uuid FK -> auth.users (null = categoría global)
  nombre        text            -- 'Transporte' | 'Otros'
  color         text
  created_at    timestamptz

reglas
  id            uuid PK
  user_id       uuid FK -> auth.users
  patron        text            -- p.ej. 'UBER', 'DIDI' (coincidencia sobre el comercio)
  categoria_id  uuid FK -> categorias
  prioridad     int             -- para resolver empates
  created_at    timestamptz

transacciones
  id                 uuid PK
  user_id            uuid FK -> auth.users
  fecha              timestamptz     -- fecha/hora del movimiento (hora Colombia, UTC-5)
  monto              numeric(14,2)   -- en COP
  moneda             text default 'COP'
  comercio           text            -- 'UBER RIDES*DL'
  categoria_id       uuid FK -> categorias
  categoria_manual   bool default false  -- true si el cliente la corrigió a mano
  tarjeta            text            -- 'T.Deb *0172'
  tipo               text            -- 'compra' (por ahora)
  raw_texto          text            -- frase original, para auditoría/depuración
  email_message_id   text UNIQUE     -- Message-ID del correo → evita duplicados
  created_at         timestamptz
```

**Deduplicación:** clave única sobre `email_message_id` (el header `Message-ID` del correo).
Si un correo se procesa dos veces, la inserción se ignora.

## 7. Detalle del parser

Los correos de Bancolombia traen, dentro del cuerpo, una frase con un molde muy consistente
(verificado con 3 muestras reales):

> `Bancolombia: Compraste $3.704,00 en UBER RIDES*DL con tu T.Deb *0172, el 21/06/2026 a las 12:08.`

**Estrategia:**
1. Decodificar el correo (quoted-printable) con `mailparser`; usar el campo de texto plano.
2. Normalizar espacios (colapsar saltos de línea y espacios múltiples).
3. Aplicar una expresión regular con grupos de captura:

```
Bancolombia:\s+(\w+)\s+\$([\d.,]+)\s+en\s+(.+?)\s+con tu\s+(T\.\w+)\s*\*(\d{4}),?\s+el\s+(\d{2}/\d{2}/\d{4})\s+a las\s+(\d{2}:\d{2})
```

| Grupo | Campo | Ejemplo |
|---|---|---|
| 1 | verbo/tipo | `Compraste` |
| 2 | monto | `3.704,00` |
| 3 | comercio | `UBER RIDES*DL` |
| 4 | tipo de tarjeta | `T.Deb` |
| 5 | últimos 4 | `0172` |
| 6 | fecha | `21/06/2026` |
| 7 | hora | `12:08` |

**Normalización del monto (formato colombiano):** quitar los puntos de miles y cambiar la
coma decimal por punto → `"3.704,00"` → `3704.00`. `"$300,00"` → `300.00`.

**Zona horaria:** la hora del cuerpo es hora local de Colombia (America/Bogotá, UTC-5); se
guarda con ese offset.

**Filtro de solo-gastos:** por ahora solo se procesan movimientos de salida. El verbo
`Compraste` es el caso confirmado. El parser quedará preparado para otros verbos de gasto
(`Pagaste`, `Transferiste`, `Retiraste`), que se afinarán cuando tengamos una muestra real
de cada uno. Los movimientos de ingreso (p.ej. `Recibiste`) se ignoran en esta fase.

## 8. Clasificación (reglas)

- Categorías iniciales: **Transporte** y **Otros**.
- Reglas de arranque (coincidencia sobre el texto del comercio, sin distinguir mayúsculas):
  `UBER`, `DIDI`, `DLO*DIDI`, `CABIFY`, `BEAT`, `TERPEL`, `PRIMAX`, `TRANSMILENIO` → **Transporte**.
- Cualquier comercio que no coincida con una regla de transporte → **Otros**.
- Cuando el cliente corrige la categoría de un movimiento, se marca `categoria_manual = true`
  y (opcionalmente, en una iteración posterior) se puede ofrecer crear una regla nueva para
  ese comercio.

## 9. Riesgos y dependencias

- **Variedad de formatos de correo:** solo se confirmó el tipo "Compraste". Otros
  movimientos pueden tener otra redacción. *Mitigación:* el parser guarda `raw_texto` de lo
  que no logre parsear para revisarlo, y se afinará con muestras reales.
- **Cambios de plantilla de Bancolombia:** si el banco cambia el texto, el parser podría
  fallar. *Mitigación:* pruebas con las muestras y registro de correos no parseados.
- **Configuración del reenvío:** depende de que el cliente cree el filtro en su Gmail.
  *Mitigación:* se le entregará una guía paso a paso.
- **Duplicados:** un mismo movimiento podría llegar dos veces. *Mitigación:* clave única por
  `Message-ID`.
- **Contraseña de aplicación:** requiere 2FA activo en `bancogastos13@gmail.com`.

## 10. Roadmap sugerido (alto nivel)

1. **Fase 1 — Núcleo de datos:** parser + esquema Supabase + ingestor IMAP + clasificación.
   Objetivo: que los correos se conviertan en filas de la base de datos correctamente.
2. **Fase 2 — Panel web:** Next.js + login + dashboard (total, categoría, lista, tendencia).
3. **Fase 3 — Puesta en marcha:** filtro de reenvío del cliente, reenvío del histórico,
   despliegue en Vercel y activación del cron en GitHub Actions.

*(El detalle de tareas de cada fase se define en el plan de implementación, paso siguiente
a este documento.)*
