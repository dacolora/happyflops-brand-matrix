# Happy Flops — Brand Matrix

La fuente de verdad del sistema de marca de Happy Flops, en código — no reinterpretada,
no paseada de un chat a otro. Este repo existe para que `root.json` y `schema.json`
nunca se desalineen de lo que Notion (o cualquier otra cosa) muestra, porque **son**
la fuente, no una copia de ella.

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
  que nadie tenga que editar dos lugares). Ábrela con GitHub Pages (Settings →
  Pages → deploy from `main` / `/root`) para tener una URL real que compartir, o
  local con `python3 -m http.server` desde esta carpeta y entra a
  `http://localhost:8000`.

## Cómo se trabaja aquí

1. Abre esta carpeta con **Claude Code** (`claude` en la terminal, o la app). Ya
   sabe cómo funciona todo este sistema por el `CLAUDE.md` — no hace falta
   explicarle nada de cero cada vez, a diferencia de abrir un chat nuevo.
2. Sube tus imágenes de referencia donde te resulte más cómodo (o pídele a Claude
   Code que las describa) y dile qué quieres cambiar o agregar — un submundo nuevo,
   ajustar un invariante, lo que sea.
3. Antes de dar algo por bueno, corre `python validar_marca.py --todos` — si algo
   rompe una regla, te dice exactamente cuál y por qué.
4. Guarda los cambios (commit + push). Si no quieres tocar la terminal para eso,
   pide que te dejen un botón/script de un clic.

Notion sigue siendo la puerta humana — la narrativa, las explicaciones, para
cualquiera que quiera entender el "por qué" sin tocar JSON. Este repo es lo que
hay debajo, y lo que cualquier herramienta real (como el pipeline de generación de
video) consulta para no salirse nunca de la marca.
