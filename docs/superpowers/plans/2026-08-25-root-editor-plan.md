# Editor en vivo de root.json — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `index.html`, corriendo con un servidor local nuevo, permita editar directamente en el navegador 5 secciones de `root.json` (marca/somos/no-somos, las 11 invariantes, variables libres, las 3 categorías, sistema de color) y guardarlas en el archivo, sin tocar JSON a mano y sin romper el uso de `index.html` como página estática de solo lectura en GitHub Pages.

**Architecture:** Un servidor Python nuevo (`servidor_editor.py`, solo librería estándar) sirve los archivos estáticos igual que `python3 -m http.server` y además expone `GET /api/health` y `POST /api/root`. `index.html` detecta si ese servidor está disponible y, si lo está, `editor.js` inyecta un botón "Editar" por sección que arma un formulario, lo manda por `POST /api/root`, y vuelve a pintar la página entera desde el `root.json` recién guardado. La lógica de validación/backup vive separada en `editor_backend.py`, sin nada de red, para poder probarla con tests rápidos.

**Tech Stack:** Python 3 stdlib (`http.server`, `json`, `unittest`) — sin dependencias nuevas. HTML/CSS/JS vanilla — sin frameworks ni build step, seteguiendo el estilo ya existente de `index.html`.

**Spec:** [docs/superpowers/specs/2026-08-25-root-editor-design.md](../specs/2026-08-25-root-editor-design.md)

## Global Constraints

- Cero dependencias nuevas: solo lo que ya está en `requirements.txt` (`jsonschema`, no usado por este feature) más la librería estándar de Python. Sin Node/npm.
- El servidor escucha en `localhost` únicamente (por default puerto `8000`, igual que el `python3 -m http.server` que ya documenta el README).
- Las únicas 5 claves de `root.json` editables vía API son exactamente: `brand`, `invariants`, `free_variables`, `categories`, `colour_system`. Cualquier otra clave se rechaza con `400`.
- `invariants` debe conservar siempre exactamente 11 elementos con `id` 1..11 en orden — la UI nunca ofrece agregar ni quitar una invariante.
- Antes de cada guardado se crea un backup con fecha en `root.backups/` (gitignorado) y se conservan solo los últimos 20.
- El servidor nunca hace commit ni push de git — guardar el archivo y comitearlo son pasos separados, tal como ya documenta el README.
- `index.html` servido de forma estática (GitHub Pages, o el viejo `python3 -m http.server`) debe seguir funcionando exactamente igual que hoy — de solo lectura, sin errores de consola, sin depender de la API nueva.

---

## Task 1: `editor_backend.py` — validación y backups (lógica pura, sin red)

**Files:**
- Create: `editor_backend.py`
- Test: `test_editor_backend.py`

**Interfaces:**
- Produces: `ALLOWED_KEYS: set[str]`, `class ActualizacionInvalida(ValueError)`,
  `validar_actualizacion(key: str, value) -> None` (levanta `ActualizacionInvalida` si algo no cierra),
  `aplicar_actualizacion(root_data: dict, key: str, value) -> dict` (devuelve un dict nuevo, no muta el original),
  `crear_backup(root_json_path: str, backups_dir: str, ahora: datetime.datetime | None = None, mantener: int = 20) -> str | None`.

- [ ] **Step 1: Escribir los tests, todos fallando (el módulo no existe todavía)**

Crear `test_editor_backend.py`:

```python
import datetime
import json
import os
import tempfile
import unittest

import editor_backend as eb


class ValidarActualizacionTest(unittest.TestCase):
    def test_clave_no_permitida_rechazada(self):
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("schema_version", "1.0.0")

    def test_clave_permitida_no_falla(self):
        eb.validar_actualizacion("brand", {"name": "Happy Flops"})

    def test_valor_de_forma_incorrecta_rechazado(self):
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("brand", "esto no es un objeto")

    def test_invariantes_con_menos_de_once_rechazadas(self):
        value = [{"id": i, "name": "x", "rule": "y"} for i in range(1, 11)]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_con_ids_desordenados_rechazadas(self):
        value = [{"id": i, "name": "x", "rule": "y"} for i in range(1, 12)]
        value[0], value[1] = value[1], value[0]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_completas_y_en_orden_no_fallan(self):
        value = [{"id": i, "name": "x", "rule": "y"} for i in range(1, 12)]
        eb.validar_actualizacion("invariants", value)


class AplicarActualizacionTest(unittest.TestCase):
    def test_reemplaza_solo_la_clave_pedida(self):
        original = {"brand": {"name": "Happy Flops"}, "version": "0.10.1"}
        actualizado = eb.aplicar_actualizacion(original, "brand", {"name": "Nuevo"})
        self.assertEqual(actualizado["brand"], {"name": "Nuevo"})
        self.assertEqual(actualizado["version"], "0.10.1")
        self.assertEqual(original["brand"], {"name": "Happy Flops"})


class CrearBackupTest(unittest.TestCase):
    def test_crea_copia_con_fecha(self):
        with tempfile.TemporaryDirectory() as tmp:
            root_path = os.path.join(tmp, "root.json")
            with open(root_path, "w") as f:
                json.dump({"a": 1}, f)
            backups_dir = os.path.join(tmp, "root.backups")
            destino = eb.crear_backup(
                root_path, backups_dir, ahora=datetime.datetime(2026, 8, 25, 10, 30, 0)
            )
            self.assertTrue(os.path.exists(destino))
            self.assertIn("root.20260825-103000.json", destino)
            with open(destino) as f:
                self.assertEqual(json.load(f), {"a": 1})

    def test_conserva_solo_los_ultimos_n_backups(self):
        with tempfile.TemporaryDirectory() as tmp:
            root_path = os.path.join(tmp, "root.json")
            with open(root_path, "w") as f:
                json.dump({"a": 1}, f)
            backups_dir = os.path.join(tmp, "root.backups")
            for i in range(5):
                eb.crear_backup(
                    root_path, backups_dir,
                    ahora=datetime.datetime(2026, 8, 25, 10, 0, i), mantener=3,
                )
            archivos = sorted(os.listdir(backups_dir))
            self.assertEqual(len(archivos), 3)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr los tests y confirmar que fallan por `ModuleNotFoundError`**

Run: `python3 -m unittest test_editor_backend.py -v`
Expected: `ModuleNotFoundError: No module named 'editor_backend'` (o similar) en todos los tests.

- [ ] **Step 3: Implementar `editor_backend.py`**

```python
"""
Lógica pura para el editor en vivo de root.json: qué claves se pueden
tocar, cómo se valida cada una, y cómo se hace el backup antes de
sobreescribir. Sin nada de red acá — eso vive en servidor_editor.py — para
poder probar esta lógica con tests rápidos que no levantan un servidor.
"""
import datetime
import glob
import os
import shutil

