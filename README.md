# Happy Flops — Brand Matrix

La fuente de verdad del sistema de marca de Happy Flops, en código — no reinterpretada,
no paseada de un chat a otro. Este repo existe para que `root.json` y `schema.json`
nunca se desalineen de lo que Notion (o cualquier otra cosa) muestra, porque **son**
la fuente, no una copia de ella.

## De dónde sale esto (contexto para un chat nuevo)

Happy Flops es una marca real (chanclas/sandalias). **Laura Vanegas** es la dueña
real del área de marketing/marca y construyó este sistema — 11 invariantes, variables
libres, submundos — primero en Notion, apoyada en su propia conversación de Claude.
Es un sistema serio y ya maduro, no un boceto.

**Daniel** (dueño de este repo y de `iaplusyou`, el pipeline que genera y publica el
contenido) decidió llevar ese sistema de Notion a código real, para que deje de vivir
solo en prosa y se pueda validar mecánicamente. Se volvió el "manager" técnico de
estas herramientas para Laura — ella no necesita ser técnica, él la acompaña.

**Decisión explícita ya tomada (no volver a plantearla):** la migración es completa
y en una sola dirección. Laura empieza a operar desde este repo hacia adelante. No
hay sync automático bidireccional Notion↔repo. Notion se queda como la puerta
humana — narrativa, explicaciones — pero deja de ser lo que cualquier herramienta
real consulta; eso es este repo.

### El Notion real de Laura

URL raíz: `https://app.notion.com/p/Happy-Flops-Brand-Matrix-3c2e6000f5f28103a558e146d61ed853`

Daniel tiene acceso de **invitado humano** a esa página con `dacoloradog@gmail.com`
(confirmado, aparece como "Invitado" en el sidebar). **No hay integración de Notion
conectada** — el conector MCP de Notion no tiene acceso a esa página (probado,
`object_not_found`). La única forma que funcionó para leerla en vivo esta sesión fue
manejar el Chrome real de Daniel (ya logueado) con la herramienta de automatización
de navegador (`claude-in-chrome`) — abrir `app.notion.com`, entrar por
"Espacio de Daniel Colorado" → buscar o navegar directo a las URLs de cada subpágina.
Si en un chat nuevo la página no aparece al buscarla, es porque el acceso de invitado
se perdió o Laura la compartió con otra cuenta — pedirle que la vuelva a compartir
con `dacoloradog@gmail.com` antes de asumir que hay que copiar/pegar contenido a mano.

Páginas que existen en su sidebar (✅ = ya leída en detalle esta sesión, el resto no):

- ✅ Raíz — "Happy Flops — Brand Matrix" (los 11 invariantes, variables libres, tabla de brand test)
- ✅ Open items
- ✅ Product Catalog (base de datos, 19 productos)
- ✅ LUZ — trunk collection (37 referencias analizadas)
- ⬜ SmileTech
- ⬜ Voice & Copy
- ⬜ Light, Colour & Seasons
- ⬜ Product & the Feet Rules
- ⬜ Master Prompt
- ⬜ The 20-second gate
- ⬜ The 100 Questions (base de datos)
- ⬜ El árbol — categorías, subcategorías y tipos de contenido (base de datos)
- ⬜ How to start
- ⬜ Matrix Feedback (base de datos)
- ⬜ The feedback protocol
- ⬜ The tree model

### Lo que ya sabemos de LUZ (resumen — no reemplaza leer la fuente completa)

- 37 referencias, en dos batches, cada una con análisis real campo por campo:
  dirección de la luz, calidad (dura/suave), fuente, qué funciona exactamente
  (una frase concreta, no "se ve bonito"), y para qué mundos sirve.
- Hallazgo central: el Invariante 1 (luz) no depende de un solo eje ("sol bajo").
  Depende de dos: altura del sol (gobierna largo de sombra y temperatura de color)
  y difusión — qué hay entre el sol y el sujeto (gobierna si el borde de la sombra
  es duro o suave). `LUZ-23` es sol bajo y cálido pero de todos modos "hard" — es
  la referencia que forzó corregir la regla de un eje a dos.
- Huecos de cobertura reales: `winter_indoor` sin ninguna evidencia, `photoshoot`
  casi sin luz de estudio, `street` débil (2 referencias), `characters` vacío.
- Los nombres (`LUZ-01`, `LUZ-23`...) son slugs provisionales — no hay archivos de
  imagen reales todavía, llegan con el reference pack.
- Formato de la evidencia: `submundo.schema.json` v0.3 (la versión que vive en este
  repo) **no puede representar un archivo de trunk como este** — ver "Pendientes".

## Lo que esto cambia para Laura, para siempre

