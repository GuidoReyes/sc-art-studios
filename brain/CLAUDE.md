# brain — Schema operativo

Este directorio es el "brain" del proyecto: un wiki markdown interconectado
mantenido por Claude. Si estás leyendo este archivo, probablemente fuiste invocado
por el comando `/brain`. Seguí estas reglas al pie de la letra.

---

## Qué es cada archivo

- `index.md` — catálogo denso de nodos. Punto de entrada para cualquier query o ingest.
- `log.md` — bitácora append-only de **operaciones sobre el wiki** (ingest, lint, rename, merge). No es el log de trabajo — eso vive en los nodos.
- `sources.md` — registro de fuentes externas. Directorio, no cache de contenido.
- `sessions/` — nodos de sesión. Planos, un archivo por sesión.
- `CLAUDE.md` — este archivo.

---

## Tipos de nodo

Al arranque sólo existe **session**. Conceptos, ADRs, entidades y personas emergerán
orgánicamente vía `lint` cuando el patrón se repita en 3+ nodos.

**NO** crear nodos de otros tipos preventivamente.

---

## Frontmatter obligatorio en cada nodo

```yaml
---
type: session
area: <backend | comercio | docs | frontend | infra | negocio | seguridad>
date: YYYY-MM-DD
slug: <slug-del-nombre-de-archivo-sin-fecha-ni-.md>
title: "<título humano>"
tags: [<libres, kebab-case>]
status: active                  # active | superseded | archived
related:
  - <slug-sin-.md>
sources:
  - repo:<id-o-path>
superseded_by: null             # slug del nodo que reemplaza a éste, o null
---
```

Reglas:
- `slug`: igual al nombre de archivo sin fecha ni `.md`. Kebab-case, ≤6 palabras. Describe el resultado, no el proceso.
- `area`: ruta relativa inequívoca. Single-value. Si una sesión toca dos áreas, crear dos nodos cross-linked, o uno con área primaria y cross-ref.
- `related`: slugs sin `.md`. Máx. 5. El LLM los detecta por tags solapados, misma área, proximidad cronológica.
- `sources`: prefijos válidos: `repo:<id>`, `repo:<path-relativo>`, `url:<url-completa>`.

---

## Convención de enlaces — Wikilinks Foam

**Regla crítica**: todos los enlaces internos del wiki usan `[[slug]]`, compatible con Foam/Markdown Notes en VSCode.

- **Sintaxis**: `[[slug]]` — solo el nombre del archivo sin `.md`, sin path, sin alias. Ej: `[[2026-04-05-nombre-del-nodo]]`.
- **Resolución**: Foam resuelve el slug al archivo por nombre. Los slugs son únicos por construcción (incluyen fecha).
- **Dónde se usan**:
  - `index.md`: cada entry del catálogo
  - Nodos: sección `## Cross-refs`
  - Nodos: sección `## Fuentes` cuando apunta a otro nodo del wiki o a un anchor interno (`[[sources#id]]`)
- **Dónde NO se usan**:
  - URLs externas: usar markdown link `[texto](url)`
  - Archivos fuera del vault `brain/`: backticks literales
  - "Origen histórico" en Fuentes: texto plano, **no enlazar**

---

## Cuerpo obligatorio de cada nodo session

Secciones en este orden exacto:

```
# <Título de la sesión>

## Contexto

## Decisiones

## Output

## Pendiente

## Cross-refs
- [[slug]] — razón en una línea

## Fuentes
- [[sources#id]]
- Origen histórico (no modificar): `ruta/original.md`
```

Reglas del cuerpo:
- `Cross-refs`: **sólo wikilinks** a otros nodos del wiki. Cada bullet con razón en una línea. Sin razón → candidato orphan-link en lint.
- `Fuentes`: referencias externas. Para sources externos: `[[sources#id]]`. Para URLs web: `[texto](url)`. Para archivos del repo fuera del vault: texto plano o backticks.

---

## Reglas de ingest

Cuando se invoca `/brain ingest`:

1. Leer `brain/CLAUDE.md` y `brain/index.md`.
2. Revisar la conversación actual. Identificar:
   - Área(s) tocadas.
   - Verbo de acción principal (definimos, migramos, decidimos, implementamos, debuggeamos).
   - Output concreto: archivos creados/modificados, URLs.
   - Decisiones con rationale.
   - Pendientes explícitos.
3. Generar el slug: `YYYY-MM-DD-<kebab-case>`. Fecha = hoy. El slug describe el RESULTADO (no el proceso), máx. 6 palabras.
4. ¿Existe nodo del mismo día con tema muy similar?
   - **Sí** → UPDATE: leerlo y appendear a Decisiones/Output/Pendiente bajo `### Actualización [HH:MM]`. No reescribir lo anterior.
   - **No** → CREATE.
