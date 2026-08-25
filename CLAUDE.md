# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The machine-readable source of truth for Happy Flops' brand system — `root.json` (11
immutable invariants + free variables + brand data + ready-written prompt blocks) and
`schema.json` (the JSON Schema that validates any "submundo" file against it). Notion
holds the human-readable narrative version of this same system; this repo holds the
version that gets loaded by tools and validated by code. They describe the same thing —
**never let them drift**. If you edit one meaningfully, say so, so the other can be
updated too.

## Commands

```bash
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python validar_marca.py submundos/<archivo>.json   # validate one submundo
python validar_marca.py --todos                     # validate everything in submundos/
python3 -m http.server                               # serve index.html locally to preview
```

There is no test suite beyond the schema validator above — it *is* the test suite for
this repo. Always run it after creating or editing a submundo file, before treating the
change as done.

## The core rule (do not violate this when writing or editing anything here)

Invariants live **only** in `root.json`. A submundo (season, collection, or project)
may override `free_variables` and nothing else — it can never add to, weaken, or
contradict an invariant. `schema.json` enforces this mechanically: a submundo object
that declares an `invariants` key is invalid by construction (`"not": {}`), and
`negative_exclusions` has a locked list of terms (anything protecting feet, text, or
character IP) that can never be lifted, schema-enforced.

If a real limitation surfaces that seems to require bending an invariant, that is not
something to route around quietly — write it into the submundo's `root_feedback` array
(issue, type, severity, evidence, proposed_change, blast_radius, recommendation) and
leave `decision: "pending"`. Laura decides root changes; a submundo can flag, never
override.

## The tree (six levels, precedence bottom bit wins: content_type > subcategory >
category > trunk > root)

```
RAIZ (root.json)              — the 100 questions, 11 invariants, brand DNA
  → TRONCO (trunk.*)          — evidence collections: luz, felicidad, poses, modelos,
                                 imperfecciones, material. A trunk node's `references[]`
                                 IS the node — no references, no node. Each reference
                                 carries a role-specific `analysis` object, an
                                 `illustrates` (which invariant, 1-11, or a named root
                                 principle), and a `verdict` (exemplar | rejected — the
                                 rejected pile is half the point: a hard-lit reference
                                 doesn't illustrate "another kind of light," it's evidence
                                 of what invariant 1 forbids).
    → CATEGORIA (cat.*)       — lifestyle | photoshoot | render_3d. These three ARE the
                                 positioning (life / bridge / imagination) and change
                                 rarely, deliberately.
      → SUBCATEGORIA (sub.*)  — the actual variation: exterior/interior + seasons under
                                 lifestyle; navidad/pelicula/colaboraciones/producto under
                                 photoshoot; happy_universe under render_3d. Requires a
                                 `parent`.
        → TIPO DE CONTENIDO (tipo.*) — ads | fotografia | video | social. An assignment,
                                 not a place — the same content type can run under more
                                 than one category (see `content_types.registry` in
                                 root.json).
          → HOJA               — the finished piece. Not represented as a file here.
```

`can_nudge_root` exists only on trunk nodes, defaults false, and only *flags* that
evidence should sharpen the root — it does not authorise the change by itself.

## Product fidelity

`tooling.critical_rule` in root.json: never describe the product and hope, always
attach the actual reference image. `open_items` currently lists `reference_pack` as
**blocked** — until that ZIP exists, invariant 6 cannot really be enforced end to end.
`colourway_hex` is also **needed**: colour names ("Bordeaux Red") are not instructions:
attach hex/Pantone before treating a colourway as specified.

## Naming convention (proposed, in `open_items`)

`HF_{context}_{product}_{colourway}_{season}_{ratio}_{version}` — use this for any
generated asset filenames unless told otherwise.