Antes de este repo, el sistema de marca vivía en tres lugares a la vez y ninguno se
hablaba con los otros: la cabeza de Laura, la prosa de Notion, y lo que cada
herramienta de generación terminaba produciendo — con suerte parecido a lo que ella
quería. Si algo se le olvidaba releer, o alguien generaba contenido sin conocer las
reglas al detalle, la marca se diluía sin que nadie lo notara hasta después.

Con este repo eso cambia de raíz:

- **Las reglas dejan de ser una sugerencia y pasan a ser ley mecánica.** Un
  submundo que intenta liberar un invariante (pies, texto, IP de personajes) no
  "se ve mal" — literalmente no pasa la validación. `schema.json` lo rechaza antes
  de que llegue a ningún lado, sin depender de que alguien se dé cuenta a ojo.
- **Cada imagen y video que genera `iaplusyou` para Happy Flops pasa por sus
  reglas reales**, no por una interpretación de segunda mano ni por una copia
  desactualizada. El submodule significa que no hay copia que se desalinee — es
  literalmente su documento, commit tras commit.
- **Historial real.** Git guarda quién cambió qué invariante, cuándo y por qué —
  algo que Notion no da gratis. Si en seis meses alguien pregunta "¿por qué
  cambiamos la regla del pie?", la respuesta está en `git log`, no en la memoria
  de alguien.
- **Una página visual que nunca se desactualiza.** `index.html` lee `root.json`
  en vivo — si el JSON cambia, la página cambia sola. Nadie edita dos lugares, y
  nadie puede mostrar por accidente una versión vieja de las reglas.
- **El trabajo de análisis que ya hizo (LUZ, y lo que siga) deja de ser un
  documento que solo ella puede interpretar y se vuelve algo que cualquier
  herramienta puede consultar directamente** — sin pasar de nuevo por un chat que
  reinterprete lo que ella quiso decir.

## Cómo se le puede hacer el trabajo más fácil, no más difícil

Lo que Laura ya sabe hacer — mirar una foto y explicar con precisión por qué
funciona o por qué no — sigue siendo enteramente suyo; nadie automatiza ese
criterio. Lo que este repo (con Claude Code corriendo aquí) le puede quitar de
encima es el trabajo mecánico alrededor de ese criterio:

- **Primer borrador de análisis por visión, no desde cero.** Las 37 referencias de
  LUZ las escribió a mano, campo por campo. Con las fotos reales (en cuanto llegue
  el reference pack o los archivos de LUZ), Claude puede mirar cada imagen y
  proponer un primer borrador de `direction` / `quality` / `source` /
  `works_because` — ella solo corrige y aprueba. De escribir 37 análisis a editar
  37 borradores ya hechos.
- **Detección automática de huecos de cobertura.** Hoy "`winter_indoor` no tiene
  evidencia" es algo que ella nota y escribe a mano en la prosa. Un script corto
  sobre `submundos/*.json` puede sacar esa tabla solo, cada vez que se le pida —
  cero esfuerzo, siempre actualizada, para cualquier trunk que construya después.
- **Nunca más "¿esto rompe una regla?" a ojo.** `python validar_marca.py --todos`
  lo dice en segundos, con el error exacto y dónde está.
- **Un lugar único para presentar el sistema completo** — a un cliente, a alguien
  nuevo del equipo, a un inversionista. `index.html` publicado en GitHub Pages es
  una URL real y bonita que no depende de dar acceso de invitado a Notion.
- **Ella sigue siendo la única que decide las reglas.** Este repo no le quita
  criterio — le quita la carga de tener que recordar 11 invariantes cada vez que
  alguien, en cualquier herramienta, genera algo nuevo para Happy Flops.

## El plan completo, de punta a punta

1. Laura decide las reglas — los invariantes, las variables libres, qué es y qué
   no es Happy Flops. Eso no lo automatiza nadie ni debería.
2. Este repo convierte esas reglas en algo que una máquina puede hacer cumplir,
   no solo "tener en cuenta".
3. `iaplusyou` genera contenido consultando este repo directamente (vía submodule)
   — nunca puede generar algo que rompa un invariante, porque el mismo código que
   arma el prompt lee `invariant_block` y `negative_prompt` de aquí.
4. Cada submundo nuevo (temporada, colección, campaña) hereda las reglas
   automáticamente y solo puede jugar con las variables libres — cero riesgo de
   que a alguien "se le olvide" una regla al armar una campaña nueva.
5. El resultado no es que Laura trabaje menos importante — es que deja de cargar
   sola la responsabilidad de recordar todas las reglas cada vez que alguien
   genera algo. El sistema las recuerda por ella, siempre, sin cansarse.

## Qué hay aquí

- **`root.json`** — los datos: los 11 invariantes, las variables libres, el catálogo,
  la voz de marca, los bloques de prompt ya redactados (`invariant_block`,
  `negative_prompt`). Editar esto es editar la marca.