ALLOWED_KEYS = {"brand", "invariants", "free_variables", "categories", "colour_system"}


class ActualizacionInvalida(ValueError):
    pass


def validar_actualizacion(key, value):
    if key not in ALLOWED_KEYS:
        raise ActualizacionInvalida(
            f"'{key}' no es una sección editable. Las válidas son: {sorted(ALLOWED_KEYS)}."
        )
    if key == "invariants":
        if not isinstance(value, list) or len(value) != 11:
            raise ActualizacionInvalida("Las invariantes tienen que seguir siendo exactamente 11.")
        ids = [item.get("id") for item in value if isinstance(item, dict)]
        if ids != list(range(1, 12)):
            raise ActualizacionInvalida(
                "Las invariantes tienen que mantener sus ids 1 a 11 en orden, sin agregar ni quitar ninguna."
            )
    elif not isinstance(value, dict):
        raise ActualizacionInvalida(f"'{key}' tiene que ser un objeto JSON, no {type(value).__name__}.")


def aplicar_actualizacion(root_data, key, value):
    nuevo = dict(root_data)
    nuevo[key] = value
    return nuevo


def crear_backup(root_json_path, backups_dir, ahora=None, mantener=20):
    if not os.path.exists(root_json_path):
        return None
    os.makedirs(backups_dir, exist_ok=True)
    ahora = ahora or datetime.datetime.now()
    marca = ahora.strftime("%Y%m%d-%H%M%S")
    destino = os.path.join(backups_dir, f"root.{marca}.json")
    shutil.copyfile(root_json_path, destino)
    _podar_backups(backups_dir, mantener)
    return destino


def _podar_backups(backups_dir, mantener):
    archivos = sorted(glob.glob(os.path.join(backups_dir, "root.*.json")))
    de_mas = archivos[:-mantener] if mantener > 0 else archivos
    for viejo in de_mas:
        os.remove(viejo)
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `python3 -m unittest test_editor_backend.py -v`
Expected: `OK` — 8 tests pasando.

- [ ] **Step 5: Commit**

```bash
git add editor_backend.py test_editor_backend.py
git commit -m "feat: validación y backups puros para el editor de root.json"
```

---

## Task 2: `servidor_editor.py` — servidor local con `/api/health` y `/api/root`

**Files:**
- Create: `servidor_editor.py`
- Test: `test_servidor_editor.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `editor_backend.ALLOWED_KEYS`, `editor_backend.ActualizacionInvalida`,
  `editor_backend.validar_actualizacion`, `editor_backend.aplicar_actualizacion`,
  `editor_backend.crear_backup` (de la Task 1).
- Produces: módulo `servidor_editor` con `ROOT_JSON_PATH`, `BACKUPS_DIR`, `Handler`
  (subclase de `http.server.SimpleHTTPRequestHandler`) y `main()`. `Handler` es lo que
  importan los tests para levantar un servidor real en un puerto efímero.

- [ ] **Step 1: Agregar `root.backups/` a `.gitignore`**

Modificar `.gitignore` (hoy tiene `venv/`, `__pycache__/`, `*.pyc`, `.DS_Store`):

```
venv/
__pycache__/
*.pyc
.DS_Store
root.backups/
```

- [ ] **Step 2: Escribir los tests de integración, fallando (el módulo no existe)**

Crear `test_servidor_editor.py`:

```python
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest import mock

import servidor_editor


class ServidorEditorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root_path = os.path.join(self.tmp.name, "root.json")
        with open(self.root_path, "w", encoding="utf-8") as f:
            json.dump({
                "version": "0.10.1",
                "brand": {"name": "Happy Flops"},
                "invariants": [{"id": i, "name": "x", "rule": "y"} for i in range(1, 12)],
            }, f)
        self.backups_dir = os.path.join(self.tmp.name, "root.backups")

        self._parche_root = mock.patch.object(servidor_editor, "ROOT_JSON_PATH", self.root_path)
        self._parche_backups = mock.patch.object(servidor_editor, "BACKUPS_DIR", self.backups_dir)
        self._parche_root.start()
        self._parche_backups.start()

        self.servidor = ThreadingHTTPServer(("localhost", 0), servidor_editor.Handler)
        self.puerto = self.servidor.server_address[1]
        self.hilo = threading.Thread(target=self.servidor.serve_forever, daemon=True)
        self.hilo.start()

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self._parche_root.stop()
        self._parche_backups.stop()
        self.tmp.cleanup()

    def _url(self, path):
        return f"http://localhost:{self.puerto}{path}"

    def test_health_responde_ok(self):
        with urllib.request.urlopen(self._url("/api/health")) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(json.loads(resp.read()), {"ok": True})

    def test_guardar_clave_no_permitida_devuelve_400(self):
        cuerpo = json.dumps({"key": "schema_version", "value": "hackeado"}).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)
        with open(self.root_path, encoding="utf-8") as f:
            self.assertNotIn("schema_version", json.load(f))

    def test_guardar_invariantes_incompletas_devuelve_400(self):
        cuerpo = json.dumps({
            "key": "invariants",
            "value": [{"id": i, "name": "x", "rule": "y"} for i in range(1, 11)],
        }).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)

    def test_cuerpo_no_json_devuelve_400(self):
        req = urllib.request.Request(
            self._url("/api/root"), data=b"esto no es json", method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)

    def test_guardar_brand_actualiza_archivo_y_crea_backup(self):
        cuerpo = json.dumps({"key": "brand", "value": {"name": "Nuevo Nombre"}}).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
        with open(self.root_path, encoding="utf-8") as f:
            actualizado = json.load(f)
        self.assertEqual(actualizado["brand"], {"name": "Nuevo Nombre"})
        self.assertTrue(os.path.isdir(self.backups_dir))
        self.assertEqual(len(os.listdir(self.backups_dir)), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Correr los tests y confirmar que fallan por `ModuleNotFoundError`**

Run: `python3 -m unittest test_servidor_editor.py -v`
Expected: `ModuleNotFoundError: No module named 'servidor_editor'`.

- [ ] **Step 4: Implementar `servidor_editor.py`**

```python
"""
Sirve la página del brand matrix y expone la API mínima para que el editor
en vivo de root.json (activado en index.html cuando este servidor está
corriendo) pueda guardar cambios directo en el archivo.

Uso:
    python3 servidor_editor.py            # localhost:8000
    python3 servidor_editor.py --port 8080
"""
import argparse
import http.server
import json
import os

import editor_backend as eb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_JSON_PATH = os.path.join(BASE_DIR, "root.json")
BACKUPS_DIR = os.path.join(BASE_DIR, "root.backups")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            self._responder_json(200, {"ok": True})
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/root":
            self._manejar_guardar_root()
            return
        self.send_error(404, "No existe")

    def _manejar_guardar_root(self):
        try:
            largo = int(self.headers.get("Content-Length", 0))
            cuerpo = self.rfile.read(largo)
            payload = json.loads(cuerpo)
            if not isinstance(payload, dict):
                raise ValueError("el cuerpo tiene que ser un objeto JSON")
        except (ValueError, json.JSONDecodeError):
            self._responder_json(400, {"error": "El cuerpo del pedido no es JSON válido."})
            return

        key = payload.get("key")
        value = payload.get("value")

        try:
            eb.validar_actualizacion(key, value)
        except eb.ActualizacionInvalida as e:
            self._responder_json(400, {"error": str(e)})
            return

        with open(ROOT_JSON_PATH, "r", encoding="utf-8") as f:
            root_data = json.load(f)

        eb.crear_backup(ROOT_JSON_PATH, BACKUPS_DIR)
        actualizado = eb.aplicar_actualizacion(root_data, key, value)

        with open(ROOT_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(actualizado, f, indent=2, ensure_ascii=False)
            f.write("\n")

        self._responder_json(200, actualizado)

    def _responder_json(self, status, data):
        cuerpo = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, format, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    servidor = http.server.ThreadingHTTPServer(("localhost", args.port), Handler)
    print(f"Editor corriendo en http://localhost:{args.port}")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Correr los tests y confirmar que pasan**

Run: `python3 -m unittest test_servidor_editor.py -v`
Expected: `OK` — 5 tests pasando.

- [ ] **Step 6: Commit**

```bash
git add servidor_editor.py test_servidor_editor.py .gitignore
git commit -m "feat: servidor local con /api/health y /api/root para el editor"
```

---

## Task 3: scaffolding de edición en `index.html` + primera sección editable (marca)

**Files:**
- Modify: `index.html` (CSS ~línea 156, sección "Qué es la marca" ~línea 220-240, fin de `render()` ~línea 383-388)
- Create: `editor.js`

**Interfaces:**
- Consumes: `GET /api/health`, `POST /api/root` (de la Task 2). `window.__lastRoot`
  (objeto `root` completo, seteado por `index.html` después de cada render).
- Produces: `window.afterRender(root)` — hook que `index.html` llama al final de cada
  `render()`. Funciones compartidas en `editor.js` que las próximas tareas reutilizan:
  `campoLista(label, items, fieldName, itemLabel) -> string`,
  `wireListas(form) -> void`, `leerLista(form, fieldName) -> string[]`,
  `escapeHtml(s) -> string`, `escapeAttr(s) -> string`,
  `attachEditButton(section, buildFormHtml, wireForm) -> void`,
  `guardarSeccion(key, value, form) -> Promise<void>`,
  `attachEditControls(root) -> void` (hoy solo llama a `setupBrand`, las próximas
  tareas le agregan una línea cada una). Nota: `wireListas(contenedor)` acepta tanto
  el `<form>` completo como un sub-bloque (la Task 5 la llama pasándole solo el
  `.variable-block` de una variable, no el formulario entero) — cualquier elemento
  que contenga descendientes `[data-field]` sirve.

- [ ] **Step 1: Agregar el CSS de edición**

En `index.html`, buscar (alrededor de la línea 156):

```html
  @media (max-width: 700px) {
    .grid-2 { grid-template-columns: 1fr; }
  }
```

Reemplazar por:

```html
  .section-head { display:flex; align-items:center; justify-content:space-between; gap: 1rem; }
  .btn-editar {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: .78rem; font-weight: 700; padding: .4rem .9rem;
    border-radius: 999px; border: 1px solid var(--border);
    background: var(--card); color: var(--ink); cursor: pointer;
  }
  .btn-editar:hover { background: var(--sand); }
  .form-edit { display: grid; gap: .9rem; }
  .form-edit label { display:block; font-size:.78rem; font-weight:700; color: var(--muted); margin-bottom:.3rem; }
  .form-edit input[type="text"], .form-edit textarea, .form-edit select {
    width: 100%; padding: .55rem .7rem; border-radius: 8px;
    border: 1px solid var(--border); font-family: inherit; font-size: .92rem;
    background: #fff; color: var(--ink);
  }
  .form-edit textarea { min-height: 4.5rem; resize: vertical; }
  .form-edit input[type="color"] { width: 48px; height: 36px; padding: 2px; border-radius: 8px; border: 1px solid var(--border); }
  .list-editor .item { display:flex; gap:.5rem; align-items:center; margin-bottom:.4rem; }
  .list-editor .item input { flex: 1 1 auto; }
  .btn-remove {
    flex: 0 0 auto; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border);
    background: #fbeaea; color: #a83c3c; font-weight: 700; cursor: pointer;
  }
  .btn-add {
    align-self: flex-start; font-size:.82rem; font-weight:700; padding:.4rem .8rem;
    border-radius: 8px; border: 1px dashed var(--border); background: transparent; color: var(--muted); cursor: pointer;
  }
  .form-actions { display:flex; gap:.6rem; align-items:center; }
  .btn-guardar {
    font-weight:700; padding:.55rem 1.2rem; border-radius: 999px; border: none;
    background: linear-gradient(135deg, var(--yellow-a), var(--yellow-b)); color: var(--ink); cursor: pointer;
  }
  .btn-cancelar {
    font-weight:700; padding:.55rem 1.2rem; border-radius: 999px; border: 1px solid var(--border);
    background: transparent; color: var(--muted); cursor: pointer;
  }
  .form-error { color: #a83c3c; font-size: .85rem; }
  .variable-block { border: 1px solid var(--border); border-radius: 10px; padding: .8rem; margin-bottom: .6rem; }

  @media (max-width: 700px) {
    .grid-2 { grid-template-columns: 1fr; }
  }
```

- [ ] **Step 2: Envolver la sección "Qué es la marca" con `data-section` y `.section-body`**

Buscar (alrededor de la línea 221):

```html
  contenido.appendChild(el(`
    <section>
      <h2>Qué es la marca</h2>
      <div class="card hero-def">
        <div><strong>${brand.name}</strong> ${brand.definition || ''}</div>
        <div style="margin-top:.8rem;color:var(--muted);font-size:.92rem;">${brand.promise || ''}</div>
        ${brand.origin_story ? `<div style="margin-top:.8rem;font-size:.88rem;color:var(--muted);">Origen: ${brand.origin_story}</div>` : ''}
      </div>
      <div class="grid-2" style="margin-top:1rem;">
        <div class="card" style="padding:1.1rem 1.3rem;">
          <div style="font-weight:700;margin-bottom:.5rem;">Somos</div>
          <div class="chip-row">${(brand.we_are || []).map(v => `<span class="chip yes">${v}</span>`).join('')}</div>
        </div>
        <div class="card" style="padding:1.1rem 1.3rem;">
          <div style="font-weight:700;margin-bottom:.5rem;">No somos</div>
          <div class="chip-row">${(brand.we_are_not || []).map(v => `<span class="chip no">${v}</span>`).join('')}</div>
        </div>
      </div>
    </section>
  `));
```

Reemplazar por:

```html
  contenido.appendChild(el(`
    <section data-section="brand">
      <div class="section-head"><h2>Qué es la marca</h2><span class="edit-slot"></span></div>
      <div class="section-body">
        <div class="card hero-def">
          <div><strong>${brand.name}</strong> ${brand.definition || ''}</div>
          <div style="margin-top:.8rem;color:var(--muted);font-size:.92rem;">${brand.promise || ''}</div>
          ${brand.origin_story ? `<div style="margin-top:.8rem;font-size:.88rem;color:var(--muted);">Origen: ${brand.origin_story}</div>` : ''}
        </div>
        <div class="grid-2" style="margin-top:1rem;">
          <div class="card" style="padding:1.1rem 1.3rem;">
            <div style="font-weight:700;margin-bottom:.5rem;">Somos</div>
            <div class="chip-row">${(brand.we_are || []).map(v => `<span class="chip yes">${v}</span>`).join('')}</div>
          </div>
          <div class="card" style="padding:1.1rem 1.3rem;">
            <div style="font-weight:700;margin-bottom:.5rem;">No somos</div>
            <div class="chip-row">${(brand.we_are_not || []).map(v => `<span class="chip no">${v}</span>`).join('')}</div>
          </div>
        </div>
      </div>
    </section>
  `));
```

- [ ] **Step 3: Agregar el hook `afterRender` y cargar `editor.js`**

Buscar (al final de `render()`, alrededor de la línea 383):

```html
  document.getElementById('pie').textContent =
    `Revisión ${review.frequency || 'periódica'} · próxima: ${review.next_review || '?'} — un documento vivo que nadie abre es un documento muerto con mejor nombre.`;
}

