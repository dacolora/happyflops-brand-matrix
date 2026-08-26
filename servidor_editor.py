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
CONTENT_LENGTH_MAXIMO = 1_000_000  # root.json hoy pesa <30KB; esto es margen generoso


def content_length_valido(largo) -> bool:
    """True si `largo` (el header Content-Length ya convertido a int) es un
    tamaño de cuerpo aceptable para /api/root."""
    return 0 <= largo <= CONTENT_LENGTH_MAXIMO


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

    def _origen_permitido(self) -> bool:
        origen = self.headers.get("Origin")
        if not origen:
            # Sin header Origin: cubre curl, llamadas same-origin que no lo
            # mandan, y otros usos legítimos de herramientas. Solo rechazamos
            # cuando el header está presente y no matchea.
            return True
        puerto = self.server.server_address[1]
        permitidos = {f"http://localhost:{puerto}", f"http://127.0.0.1:{puerto}"}
        return origen in permitidos

    def _manejar_guardar_root(self):
        if not self._origen_permitido():
            self._responder_json(403, {"error": "Origen no permitido."})
            return

        try:
            largo = int(self.headers.get("Content-Length", 0))
            if not content_length_valido(largo):
                raise ValueError("Content-Length fuera de rango")
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