- **`schema.json`** — el reglamento: define qué forma puede tener un "submundo"
  (temporada, colección o proyecto) y qué le está prohibido. Un submundo que declara
  sus propios invariantes, o que intenta liberar un término bloqueado (pies, texto,
  IP de personajes), es inválido — el schema lo rechaza, no depende de que alguien
  se dé cuenta a ojo.
- **`submundos/`** — cada temporada/colección/proyecto como su propio archivo JSON,
  que hereda del root y solo puede tocar `overrides` de variables libres.
- **`validar_marca.py`** — corre el schema contra cualquier submundo:
  ```bash
  python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
  python validar_marca.py submundos/verano.json
  python validar_marca.py --todos
  ```
- **`index.html`** — una vista visual de `root.json`, en vivo (lee el archivo cada
  vez que se abre, así que si `root.json` cambia, la página se actualiza sola sin
  que nadie tenga que editar dos lugares). Publicada en GitHub Pages en
  **https://dacolora.github.io/happyflops-brand-matrix/** — una URL real para
  compartir con quien sea, sin depender de acceso de invitado a Notion. Se
  actualiza sola con cada `git push` a `main`. También se puede ver local con
  `python3 -m http.server` desde esta carpeta y entrando a
  `http://localhost:8000`.
- **`servidor_editor.py`** — la misma página de arriba, pero editable: corré
  `python3 servidor_editor.py` en vez de `python3 -m http.server` y en
  `http://localhost:8000` cada sección (qué es la marca, las 11 invariantes,
  variables libres, categorías, colores) tiene un botón "Editar" que guarda
  directo en `root.json`, con una copia de respaldo automática en
  `root.backups/` antes de cada guardado. Publicada en GitHub Pages, la misma
  página sigue siendo de solo lectura — no hay servidor ahí atrás. Ojo: editar
  invariantes o colores acá no actualiza `prompt_blocks` (`invariant_block`,
  `negative_prompt`) dentro de `root.json` ni la página de Notion — eso hay
  que actualizarlo a mano.

## Cómo se trabaja aquí

1. Abre esta carpeta con **Claude Code** (`claude` en la terminal, o la app). Ya
   sabe cómo funciona todo este sistema por el `CLAUDE.md` — no hace falta
   explicarle nada de cero cada vez, a diferencia de abrir un chat nuevo.
2. Sube tus imágenes de referencia a Google Drive, como ya haces naturalmente —
   no hace falta bajarlas ni subirlas a este repo. Cuando tengas una carpeta
   lista, dile a Claude Code "las fotos de tal colección están en esta carpeta
   de Drive" y las lee directo de ahí (Claude Code ya tiene un conector de
   Drive activo en esta sesión — nada nuevo que instalar ni autorizar). Después
   dile qué quieres cambiar o agregar — un submundo nuevo, ajustar un
   invariante, lo que sea.
3. Antes de dar algo por bueno, corre `python validar_marca.py --todos` — si algo
   rompe una regla, te dice exactamente cuál y por qué.
4. Guarda los cambios (commit + push). Si no quieres tocar la terminal para eso,
   pide que te dejen un botón/script de un clic.

Notion sigue siendo la puerta humana — la narrativa, las explicaciones, para
cualquiera que quiera entender el "por qué" sin tocar JSON. Este repo es lo que
hay debajo, y lo que cualquier herramienta real (como el pipeline de generación de
video) consulta para no salirse nunca de la marca.

## Cómo se conecta con iaplusyou

`iaplusyou` (el pipeline que genera y publica los videos) monta este repo como
**git submodule** en `clientes/happyflops/marca/`. No hay una copia de `root.json`
y `schema.json` viviendo aparte — es literalmente este repo. Cualquier cambio que
se comitee aquí y se actualice del lado de `iaplusyou` (`git submodule update
--remote`) se refleja directo en la próxima generación de prompts/imágenes/videos
para Happy Flops. Si algo cambia acá y rompe algo allá, el punto de partida para
depurarlo es siempre este repo, no el otro.

## Así sería su día a día de ahora en adelante

Esto reemplaza, con el tiempo, el flujo de "escribir todo en prosa en Notion":

1. Laura toma o recibe fotos nuevas (una colección, una temporada, un producto
   nuevo).
2. Abre este repo con Claude Code (o le pide a Daniel que lo haga con ella) y le
   pasa las fotos: *"esto es la colección de Navidad, arma el submundo"*.
3. Claude arma el JSON, corre `validar_marca.py` solo, y si algo choca con un
   invariante se lo dice ahí mismo — antes de que ese error llegue a producción.
