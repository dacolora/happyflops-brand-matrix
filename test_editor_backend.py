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
