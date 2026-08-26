import http.client
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

    def test_guardar_invariantes_vacias_devuelve_400(self):
        cuerpo = json.dumps({"key": "invariants", "value": []}).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)

    def test_guardar_invariantes_con_cantidad_distinta_de_once_no_falla(self):
        # La cantidad de invariantes ya no es fija — se puede agregar o quitar.
        cuerpo = json.dumps({
            "key": "invariants",
            "value": [{"id": i, "name": "x", "rule": "y"} for i in range(1, 13)],
        }).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
        with open(self.root_path, encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)["invariants"]), 12)

    def test_cuerpo_no_json_devuelve_400(self):
        req = urllib.request.Request(
            self._url("/api/root"), data=b"esto no es json", method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)

    def test_origen_no_permitido_devuelve_403(self):
        cuerpo = json.dumps({"key": "brand", "value": {"name": "Hackeado"}}).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={"Content-Type": "application/json", "Origin": "http://evil.example"},
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 403)
        with open(self.root_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["brand"], {"name": "Happy Flops"})

    def test_origen_localhost_permitido(self):
        cuerpo = json.dumps({"key": "brand", "value": {"name": "Nuevo Nombre"}}).encode()
        req = urllib.request.Request(
            self._url("/api/root"), data=cuerpo, method="POST",
            headers={
                "Content-Type": "application/json",
                "Origin": f"http://localhost:{self.puerto}",
            },
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)

    def test_content_length_valido_rechaza_negativos_y_excesivos(self):
        self.assertFalse(servidor_editor.content_length_valido(-1))
        self.assertFalse(servidor_editor.content_length_valido(servidor_editor.CONTENT_LENGTH_MAXIMO + 1))
        self.assertTrue(servidor_editor.content_length_valido(0))
        self.assertTrue(servidor_editor.content_length_valido(servidor_editor.CONTENT_LENGTH_MAXIMO))

    def test_content_length_excesivo_devuelve_400(self):
        # Declaramos un Content-Length enorme (por encima del límite) sin
        # mandar realmente ese volumen de datos: el handler tiene que
        # rechazar por el header antes de intentar leer el cuerpo, así que
        # nunca debería bloquearse esperando bytes que no llegan.
        conn = http.client.HTTPConnection("localhost", self.puerto)
        try:
            cuerpo = b"{}"
            conn.putrequest("POST", "/api/root")
            conn.putheader("Content-Type", "application/json")
            conn.putheader("Content-Length", str(servidor_editor.CONTENT_LENGTH_MAXIMO + 1))
            conn.endheaders()
            conn.send(cuerpo)
            resp = conn.getresponse()
            self.assertEqual(resp.status, 400)
            resp.read()
        finally:
            conn.close()
        with open(self.root_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["brand"], {"name": "Happy Flops"})

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
