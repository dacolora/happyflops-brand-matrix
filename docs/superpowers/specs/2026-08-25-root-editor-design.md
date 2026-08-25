# Editor en vivo de `root.json` sobre `index.html`

**Fecha:** 2026-08-25
**Estado:** aprobado por el usuario en chat, pendiente de plan de implementación.

## Problema

Laura construyó el sistema de marca (los 11 invariantes, variables libres,
categorías, colores) en Notion, en prosa. Ahora que `root.json` es la fuente
real, necesita poder seguir construyéndolo — agregar una variable libre,
ajustar el texto de una invariante, agregar un color prohibido — sin depender
de editar JSON a mano ni de pedirle a alguien que lo haga por ella cada vez.

`index.html` ya existe como una vista de solo lectura de `root.json`, con el
mismo lenguaje visual de marca (Sniglet/Helvetica, paleta amarillo/azul). La
decisión tomada en la conversación de diseño es: **la misma página gana un
modo de edición**, en vez de construir una herramienta aparte.

## Objetivo

Que abriendo `index.html` a través de un servidor local nuevo, cada una de
las siguientes secciones se pueda editar en el navegador y grabar
directamente en `root.json`, sin tocar JSON a mano:

1. **Qué es la marca / Somos / No somos** — `brand.definition`, `brand.promise`,
   `brand.origin_story`, `brand.values`, `brand.we_are`, `brand.we_are_not`
   (agregar/quitar ítems de listas).
2. **Las 11 invariantes** — editar el texto (`rule`, `name`) de cada una.
   No se puede agregar ni quitar una invariante desde la UI — la cantidad es
   una decisión de otro nivel, no un click.
3. **Variables libres** — alta, edición y baja completas de entradas en
   `free_variables`.
4. **Las 3 categorías** — editar `is`/`note` de `lifestyle`, `photoshoot`,
   `render_3d`, y agregar/quitar subcategorías.
5. **Sistema de color** — editar los hex de `yellow_gradient`/`blue_gradient`,
   y agregar/quitar `neutrals`/`forbidden`.

## No objetivo (explícitamente fuera de esta versión)

- Editar voz de marca, SmileTech, open_items, catálogo de productos, o
  `prompt_blocks` — mismo patrón, se puede sumar después si hace falta.
- Colecciones trunk (LUZ y las demás) — `schema.json` todavía no puede
  representarlas (ver README, ítem bloqueado esperando la propuesta de
  schema v0.4 de Laura). No se tocan en este trabajo.
- Cualquier edición de `submundos/*.json` — sigue siendo trabajo de Claude
  Code en chat.
- Commit/push automático de git. El servidor escribe el archivo; comitearlo
  sigue siendo un paso consciente aparte (Claude Code o manual), tal como
  documenta el README hoy.
- Autenticación o multiusuario — es una herramienta local, de un solo uso,
  para Laura en su propia máquina.
- Subida de imágenes / reference pack — sigue bloqueado aparte.

## Arquitectura

**Un solo archivo de página** (`index.html`, sin duplicar en un `editor.html`
aparte) con dos comportamientos según cómo se sirva:

- **GitHub Pages / cualquier hosting estático** → sigue siendo hoy: de solo
  lectura, sin servidor de escritura detrás. La página intenta `GET
  /api/health` al cargar; si falla (404, o ni siquiera existe la ruta), no
  muestra ningún control de edición. Cero cambio de comportamiento respecto
  a hoy en este modo.
- **Servida por el nuevo script local** → `GET /api/health` responde 200,
  la página activa un botón "Editar" en cada una de las 5 secciones de
  arriba.

**Servidor nuevo:** `servidor_editor.py`, en la raíz del repo, sin
dependencias nuevas (solo `http.server` de la librería estándar). Escucha en
`localhost:8000` por default (mismo puerto que ya documenta el README para
`python3 -m http.server`, para no sumar un número nuevo que recordar).
Reemplaza a `python3 -m http.server` para este flujo — sirve los archivos
estáticos igual que antes, y además entiende estas rutas:

- `GET /api/health` → `200 {"ok": true}` — señal de que hay edición
  disponible.
