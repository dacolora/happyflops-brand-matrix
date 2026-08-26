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

    def test_voice_es_clave_permitida(self):
        eb.validar_actualizacion("voice", {"core_rule": "Habla simple."})

    def test_valor_de_forma_incorrecta_rechazado(self):
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("brand", "esto no es un objeto")

    def test_invariantes_vacias_rechazadas(self):
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", [])

    def test_invariantes_con_id_duplicado_rechazadas(self):
        value = [
            {"id": 1, "name": "x", "rule": "y"},
            {"id": 1, "name": "z", "rule": "w"},
        ]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_sin_nombre_rechazadas(self):
        value = [{"id": 1, "name": "", "rule": "y"}]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_sin_regla_rechazadas(self):
        value = [{"id": 1, "name": "x", "rule": ""}]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_con_id_no_entero_rechazadas(self):
        value = [{"id": "uno", "name": "x", "rule": "y"}]
        with self.assertRaises(eb.ActualizacionInvalida):
            eb.validar_actualizacion("invariants", value)

    def test_invariantes_con_una_sola_no_falla(self):
        eb.validar_actualizacion("invariants", [{"id": 1, "name": "x", "rule": "y"}])

    def test_invariantes_con_doce_no_falla(self):
        value = [{"id": i, "name": "x", "rule": "y"} for i in range(1, 13)]
        eb.validar_actualizacion("invariants", value)

    def test_invariantes_con_ids_no_consecutivos_no_falla(self):
        # Si se borra la del medio, las que quedan conservan su id original —
        # nunca se renumeran, para no romper referencias futuras a "invariante #3".
        value = [
            {"id": 1, "name": "x", "rule": "y"},
            {"id": 5, "name": "z", "rule": "w"},
        ]
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