cargar();
</script>
</body>
</html>
```

Reemplazar por:

```html
  document.getElementById('pie').textContent =
    `Revisión ${review.frequency || 'periódica'} · próxima: ${review.next_review || '?'} — un documento vivo que nadie abre es un documento muerto con mejor nombre.`;

  window.__lastRoot = root;
  if (window.afterRender) window.afterRender(root);
}

cargar();
</script>
<script src="editor.js"></script>
</body>
</html>
```

- [ ] **Step 4: Crear `editor.js` con los helpers compartidos y la sección "marca" editable**

```js
(function () {
  let editApiDisponible = false;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function filaLista(valor) {
    return `
      <div class="item">
        <input type="text" value="${escapeAttr(valor)}">
        <button type="button" class="btn-remove" data-action="quitar">×</button>
      </div>
    `;
  }

  function campoLista(label, items, fieldName, itemLabel) {
    const filas = (items || []).map(filaLista).join('');
    return `
      <div data-field="${fieldName}">
        <label>${escapeHtml(label)}</label>
        <div class="list-editor">${filas}</div>
        <button type="button" class="btn-add" data-action="agregar">+ Agregar ${escapeHtml(itemLabel)}</button>
      </div>
    `;
  }

  function wireQuitarBotones(editor) {
    editor.querySelectorAll('[data-action="quitar"]').forEach(btn => {
      btn.onclick = () => btn.closest('.item').remove();
    });
  }

  function wireListas(contenedor) {
    contenedor.querySelectorAll('[data-field]').forEach(campo => {
      const editor = campo.querySelector('.list-editor');
      if (!editor) return;
      const addBtn = campo.querySelector('[data-action="agregar"]');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          editor.insertAdjacentHTML('beforeend', filaLista(''));
          wireQuitarBotones(editor);
        });
      }
      wireQuitarBotones(editor);
    });
  }

  function leerLista(form, fieldName) {
    const campo = form.querySelector(`[data-field="${fieldName}"]`);
    if (!campo) return [];
    return Array.from(campo.querySelectorAll('.list-editor input'))
      .map(input => input.value.trim())
      .filter(v => v.length > 0);
  }

  async function guardarSeccion(key, value, form) {
    const errorEl = form.querySelector('.form-error');
    errorEl.textContent = '';
    try {
      const resp = await fetch('/api/root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        errorEl.textContent = data.error || ('No se pudo guardar (error ' + resp.status + ').');
        return;
      }
      window.cargar();
    } catch (e) {
      errorEl.textContent = 'No se pudo conectar con el servidor. ¿Sigue corriendo servidor_editor.py?';
    }
  }

  function attachEditButton(section, buildFormHtml, wireForm) {
    const slot = section.querySelector('.edit-slot');
    const body = section.querySelector('.section-body');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-editar';
    btn.textContent = 'Editar';
    btn.addEventListener('click', () => {
      btn.style.display = 'none';
      const original = body.innerHTML;
      body.innerHTML = buildFormHtml();
      const form = body.querySelector('form');
      form.querySelector('.btn-cancelar').addEventListener('click', () => {
        body.innerHTML = original;
        btn.style.display = '';
      });
      wireForm(form);
    });
    slot.appendChild(btn);
  }

  function setupBrand(root) {
    const section = document.querySelector('section[data-section="brand"]');
    if (!section) return;
    attachEditButton(section, () => {
      const brand = (window.__lastRoot || root).brand || {};
      return `
        <form class="form-edit" data-key="brand">
          <div>
            <label>Definición</label>
            <textarea name="definition">${escapeHtml(brand.definition)}</textarea>
          </div>
          <div>
            <label>Promesa</label>
            <textarea name="promise">${escapeHtml(brand.promise)}</textarea>
          </div>
          <div>
            <label>Historia de origen</label>
            <textarea name="origin_story">${escapeHtml(brand.origin_story)}</textarea>
          </div>
          <div class="grid-2">
            ${campoLista('Somos', brand.we_are, 'we_are', 'rasgo')}
            ${campoLista('No somos', brand.we_are_not, 'we_are_not', 'rasgo')}
          </div>
          ${campoLista('Valores', brand.values, 'values', 'valor')}
          <div class="form-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
            <span class="form-error"></span>
          </div>
        </form>
      `;
    }, (form) => {
      wireListas(form);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const brandActual = (window.__lastRoot || root).brand || {};
        const brand = Object.assign({}, brandActual, {
          definition: form.definition.value.trim(),
          promise: form.promise.value.trim(),
          origin_story: form.origin_story.value.trim(),
          we_are: leerLista(form, 'we_are'),
          we_are_not: leerLista(form, 'we_are_not'),
          values: leerLista(form, 'values'),
        });
        guardarSeccion('brand', brand, form);
      });
    });
  }

  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
  }

  async function initEdicion() {
    try {
      const resp = await fetch('/api/health', { cache: 'no-store' });
      editApiDisponible = resp.ok;
    } catch (e) {
      editApiDisponible = false;
    }
    if (editApiDisponible && window.__lastRoot) {
      attachEditControls(window.__lastRoot);
    }
  }

  window.afterRender = function (root) {
    attachEditControls(root);
  };

  initEdicion();
})();
```

- [ ] **Step 5: Probar manualmente en el navegador**

Run: `python3 servidor_editor.py`

Abrir `http://localhost:8000` en el browser. Confirmar:
- La página se ve igual que antes (nada roto visualmente en las otras secciones).
- La sección "Qué es la marca" tiene un botón "Editar" arriba a la derecha del título.
- Al hacer click, se ve un formulario con definición/promesa/historia/somos/no somos/valores, precargado con los valores actuales.
- Cambiar la "Promesa" a un texto de prueba, click "Guardar".
- Confirmar en terminal: `git diff root.json` muestra solo el campo `promise` cambiado dentro de `brand`, nada más.
- Confirmar que existe `root.backups/root.<fecha>.json` con el contenido de `root.json` de ANTES del cambio.
- Recargar la página (F5): el nuevo texto de la promesa se sigue viendo, tomado del archivo.
- Deshacer el cambio de prueba desde el mismo editor (volver a poner el texto original, Guardar) para dejar `root.json` como estaba.
- Parar el servidor (Ctrl+C), correr en cambio `python3 -m http.server 8000`, recargar la página: confirmar que YA NO aparece ningún botón "Editar" y no hay errores en la consola del navegador.