- `POST /api/root` → body `{"key": "<brand|invariants|free_variables|categories|colour_system>", "value": <...>}`.
  - Rechaza (`400`) cualquier `key` fuera de esa lista de 5 — así un bug en
    el frontend nunca puede pisar `schema_version`, `approval`, etc.
  - Para `key == "invariants"`: exige que `value` tenga exactamente 11
    elementos y que los `id` sean 1..11 en orden — si no, `400` y no escribe
    nada. Protege la única regla estructural que de verdad importa acá: no
    se pierde ni se duplica una invariante por un bug de UI.
  - Antes de escribir, copia el `root.json` actual a
    `root.backups/root.<YYYYMMDD-HHMMSS>.json` (carpeta nueva, agregada a
    `.gitignore` — es una red de seguridad local, no parte del historial de
    marca; ese historial ya lo da git sobre los commits reales). Conserva
    los últimos 20 backups y borra los más viejos.
  - Escribe `root.json` reemplazando solo esa clave de nivel superior;
    todo lo demás del archivo queda intacto byte a byte salvo por el propio
    `json.dump`.
  - Responde `200` con el `root.json` completo actualizado, para que el
    frontend vuelva a renderizar desde la fuente de verdad en disco, nunca
    desde el estado que tenía en memoria antes de guardar.

## UX de edición

Cada una de las 5 secciones tiene un botón "Editar" en su encabezado
(visible solo en modo edición). Al hacer click, esa sección — y solo esa —
cambia de vista a formulario:

- **Campos de texto simple** (`brand.definition`, `brand.promise`,
  `brand.origin_story`, `note` de una categoría) → `<textarea>` o `<input>`
  precargado con el valor actual.
- **Listas de texto** (`we_are`, `we_are_not`, `values`, `neutrals`,
  `forbidden`, subcategorías) → cada ítem es un input con una "×" para
  borrarlo, más un botón "+ Agregar" al final.
- **Variables libres** → lista repetible de bloques `{clave, tipo,
  descripción / valores si es enum / default}`; tipo es un `<select>` con
  las mismas opciones que ya usa `root.json` (`string`, `enum`, `object`);
  agregar bloque nuevo o borrar uno existente.
- **Invariantes** → 11 filas fijas (nunca agregar/quitar), cada una con
  `name` y `rule` editables; el `id` se muestra pero no se edita.
- **Categorías** → 3 tarjetas fijas (`lifestyle`, `photoshoot`, `render_3d`),
  cada una con `is`/`note` editable y su lista de subcategorías editable.
- **Colores** → inputs de tipo color/texto para cada hex, con una muestra
  visual junto al input; listas editables para `neutrals`/`forbidden`.

Cada sección en edición tiene su propio "Guardar" y "Cancelar" — guardar
llama a `POST /api/root` solo con la clave de esa sección. Si el servidor
responde error, se muestra el motivo en español simple junto al botón, sin
perder lo que ella escribió. Si responde bien, toda la página se vuelve a
pintar desde el `root.json` que devolvió el servidor.

## Manejo de errores

- Sin conexión al servidor al guardar → mensaje "No se pudo guardar, revisá
  que el servidor siga corriendo" sin descartar el formulario.
- `400` por clave no permitida o invariantes mal formadas → mensaje con el
  motivo exacto que da el servidor.
- Cualquier error inesperado (`500`) → mensaje genérico + sugerencia de
  revisar la terminal donde corre `servidor_editor.py`.

## Plan de pruebas (no hay suite automática más allá de `validar_marca.py`,
que no aplica a este archivo — `root.json` no se valida contra
`schema.json`, ese schema es para submundos)

Manual, contra el servidor local:

1. Arrancar `servidor_editor.py`, abrir la página — confirmar que se ve
   igual que hoy y que aparecen los 5 botones "Editar".
2. Para cada una de las 5 secciones: editar un valor, guardar, y confirmar
   en el archivo (`git diff root.json`) que cambió solo esa clave y que se
   creó un backup en `root.backups/`.
3. Intentar (vía `curl`, no desde la UI) `POST /api/root` con
   `key: "invariants"` y solo 10 elementos → esperar `400`, archivo sin
   cambios.
4. Intentar `POST /api/root` con `key: "schema_version"` → esperar `400`,
   archivo sin cambios.
5. Servir la carpeta con el `python3 -m http.server` de siempre (sin la API
   nueva) → confirmar que la página carga de solo lectura, sin botones de
   editar, sin errores de consola.
6. Después de varias ediciones, correr `python validar_marca.py --todos`
   para confirmar que el resto del sistema sigue funcionando sin roces.

## Documentación a actualizar en la implementación

- `README.md`, sección "Qué hay aquí" / comandos: sumar
  `python3 servidor_editor.py` como la forma de levantar el editor local,
  dejando `python3 -m http.server` como alternativa de solo lectura.
- `CLAUDE.md`, sección "Commands": mismo agregado.