4. Ella revisa, ajusta lo que quiera con sus propias palabras, y se guarda con un
   commit. Ese commit queda en el historial para siempre, con su fecha y su razón.
5. `iaplusyou` ya está leyendo ese submodule — no hay un paso extra de "avisarle a
   alguien que hay una regla nueva". Existe desde el momento en que se comitea.
6. Si algo del root necesita cambiar (una regla que ya no aplica, una excepción
   real), eso se registra como `root_feedback` en el submundo correspondiente —
   nunca se sobreescribe el invariante directamente. Ella decide root; el
   submundo solo puede *proponer*.

Notion no desaparece del todo — sigue siendo útil para explicarle el "por qué" a
alguien que nunca va a tocar JSON — pero deja de ser el lugar donde vive la verdad.

## Qué necesitamos de Laura, y por qué (en orden de cuánto bloquea)

- [ ] **Reference pack (ZIP).** Fotos reales de cada modelo/colorway: fondo neutro,
  2–3 ángulos por par (frente, arriba, 3/4), nombre de archivo descriptivo (no
  `IMG_1234.jpg`). Sin esto el invariante 6 (`product_fidelity` — "el producto
  coincide con el reference pack aprobado, nunca descrito-y-esperado") no se
  puede hacer cumplir de verdad; es su propio ítem #1 en "Open items", marcado
  `blocked`. Hoy 18 de 19 productos del Product Catalog dicen `reference_pack:
  Missing`, solo uno dice `Partial`.
- [ ] **Antes de pedirle un Drive nuevo: que revise iCloud.** Su propia nota en
  Notion dice que buena parte del material de Happy Flops en su Mac está
  *offloaded* a iCloud sin descargar — carpetas `NEW SOCIAL MEDIA`, `SVG`,
  `AI HF`, `FUENTES HAPPY FLOPS`. Paso literal: en Finder, clic derecho sobre esas
  carpetas → "Descargar ahora". Es muy posible que el reference pack ya exista
  ahí adentro y solo esté atrapado en la nube.
- [ ] **Colourway hex/Pantone, por color.** "Bordeaux Red" no es una instrucción
  — cada generación lo va a interpretar distinto, y el color es el único fallo de
  esta lista que cuesta plata directo: alguien que recibe un burdeos distinto al
  de la foto, lo devuelve.
- [ ] **Su aprobación (o corrección) de la propuesta de schema v0.4.** Descubierto
  leyendo su Notion en vivo: la propia colección LUZ dice explícito que
  `schema.json` v0.3 (la que vive hoy en este repo) **no puede representar un
  archivo de trunk** — el `id` pattern, el `layer` enum y `references[]` lo
  rechazan tal cual. Ella ya lo tiene marcado como "edit raised; correction in
  progress" del lado de Notion — necesitamos esa propuesta, o que confirme que
  la derivemos nosotros del schema actual, antes de poder meter LUZ (o cualquier
  otro trunk) en `submundos/` de verdad.
- [ ] **Las otras cinco colecciones trunk**, si ya las tiene empezadas en algún
  lado: `felicidad`, `poses`, `modelos`, `imperfecciones`, `material`. Hoy solo
  existe `LUZ — trunk collection` como página en su Notion — las otras cinco no
  aparecen todavía en su sidebar.
- [ ] **Los 37 archivos de imagen reales de LUZ.** Hoy los nombres (`LUZ-01`,
  `LUZ-23`...) son slugs provisionales, no archivos reales — llegan con el
  reference pack o aparte.
- [ ] **Cerrar los huecos de cobertura que su propia colección LUZ ya identificó**:
  cero evidencia de `winter_indoor`, casi nada de `photoshoot` (luz de estudio),
  `street` débil (solo 2 referencias), `characters` vacío. No es urgente, pero es
  trabajo que ya sabe hacer y que directamente mejora qué tan bien generamos
  contenido para esos mundos.
- [ ] **Decisión sobre ítems menores de su propio "Open items"**: aprobar (o
  cambiar) la convención de nombres propuesta
  (`HF_{context}_{product}_{colourway}_{season}_{ratio}_{version}`), fijar el
  hero angle por producto, dos confirmaciones legales pendientes (claims de
  confort/salud, disclosure de IA en la UE), aclarar si `happyflopsuniverse.com`
  (404 hoy) es un dominio real o si el destino sigue siendo `happyflops.com`,
  URLs de Figma, y conectar Instagram.
- [ ] **Opcional — compartir la página de Notion con una integración**, no solo
  con una persona. Hoy Daniel tiene acceso de invitado humano
  (`dacoloradog@gmail.com`) pero no hay integración conectada, así que cualquier
  lectura en vivo depende de manejar un navegador ya logueado. Si más adelante
  se quiere automatizar la lectura (sin depender de un navegador humano), esto
  es lo que falta.
