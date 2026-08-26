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
    const errorEl = form ? form.querySelector('.form-error') : null;
    if (errorEl) errorEl.textContent = '';
    try {
      const resp = await fetch('/api/root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const mensaje = data.error || ('No se pudo guardar (error ' + resp.status + ').');
        if (errorEl) errorEl.textContent = mensaje; else alert(mensaje);
        return;
      }
      window.cargar();
    } catch (e) {
      const mensaje = 'No se pudo conectar con el servidor. ¿Sigue corriendo servidor_editor.py?';
      if (errorEl) errorEl.textContent = mensaje; else alert(mensaje);
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

  function setupBrandDefinicion(root) {
    const bloque = document.querySelector('[data-subseccion="definicion"]');
    if (!bloque) return;
    attachEditButton(bloque, () => {
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
        const brandActual = (window.__lastRoot || root).brand || {};
        const brand = Object.assign({}, brandActual, {
          definition: form.definition.value.trim(),
          promise: form.promise.value.trim(),
          origin_story: form.origin_story.value.trim(),
        });
        guardarSeccion('brand', brand, form);
      });
    });
  }

  function setupBrandLista(root, subseccion, campo, etiqueta, itemLabel) {
    const bloque = document.querySelector(`[data-subseccion="${subseccion}"]`);
    if (!bloque) return;
    attachEditButton(bloque, () => {
      const brand = (window.__lastRoot || root).brand || {};
      return `
        <form class="form-edit" data-key="brand">
          ${campoLista(etiqueta, brand[campo], campo, itemLabel)}
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
          [campo]: leerLista(form, campo),
        });
        guardarSeccion('brand', brand, form);
      });
    });
  }

  function setupBrand(root) {
    setupBrandDefinicion(root);
    setupBrandLista(root, 'somos', 'we_are', 'Rasgos que somos', 'rasgo');
    setupBrandLista(root, 'no_somos', 'we_are_not', 'Rasgos que no somos', 'rasgo');
    setupBrandLista(root, 'valores', 'values', 'Valores', 'valor');
  }

  function formularioInvariante(nombre, regla) {
    return `
      <form class="form-edit" data-key="invariants">
        <div style="color:var(--muted);font-size:.82rem;margin-bottom:.6rem;">Nota: esto no actualiza <code>prompt_blocks.invariant_block</code> en root.json ni la página de Notion — si cambiás una regla acá, actualizalos a mano.</div>
        <label>Nombre</label>
        <input type="text" name="name" value="${escapeAttr(nombre)}">
        <label style="margin-top:.5rem;">Regla</label>
        <textarea name="rule">${escapeHtml(regla)}</textarea>
        <div class="form-actions">
          <button type="submit" class="btn-guardar">Guardar</button>
          <button type="button" class="btn-cancelar">Cancelar</button>
          <span class="form-error"></span>
        </div>
      </form>
    `;
  }

  function setupInvariants(root) {
    const section = document.querySelector('section[data-section="invariants"]');
    if (!section) return;

    (root.invariants || []).forEach(inv => {
      const card = section.querySelector(`[data-invariante-id="${inv.id}"]`);
      if (!card) return;
      attachEditButton(card, () => {
        const actual = ((window.__lastRoot || root).invariants || []).find(i => i.id === inv.id) || inv;
        return formularioInvariante(actual.name, actual.rule);
      }, (form) => {
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const lista = (window.__lastRoot || root).invariants || [];
          const nueva = lista.map(item => item.id === inv.id
            ? Object.assign({}, item, { name: form.name.value.trim(), rule: form.rule.value.trim() })
            : item);
          guardarSeccion('invariants', nueva, form);
        });
      });
    });

    section.querySelectorAll('[data-action="quitar-invariante"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const lista = (window.__lastRoot || root).invariants || [];
        if (lista.length <= 1) {
          alert('Tiene que quedar al menos una invariante.');
          return;
        }
        if (!confirm('¿Seguro que querés quitar esta invariante? Se guarda al instante.')) return;
        guardarSeccion('invariants', lista.filter(item => item.id !== id), null);
      });
    });

    const listaEl = section.querySelector('.invariantes');
    const btnAgregar = section.querySelector('#btn-agregar-invariante');
    if (listaEl && btnAgregar) {
      btnAgregar.addEventListener('click', () => {
        const lista = (window.__lastRoot || root).invariants || [];
        const siguienteId = lista.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
        const tarjetaHtml = `
          <div class="card invariante">
            <div class="num">${siguienteId}</div>
            <div style="flex:1 1 auto;">${formularioInvariante('', '')}</div>
          </div>
        `;
        listaEl.insertAdjacentHTML('beforeend', tarjetaHtml);
        const nuevaTarjeta = listaEl.lastElementChild;
        const form = nuevaTarjeta.querySelector('form');
        form.querySelector('.btn-cancelar').addEventListener('click', () => nuevaTarjeta.remove());
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const listaActual = (window.__lastRoot || root).invariants || [];
          const nueva = listaActual.concat([{
            id: siguienteId,
            name: form.name.value.trim(),
            rule: form.rule.value.trim(),
          }]);
          guardarSeccion('invariants', nueva, form);
        });
      });
    }
  }

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

  function setupColour(root) {
    const section = document.querySelector('section[data-section="colour_system"]');
    if (!section) return;
    attachEditButton(section, () => {
      const colour = (window.__lastRoot || root).colour_system || {};
      const yellow = colour.yellow_gradient || {};
      const blue = colour.blue_gradient || {};
      return `
        <form class="form-edit" data-key="colour_system">
          <div style="color:var(--muted);font-size:.82rem;margin-bottom:.8rem;">Nota: esto no actualiza <code>prompt_blocks.negative_prompt</code> en root.json ni la página de Notion — si cambiás los colores prohibidos acá, actualizalos a mano.</div>
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

  function setupVoice(root) {
    const section = document.querySelector('section[data-section="voice"]');
    if (!section) return;
    attachEditButton(section, () => {
      const voice = (window.__lastRoot || root).voice || {};
      return `
        <form class="form-edit" data-key="voice">
          <div>
            <label>Regla central</label>
            <textarea name="core_rule">${escapeHtml(voice.core_rule)}</textarea>
          </div>
          ${campoLista('Ejemplos de tono', voice.canonical_examples, 'canonical_examples', 'ejemplo')}
          ${campoLista('Nunca usar', voice.banned_vocabulary, 'banned_vocabulary', 'palabra')}
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
        const voiceActual = (window.__lastRoot || root).voice || {};
        const voice = Object.assign({}, voiceActual, {
          core_rule: form.core_rule.value.trim(),
          canonical_examples: leerLista(form, 'canonical_examples'),
          banned_vocabulary: leerLista(form, 'banned_vocabulary'),
        });
        guardarSeccion('voice', voice, form);
      });
    });
  }

  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
    setupFreeVariables(root);
    setupCategories(root);
    setupColour(root);
    setupVoice(root);
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