- [ ] **Step 6: Commit**

```bash
git add index.html editor.js
git commit -m "feat: editor en vivo para la sección 'marca' de root.json"
```

---

## Task 4: sección editable — las 11 invariantes

**Files:**
- Modify: `editor.js`

**Interfaces:**
- Consumes: `attachEditButton`, `guardarSeccion`, `escapeHtml`, `escapeAttr` (Task 3).
- Produces: `setupInvariants(root)`, llamada agregada dentro de `attachEditControls`.

- [ ] **Step 1: Agregar `setupInvariants` en `editor.js`**

Justo antes de la función `attachEditControls`, agregar:

```js
  function setupInvariants(root) {
    const section = document.querySelector('section[data-section="invariants"]');
    if (!section) return;
    attachEditButton(section, () => {
      const invariants = (window.__lastRoot || root).invariants || [];
      const filas = invariants.map(inv => `
        <div class="variable-block">
          <div style="font-weight:700;margin-bottom:.4rem;">#${inv.id}</div>
          <label>Nombre</label>
          <input type="text" data-id="${inv.id}" data-campo="name" value="${escapeAttr(inv.name)}">
          <label style="margin-top:.5rem;">Regla</label>
          <textarea data-id="${inv.id}" data-campo="rule">${escapeHtml(inv.rule)}</textarea>
        </div>
      `).join('');
      return `
        <form class="form-edit" data-key="invariants">
          ${filas}
          <div class="form-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
            <span class="form-error"></span>
          </div>
        </form>
      `;
    }, (form) => {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const original = (window.__lastRoot || root).invariants || [];
        const value = original.map(inv => ({
          ...inv,
          name: form.querySelector(`[data-id="${inv.id}"][data-campo="name"]`).value.trim(),
          rule: form.querySelector(`[data-id="${inv.id}"][data-campo="rule"]`).value.trim(),
        }));
        guardarSeccion('invariants', value, form);
      });
    });
  }

```