5. CREATE: generar frontmatter completo. `related` busca en `index.md` nodos con tags solapados, misma área o proximidad cronológica. Máx. 5.
6. Escribir cuerpo con las 6 secciones obligatorias. Cross-refs con `[[slug]]` y razón en una línea.
7. **Bidireccionalidad obligatoria**: para cada nodo en `related`, abrirlo y agregar bullet recíproco en su `## Cross-refs` con `[[este-nodo]] — razón`. Sin excepciones.
8. Actualizar `brain/index.md`: insertar bullet `[[slug]] — one-liner` al tope de la sección del área. Si el área no existe, crearla en orden alfabético.
9. Append a `brain/log.md`: `## [YYYY-MM-DD HH:MM] ingest | <slug>` con metadata de cross-refs.
10. Reportar al usuario: path del nodo, cross-refs agregadas, decisiones ambiguas.



---

## Reglas de query

Cuando se invoca `/brain query <pregunta>`:

1. Leer `brain/CLAUDE.md` y `brain/index.md` completos.
2. De los one-liners del índice, seleccionar 1-5 nodos candidatos.
3. Leer esos nodos completos.
4. Si la pregunta depende del contenido actual de un archivo del repo, leelo directamente con Read. El wiki guarda punteros, no copias.
5. Sintetizar respuesta en 2-5 párrafos con citations usando wikilinks: `[[slug-del-nodo]]`. **NO usar markdown links** para nodos del wiki.
6. Si detectás un gap (cross-ref obvio faltante, concepto en 3+ nodos sin nodo propio), NO arreglarlo — reportarlo al final como "Sugerencia para `/brain lint`".
7. Si no hay info suficiente, decirlo explícitamente. **No inventar ni extrapolar** más allá de lo que dicen los nodos.

---

## Reglas de lint

Cuando se invoca `/brain lint`:

1. Leer `brain/CLAUDE.md`, `brain/index.md` y **todos** los archivos en `brain/sessions/`.
2. Revisar estas categorías:
   - **Orphan nodes**: nodos sin inbound wikilinks desde otros nodos ni desde `index.md`.
   - **Broken wikilinks**: `[[slug]]` que no resuelve a ningún archivo en `sessions/`.
   - **Stale claims**: fechas de pendientes que ya pasaron.
   - **Missing cross-refs**: pares con alto solape de tags o misma entidad sin wikilink entre sí.
   - **Conceptos emergentes**: términos que aparecen en 3+ nodos sin nodo propio. Reportar como candidatos, **no crear**.
   - **Contradicciones**: decisiones opuestas sin `superseded_by`.
   - **Frontmatter inválido**: campos faltantes o valores fuera de enum.
   - **Índice desincronizado**: nodo en `sessions/` sin entry en `index.md`, o viceversa.
   - **Markdown links mal usados**: enlaces a nodos del wiki que usan `[text](path)` en lugar de `[[slug]]`.
3. Devolver reporte markdown estructurado por categoría con sugerencia accionable por ítem.
4. **NO modificar archivos.** Solo append de una entrada corta a `log.md` con conteos.
5. Append a `brain/log.md`: `## [fecha] lint | report` con conteo por categoría.

---

## Integración con archivos del repo

Los archivos del repo son la fuente de verdad (`.taskmaster/tasks/tasks.json`, `.taskmaster/docs/prd.md`, `CLAUDE.md`, `docs/`). Los nodos referencian archivos con `repo:<path>` en el frontmatter. Cuando una query depende del contenido actual de un archivo, Claude lo lee directamente con Read. El wiki no duplica el contenido de los archivos — guarda punteros.

---

## Idioma

- Contenido de nodos: **español**.
- Tags y slugs: **español sin tildes, kebab-case**.
- Frontmatter keys: **inglés** (convención técnica).

---

## Privacidad (repo PÚBLICO)

El repo `GuidoReyes/sc-art-studios` es público: todo lo que se escriba en `brain/` es visible en internet.
- **Nunca** secretos, tokens, contraseñas, IDs de cuentas de pago ni valores de `.env`.
- **Nunca** datos personales: ni de clientes ni de la menor del proyecto (sin apellido completo, escuela, grado, ciudad ni rutinas), ni de adultos responsables (correos, teléfonos, direcciones).
- Costos reales y datos fiscales: solo como puntero (`CostSettings` en la DB), no cifras privadas.
- Si una sesión trató algo sensible, registrar solo que ocurrió y dónde vive el dato (fuera del repo).
