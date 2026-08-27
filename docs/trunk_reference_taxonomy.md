# Taxonomía de referencias del tronco (trunk) — propuesta de trabajo

Este documento no es parte de la fuente de verdad (`root.json` / `schema.json`) — es
una propuesta de organización para las referencias que Laura tiene en Google Drive,
mientras se resuelve la aprobación del schema v0.4 para archivos de trunk (ver
"Pendientes" en el [README](../README.md)). Una vez aprobado ese schema, este
documento es la base para convertir las carpetas de Drive en archivos reales de
`submundos/` (o donde termine viviendo el trunk).

## Aclaración crítica: inspiración de terceros vs. producto propio

**Todas las carpetas de Drive analizadas hasta ahora son inspiración/moodboard de
otras marcas y otras personas — ninguna contiene fotografía del producto real de
Happy Flops.** Cuando una referencia muestra un logo, silueta de calzado o producto
de otra marca (Prada, Rhode, Salomon, Yeezy, etc.), eso es normal y esperado — es
material de inspiración, no algo que deba tratarse como "así se ve nuestro
producto". Ninguna carpeta de este documento debe leerse como reference pack de HF.

Laura enviará por separado, más adelante, las referencias que sí son fotografía real
del producto propio (cómo se pone, cómo se ve en cada temporada, etc.). Cuando eso
llegue, cada entrada debe marcarse con un campo `source_type` explícito:
- `source_type: third_party_inspiration` — todo lo documentado hasta ahora.
- `source_type: own_product` — lo que llegue después, evidencia real de HF.

Esta distinción importa para no confundir "de dónde sacamos el tono/luz/emoción"
(inspiración de terceros, válida) con "así se ve el producto que vendemos"
(invariante 6, `product_fidelity` — solo puede venir de fotografía propia).

## El problema que resuelve

Las referencias que Laura ya tiene organizadas en Drive responden a **dos preguntas
distintas**, no una sola:

1. **¿De qué es evidencia?** — el invariante o principio de marca que ilustra.
2. **¿Dónde aplica?** — en qué categorías/subcategorías es válida esa evidencia.

Tratar todo como una sola lista plana de "colecciones" pierde esa distinción. Esta
propuesta separa las carpetas de Drive en tres tipos según lo que realmente son.

## Tipo 1 — Trunks de contenido

Viven en su propia carpeta de Drive. Cada referencia dentro de ellas es evidencia
directa de un invariante o principio de marca, siguiendo el mismo patrón que ya usa
LUZ en Notion (`direction`, `quality`, `source`, `works_because`, `illustrates`,
`verdict`).

| Trunk | Carpeta Drive | Qué es | `applies_to` (categorías) |
|---|---|---|---|
| `luz` | `1 LIGHTNING` | Evidencia del invariante 1 (luz). Ya documentado a fondo en Notion — 37 referencias. | lifestyle, photoshoot, render_3d |
| `felicidad` | `1 HAPPY` | Cómo se ve la felicidad para Happy Flops — no solo sonrisas, todo el momento. | lifestyle, photoshoot |
| `modelos` | `1 MODELS` | Diversidad de casting (invariante 7) — niños, jóvenes, adultos. | lifestyle, photoshoot |
| `poses` (producto) | `Z POSES` | Cómo se ve/comporta el producto puesto: pies, cómo voltea, cómo se dobla. | lifestyle, photoshoot, render_3d |
| `poses` (modelo) | `1 POSES` | Lenguaje corporal de los modelos. | lifestyle, photoshoot |
| `material` | `Z Producto EVA` | Cómo se comporta el material EVA — flexibilidad, apariencia, uso. Referencia de material, no de producto propio. | lifestyle, photoshoot, render_3d |

**Nota sobre `poses`:** por ahora se trabaja como un solo trunk con dos subtipos
(`product_poses` y `model_poses`) en vez de forzarlo a una sola definición o dividirlo
en dos trunks separados. Es una decisión provisional — revisar cuando se apruebe el
schema v0.4.

**Nota sobre `modelos`:** una misma referencia puede alimentar más de un trunk a la
vez. Una foto de un modelo feliz en una pose específica se etiqueta `illustrates:
modelos` pero también puede llevar tags secundarios (`felicidad`, `poses_modelo`,
`outfits`) — no hace falta elegir una sola caja.

## Tipo 2 — Trunk de calidad transversal

`imperfecciones` no tiene carpeta propia en Drive. No es un tema aparte — es una
cualidad que ya está presente en la mayoría de las referencias seleccionadas: grano,
movimiento, textura real, algo que no se ve retocado/perfecto/plástico. Se etiqueta
como tag secundario sobre las fotos de los demás trunks, no como una colección propia.
`applies_to`: lifestyle, photoshoot, y probablemente render_3d (evitar que el 3D se
vea demasiado limpio/artificial).

## Tipo 3 — Banco de variables libres

No son trunk — no prueban un invariante, son ejemplos de "dónde/cuándo" para cuando
se arme un submundo nuevo. Solo aplican dentro de `lifestyle` (ver `tree` en
`root.json`: "exterior/interior + seasons under lifestyle").

| Carpeta Drive | Variable libre | Valor |
|---|---|---|
| `1 HOUSE` | `scenario` | `home` (interior) |
| `ARENA` | `scenario` | `nature` (playa/arena) — **solo 5 imágenes, la más débil de todas** |
| `Z SUMMER` | `season` | `summer` |
| `1 AUTUM` | `season` | `autumn` |
| `1 WINTER` | `season` | `winter_outdoor` / `winter_indoor` |
| `1 OUTFITS` | `styling` | variado, cruza con casting (edades) |

## Huecos identificados

- `ARENA` (scenario=nature) tiene muy poca evidencia — 5 imágenes.
- Faltan bancos para `scenario: street` y `scenario: friends_and_family`.
- Falta banco para `season: spring`.
- Casi todos los archivos de Drive son `Untitled.jpg` o conservan el nombre de origen
  (parecen guardados tipo Pinterest/Are.na, no fotografía propia) — mismo problema de
  nomenclatura ya documentado en Open Items para el reference pack de producto, pero
  aplicado a las referencias de trunk.

## Siguiente paso

Una vez Laura apruebe (o corrija) esta taxonomía, el trabajo de sacar el JSON
campo-por-campo de cada imagen real (siguiendo el patrón de LUZ) puede empezar
carpeta por carpeta. Ver `docs/trunk_drafts/` para los primeros borradores.
