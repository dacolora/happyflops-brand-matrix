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
