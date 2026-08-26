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

  function attachEditControls(root) {
    if (!editApiDisponible) return;
    setupBrand(root);
    setupInvariants(root);
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