Y en `attachEditControls`, agregar la llamada:

```js
  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
  }
```

- [ ] **Step 2: Probar manualmente en el navegador**

Run: `python3 servidor_editor.py`

Abrir `http://localhost:8000`. En "Los 11 invariantes", click "Editar". Confirmar 11 bloques
con `#1` a `#11`, cada uno con nombre y regla editables, sin ningún botón para agregar o
quitar una fila. Editar el texto de la regla #1 agregando " (prueba)" al final, Guardar.
Confirmar con `git diff root.json` que solo cambió `rule` de la invariante 1, que las otras
10 quedaron intactas, y que el archivo sigue teniendo exactamente 11 invariantes. Deshacer
el cambio de prueba.

- [ ] **Step 3: Commit**

```bash
git add editor.js
git commit -m "feat: editor en vivo para las 11 invariantes"
```

---

## Task 5: sección editable — variables libres (alta, edición y baja)

**Files:**
- Modify: `editor.js`

**Interfaces:**
- Consumes: `attachEditButton`, `guardarSeccion`, `campoLista`, `wireListas`, `leerLista`,
  `escapeHtml`, `escapeAttr` (Task 3).
- Produces: `setupFreeVariables(root)`, llamada agregada dentro de `attachEditControls`.

- [ ] **Step 1: Agregar `setupFreeVariables` y sus helpers en `editor.js`**

Justo antes de `attachEditControls`, agregar:

```js
  let fvContador = 0;

  function bloqueVariable(nombre, v, id) {
    v = v || { type: 'string' };
    return `
      <div class="variable-block" data-fv-id="${id}">
        <label>Nombre de la variable</label>
        <input type="text" class="fv-key" value="${escapeAttr(nombre)}">
        <label>Tipo</label>
        <select class="fv-tipo">
          <option value="string" ${v.type === 'string' ? 'selected' : ''}>Texto libre</option>
          <option value="enum" ${v.type === 'enum' ? 'selected' : ''}>Lista cerrada (enum)</option>
          <option value="object" ${v.type === 'object' ? 'selected' : ''}>Objeto con forma fija</option>
        </select>
        <div class="fv-campos-string" style="${v.type === 'string' ? '' : 'display:none'}">
          <label>Descripción</label>
          <input type="text" class="fv-description" value="${escapeAttr(v.description)}">
          <label>Valor por defecto (opcional)</label>
          <input type="text" class="fv-default" value="${escapeAttr(v.default)}">
        </div>
        <div class="fv-campos-enum" style="${v.type === 'enum' ? '' : 'display:none'}">
          ${campoLista('Valores posibles', v.values, 'fv-values-' + id, 'valor')}
        </div>
        <div class="fv-campos-object" style="${v.type === 'object' ? '' : 'display:none'}">
          <label>Forma (una línea por campo, formato clave:tipo)</label>
          <textarea class="fv-shape">${Object.entries(v.shape || {}).map(([sk, sv]) => sk + ':' + sv).join('\n')}</textarea>
        </div>
        <button type="button" class="btn-remove" data-action="quitar-variable" style="margin-top:.6rem;">Quitar esta variable</button>
      </div>
    `;
  }

  function wireBloqueVariable(bloque) {
    const select = bloque.querySelector('.fv-tipo');
    select.addEventListener('change', () => {
      bloque.querySelector('.fv-campos-string').style.display = select.value === 'string' ? '' : 'none';
      bloque.querySelector('.fv-campos-enum').style.display = select.value === 'enum' ? '' : 'none';
      bloque.querySelector('.fv-campos-object').style.display = select.value === 'object' ? '' : 'none';
    });
    bloque.querySelector('[data-action="quitar-variable"]').addEventListener('click', () => bloque.remove());
    wireListas(bloque);
  }

  function leerFreeVariables(form) {
    const resultado = {};
    form.querySelectorAll('.variable-block').forEach(bloque => {
      const key = bloque.querySelector('.fv-key').value.trim();
      if (!key) return;
      const tipo = bloque.querySelector('.fv-tipo').value;
      if (tipo === 'string') {
        const description = bloque.querySelector('.fv-description').value.trim();
        const def = bloque.querySelector('.fv-default').value.trim();
        resultado[key] = Object.assign(
          { type: 'string' },
          description ? { description } : {},
          def ? { default: def } : {}
        );
      } else if (tipo === 'enum') {
        const id = bloque.getAttribute('data-fv-id');
        resultado[key] = { type: 'enum', values: leerLista(form, 'fv-values-' + id) };
      } else {
        const shape = {};
        bloque.querySelector('.fv-shape').value.split('\n').forEach(linea => {
          const [sk, sv] = linea.split(':').map(s => (s || '').trim());
          if (sk) shape[sk] = sv || 'string';
        });
        resultado[key] = { type: 'object', shape };
      }
    });
    return resultado;
  }

  function setupFreeVariables(root) {
    const section = document.querySelector('section[data-section="free_variables"]');
    if (!section) return;
    attachEditButton(section, () => {
      const fv = (window.__lastRoot || root).free_variables || {};
      const bloques = Object.entries(fv)
        .map((entry, idx) => bloqueVariable(entry[0], entry[1], 'fv' + idx))
        .join('');
      return `
        <form class="form-edit" data-key="free_variables">
          <div class="variables-lista">${bloques}</div>
          <button type="button" class="btn-add" data-action="agregar-variable">+ Agregar variable</button>
          <div class="form-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
            <span class="form-error"></span>
          </div>
        </form>
      `;
    }, (form) => {
      const lista = form.querySelector('.variables-lista');
      lista.querySelectorAll('.variable-block').forEach(wireBloqueVariable);
      form.querySelector('[data-action="agregar-variable"]').addEventListener('click', () => {
        lista.insertAdjacentHTML('beforeend', bloqueVariable('', { type: 'string' }, 'nueva' + (fvContador++)));
        wireBloqueVariable(lista.lastElementChild);
      });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        guardarSeccion('free_variables', leerFreeVariables(form), form);
      });
    });
  }

```

