"""
Valida un archivo de "submundo" (temporada, colección o proyecto) contra
schema.json — la regla central del sistema: un submundo nunca puede declarar
sus propios invariantes ni liberar un término bloqueado (pies/texto/IP de
personajes). Antes esa verificación dependía del criterio de un chat de
Claude leyendo el schema; con esto es una garantía mecánica.

Uso:
    python validar_marca.py submundos/verano.json
    python validar_marca.py --todos          # valida todo lo que haya en submundos/
"""
import argparse
import json
import os
import sys

import jsonschema

BASE_DIR = os.path.dirname(__file__)
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.json")


def _cargar_schema():
    if not os.path.exists(SCHEMA_PATH):
        raise RuntimeError(f"No encontré {SCHEMA_PATH}")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def validar_archivo(path_submundo, schema):
    with open(path_submundo, "r", encoding="utf-8") as f:
        submundo = json.load(f)

    validador = jsonschema.Draft202012Validator(schema)
    errores = sorted(validador.iter_errors(submundo), key=lambda e: list(e.path))

    if not errores:
        print(f"✅ {path_submundo} — válido, no rompe el schema ni ningún invariante.")
        return True

    print(f"❌ {path_submundo} — {len(errores)} problema(s):")
    for e in errores:
        ruta = ".".join(str(p) for p in e.path) or "(raíz)"
        print(f"   - en '{ruta}': {e.message}")
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archivos", nargs="*", help="Archivos JSON de submundo a validar")
    parser.add_argument("--todos", action="store_true", help="Valida todo lo que haya en submundos/")
    args = parser.parse_args()

    archivos = list(args.archivos)
    if args.todos:
        carpeta = os.path.join(BASE_DIR, "submundos")
        if os.path.isdir(carpeta):
            archivos += [
                os.path.join(carpeta, f) for f in sorted(os.listdir(carpeta)) if f.endswith(".json")
            ]

    if not archivos:
        print("No pasaste ningún archivo. Usa --todos o dame rutas específicas.")
        sys.exit(1)

    schema = _cargar_schema()
    resultados = [validar_archivo(a, schema) for a in archivos]
    print(f"\n{sum(resultados)}/{len(resultados)} válidos.")
    sys.exit(0 if all(resultados) else 1)


if __name__ == "__main__":
    main()
