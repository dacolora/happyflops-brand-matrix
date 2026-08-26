# Visión — de Happy Flops a un motor de marca

Este documento no es una spec técnica — es el "para qué" detrás de `root.json`,
`schema.json` y el editor. Lo escribo acá, aparte, porque mezcla dos cosas
distintas: lo que ya construimos y funciona hoy para Happy Flops, y hacia dónde
podría crecer esto si algún día se convierte en algo más grande que una sola
marca. No confundir una cosa con la otra — lo primero es real, lo segundo es
una apuesta.

## Qué es esto hoy, en una frase

Convertimos lo que antes vivía solo en la cabeza de Laura y en prosa de Notion
en algo que una máquina puede leer, validar y hacer cumplir — y le dimos a
Laura una forma de seguir editándolo sin tocar código ni depender de nadie
para cambios chicos.

## Los archivos que existen, y qué es cada uno de verdad

| Archivo | Qué es | Qué tan específico de Happy Flops es |
|---|---|---|
| `schema.json` | La FORMA que puede tener cualquier marca definida así: cuántos niveles tiene su árbol, qué es un invariante, qué es una variable libre, qué es una referencia. | Casi nada — no dice nada de sandalias. Dice "una marca tiene invariantes, variables libres y una jerarquía". |
| `root.json` | El CONTENIDO específico de Happy Flops: sus 11 reglas, sus colores, su catálogo, su voz. | Todo — es lo único realmente específico de la marca en todo el sistema. |
| `editor_backend.py` / `servidor_editor.py` / `editor.js` | La interfaz para que el dueño de la marca edite ese contenido sin saber JSON. | Ninguno — el editor no sabe que existe Happy Flops, solo sabe editar "lo que sea que haya en root.json". |
| `validar_marca.py` | El árbitro: nada se puede llamar "on-brand" sin pasar por acá. | Ninguno — valida cualquier submundo contra cualquier schema. |
| `index.html` | La vista pública, de solo lectura, publicable en cualquier lado. | Ninguno en su código; todo el contenido específico viene de `root.json`. |

**La implicación que no es obvia:** ya está construido de una forma que, si
mañana se le pone el `root.json` de otra marca a una copia vacía de este
repo, el mismo editor y el mismo validador funcionan sin cambios. La
separación "estructura genérica vs. contenido específico" ya está hecha, sin
que nos lo hayamos propuesto — es consecuencia directa de seguir al pie de la
letra la regla de `CLAUDE.md`: los invariantes viven solo en `root.json`.

## Lo que falta para que esto sea un motor, no una casualidad técnica

1. **El proceso de descubrimiento, no la herramienta.** Lo que de verdad no
   se puede copiar-pegar es cómo Laura llegó a sus 11 invariantes — las "100
   preguntas" que menciona `CLAUDE.md`. Esa es la propiedad intelectual real:
   la metodología de entrevista que convierte "quiero definir mi marca" en un
   `root.json` completo. La herramienta es el motor; esa metodología es el
   mapa.
2. **Un kit inicial vacío.** Un `root.json` plantilla con la forma (invariantes
   en blanco, estructura de árbol) pero sin contenido de Happy Flops, para
   arrancar una marca nueva desde cero con el mismo motor.
3. **Una decisión de arquitectura multi-marca**, el día que aparezca la
   marca número dos: un repo por marca (simple, cada una con su propio
   historial de git) vs. una sola app con selector de marca (mucho más grande
   de construir, estilo SaaS). No hay que decidirlo ahora.

## Dónde entran las estadísticas — lo genuinamente nuevo, y lo que no existe todavía

Cada referencia de una colección trunk (como LUZ) ya tiene un campo
`illustrates` (qué invariante ilustra) y `verdict` (exemplar o rechazada).
Sin que nadie lo haya pensado así todavía, eso es el principio de un
dataset. El salto real sería: cuando `iaplusyou` genere contenido real y ese
contenido tenga resultados medibles (ventas, engagement), conectar esos
resultados de vuelta a qué invariantes y variables se usaron. Ahí el brand
matrix deja de ser "un reglamento estático" y se vuelve "un reglamento con
feedback" — no solo le decís a la marca cuáles son sus reglas, le mostrás
cuáles de esas reglas realmente le mueven la aguja.

Esto es fase 2. Hoy no existe el puente entre "contenido generado" y
"resultado medible". El diseño actual ya deja la puerta abierta sin querer,
pero conectar ese puente es trabajo real, no una casualidad más.

## Roadmap cercano (lo que se está pidiendo ahora, concretamente)

- [ ] **Flujo de referencias vía Drive.** Laura sube fotos a Google Drive
  como ya hace naturalmente; cuando tiene una carpeta lista, se lo dice a
  Claude Code en el chat y Claude las lee directo con el conector de Drive
  ya activo en esta sesión — sin credenciales nuevas, sin botón nuevo en la
  página, sin subir nada a GitHub. Documentado en el README.
- [ ] **Más colecciones trunk (referentes/modelos).** Hoy solo existe LUZ,
  bloqueada porque `schema.json` v0.7 no puede representar un archivo trunk
  todavía (falta la aprobación de Laura del schema v0.4 — ver "Pendientes"
  en el README). Las otras cinco (felicidad, poses, modelos, imperfecciones,
  material) esperan lo mismo. Una vez resuelto eso, el editor puede
  extenderse con el mismo patrón que ya usamos para las 5 secciones de
  `root.json` — sección por sección, con el mismo botón "Editar".
- [ ] **Modelos de auditoría.** Hoy `validar_marca.py` responde "¿esto rompe
  una regla?". Falta la otra pregunta que el propio README ya identificó:
  "¿dónde hay huecos de cobertura?" — qué mundos/temporadas/escenarios no
  tienen ninguna referencia todavía (el ejemplo real ya documentado:
  `winter_indoor` sin evidencia en LUZ). Es un script corto sobre
  `submundos/*.json`, no una herramienta nueva — mismo patrón de "cero
  esfuerzo, siempre actualizada" que ya tiene el validador.
- [ ] **Seguir mostrando avances a Santiago.** El link público
  (`https://dacolora.github.io/happyflops-brand-matrix/`) ya es un lugar
  real para mostrar el sistema completo sin depender de compartir acceso de
  invitado a Notion. Cada sección nueva que se vuelve editable, cada
  colección trunk que se resuelve, es un avance concreto y visible ahí
  mismo — no hace falta preparar una demo aparte.

## Lo que esto NO es, todavía

No es un producto multi-marca, no tiene un onboarding para una marca nueva,
no tiene el puente de estadísticas descrito arriba, y no debería empezar a
construirse como tal hasta que exista una segunda marca real pidiéndolo. Lo
bueno: nada de lo construido hasta ahora hay que deshacerlo para llegar
ahí — la separación entre estructura genérica y contenido específico que ya
tenemos es exactamente la base que se necesitaría ese día.