Y en `attachEditControls`, agregar la llamada:

```js
  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
    setupFreeVariables(root);
  }
```

- [ ] **Step 2: Probar manualmente en el navegador**

Run: `python3 servidor_editor.py`

Abrir `http://localhost:8000`. En "Variables libres", click "Editar". Confirmar que aparece
un bloque por cada variable ya existente (`moment`, `scenario`, `season`, `palette`, etc.)
con el tipo correcto preseleccionado. Cambiar el tipo de una variable de texto libre a
"Lista cerrada" y de vuelta — confirmar que los campos correspondientes se muestran/ocultan.
Click "+ Agregar variable", completar nombre `prueba_tmp` tipo texto libre con una
descripción, Guardar. Confirmar con `git diff root.json` que `free_variables.prueba_tmp`
aparece con la forma esperada (`{"type": "string", "description": "..."}`) y que las
variables existentes no cambiaron. Volver a editar y quitar `prueba_tmp` con su botón
"Quitar esta variable", Guardar de nuevo, confirmar que desapareció del archivo.

- [ ] **Step 3: Commit**

```bash
git add editor.js
git commit -m "feat: editor en vivo para variables libres (alta, edición y baja)"
```

---

## Task 6: sección editable — las 3 categorías

**Files:**
- Modify: `editor.js`

**Interfaces:**
- Consumes: `attachEditButton`, `guardarSeccion`, `campoLista`, `wireListas`, `leerLista`,
  `escapeHtml` (Task 3).
- Produces: `setupCategories(root)`, llamada agregada dentro de `attachEditControls`.

- [ ] **Step 1: Agregar `setupCategories` en `editor.js`**

Justo antes de `attachEditControls`, agregar:

```js
  function setupCategories(root) {
    const section = document.querySelector('section[data-section="categories"]');
    if (!section) return;
    attachEditButton(section, () => {
      const categories = (window.__lastRoot || root).categories || {};
      const claves = ['lifestyle', 'photoshoot', 'render_3d'];
      const bloques = claves.map(k => {
        const cat = categories[k] || {};
        const subNombres = k === 'lifestyle'
          ? Object.keys(cat.subcategories || {})
          : (cat.subcategories_examples || []);
        return `
          <div class="variable-block" data-cat="${k}">
            <div style="font-weight:700;margin-bottom:.4rem;text-transform:capitalize;">${k.replace('_', ' ')}</div>
            <label>Descripción (is)</label>
            <textarea class="cat-is">${escapeHtml(cat.is)}</textarea>
            <label>Nota</label>
            <textarea class="cat-note">${escapeHtml(cat.note)}</textarea>
            ${campoLista('Subcategorías', subNombres, 'sub-' + k, 'subcategoría')}
          </div>
        `;
      }).join('');
      return `
        <form class="form-edit" data-key="categories">
          ${bloques}
          <div class="form-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
            <span class="form-error"></span>
          </div>
        </form>
      `;
    }, (form) => {
      wireListas(form);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const categoriesActuales = (window.__lastRoot || root).categories || {};
        const nuevo = Object.assign({}, categoriesActuales);
        ['lifestyle', 'photoshoot', 'render_3d'].forEach(k => {
          const bloque = form.querySelector(`[data-cat="${k}"]`);
          const is = bloque.querySelector('.cat-is').value.trim();
          const note = bloque.querySelector('.cat-note').value.trim();
          const nombresSub = leerLista(form, 'sub-' + k);
          const catOriginal = categoriesActuales[k] || {};
          if (k === 'lifestyle') {
            const subOriginal = catOriginal.subcategories || {};
            const subcategories = {};
            nombresSub.forEach(nombre => {
              subcategories[nombre] = subOriginal[nombre] || { seasons: true, note: '' };
            });
            nuevo[k] = Object.assign({}, catOriginal, { is, note, subcategories });
          } else {
            nuevo[k] = Object.assign({}, catOriginal, { is, note, subcategories_examples: nombresSub });
          }
        });
        guardarSeccion('categories', nuevo, form);
      });
    });
  }

```

Y en `attachEditControls`, agregar la llamada:

```js
  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
    setupFreeVariables(root);
    setupCategories(root);
  }
```

- [ ] **Step 2: Probar manualmente en el navegador**

Run: `python3 servidor_editor.py`

Abrir `http://localhost:8000`. En "Las tres categorías", click "Editar". Confirmar 3
bloques (lifestyle, photoshoot, render_3d) con `is`/nota editables y su lista de
subcategorías (`exterior`/`interior` para lifestyle; las de `subcategories_examples` para
las otras dos). Agregar una subcategoría de prueba `temporal` a `photoshoot`, Guardar.
Confirmar con `git diff root.json` que `categories.photoshoot.subcategories_examples`
incluye `"temporal"` y que `categories.lifestyle`/`categories.render_3d` no cambiaron.
Quitar `temporal` y Guardar de nuevo para dejar todo como estaba.

- [ ] **Step 3: Commit**

```bash
git add editor.js
git commit -m "feat: editor en vivo para las 3 categorías"
```

---

## Task 7: sección editable — sistema de color

**Files:**
- Modify: `editor.js`

**Interfaces:**
- Consumes: `attachEditButton`, `guardarSeccion`, `campoLista`, `wireListas`, `leerLista`,
  `escapeAttr` (Task 3).
- Produces: `setupColour(root)`, llamada agregada dentro de `attachEditControls`.

- [ ] **Step 1: Agregar `setupColour` en `editor.js`**

Justo antes de `attachEditControls`, agregar:

```js
  function setupColour(root) {
    const section = document.querySelector('section[data-section="colour_system"]');
    if (!section) return;
    attachEditButton(section, () => {
      const colour = (window.__lastRoot || root).colour_system || {};
      const yellow = colour.yellow_gradient || {};
      const blue = colour.blue_gradient || {};
      return `
        <form class="form-edit" data-key="colour_system">
          <div class="grid-2">
            <div>
              <label>Amarillo — desde</label>
              <input type="color" name="yellow_from" value="${escapeAttr(yellow.from || '#fdb716')}">
              <label style="margin-top:.5rem;">Amarillo — hasta</label>
              <input type="color" name="yellow_to" value="${escapeAttr(yellow.to || '#fecd0a')}">
            </div>
            <div>
              <label>Azul — desde</label>
              <input type="color" name="blue_from" value="${escapeAttr(blue.from || '#4797c9')}">
              <label style="margin-top:.5rem;">Azul — hasta</label>
              <input type="color" name="blue_to" value="${escapeAttr(blue.to || '#6bacd5')}">
            </div>
          </div>
          ${campoLista('Neutros', colour.neutrals, 'neutrals', 'color neutro')}
          ${campoLista('Prohibidos', colour.forbidden, 'forbidden', 'término prohibido')}
          <div class="form-actions">
            <button type="submit" class="btn-guardar">Guardar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
            <span class="form-error"></span>
          </div>
        </form>
      `;
    }, (form) => {
      wireListas(form);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const colourActual = (window.__lastRoot || root).colour_system || {};
        const value = Object.assign({}, colourActual, {
          yellow_gradient: Object.assign({}, colourActual.yellow_gradient, {
            from: form.yellow_from.value, to: form.yellow_to.value,
          }),
          blue_gradient: Object.assign({}, colourActual.blue_gradient, {
            from: form.blue_from.value, to: form.blue_to.value,
          }),
          neutrals: leerLista(form, 'neutrals'),
          forbidden: leerLista(form, 'forbidden'),
        });
        guardarSeccion('colour_system', value, form);
      });
    });
  }

```

Y en `attachEditControls`, agregar la llamada final:

```js
  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
    setupFreeVariables(root);
    setupCategories(root);
    setupColour(root);
  }
```

- [ ] **Step 2: Probar manualmente en el navegador**

Run: `python3 servidor_editor.py`

Abrir `http://localhost:8000`. En "Sistema de color", click "Editar". Confirmar 4 selectores
de color (amarillo desde/hasta, azul desde/hasta) precargados con los hex actuales, y las
listas de neutros/prohibidos editables. Agregar un color prohibido de prueba `"prueba_tmp"`,
Guardar. Confirmar con `git diff root.json` que solo `colour_system.forbidden` cambió.
Quitarlo y Guardar de nuevo para dejar todo como estaba.

- [ ] **Step 3: Commit**

```bash
git add editor.js
git commit -m "feat: editor en vivo para el sistema de color"
```

---

## Task 8: documentación

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:** Ninguna — solo texto.

- [ ] **Step 1: Actualizar `README.md`**

Buscar, en la sección "## Qué hay aquí":

```
- **`index.html`** — una vista visual de `root.json`, en vivo (lee el archivo cada
  vez que se abre, así que si `root.json` cambia, la página se actualiza sola sin
  que nadie tenga que editar dos lugares). Ábrela con GitHub Pages (Settings →
  Pages → deploy from `main` / `/root`) para tener una URL real que compartir, o
  local con `python3 -m http.server` desde esta carpeta y entra a
  `http://localhost:8000`.
```

Reemplazar por:

```
- **`index.html`** — una vista visual de `root.json`, en vivo (lee el archivo cada
  vez que se abre, así que si `root.json` cambia, la página se actualiza sola sin
  que nadie tenga que editar dos lugares). Ábrela con GitHub Pages (Settings →
  Pages → deploy from `main` / `/root`) para tener una URL real que compartir, o
  local con `python3 -m http.server` desde esta carpeta y entra a
  `http://localhost:8000`.
- **`servidor_editor.py`** — la misma página de arriba, pero editable: corré
  `python3 servidor_editor.py` en vez de `python3 -m http.server` y en
  `http://localhost:8000` cada sección (qué es la marca, las 11 invariantes,
  variables libres, categorías, colores) tiene un botón "Editar" que guarda
  directo en `root.json`, con una copia de respaldo automática en
  `root.backups/` antes de cada guardado. Publicada en GitHub Pages, la misma
  página sigue siendo de solo lectura — no hay servidor ahí atrás.
```

- [ ] **Step 2: Actualizar `CLAUDE.md`**

Buscar, en la sección "## Commands":

```
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python validar_marca.py submundos/<archivo>.json   # validate one submundo
python validar_marca.py --todos                     # validate everything in submundos/
python3 -m http.server                               # serve index.html locally to preview
```

Reemplazar por:

```
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python validar_marca.py submundos/<archivo>.json   # validate one submundo
python validar_marca.py --todos                     # validate everything in submundos/
python3 -m http.server                               # serve index.html locally to preview (read-only)
python3 servidor_editor.py                           # same page, but editable — saves to root.json
python3 -m unittest discover -p "test_*.py"          # run the editor's test suite
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: documentar servidor_editor.py y cómo correr los tests"
```
