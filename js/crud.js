/* ILVA 360 - Motor común de módulos: tabla, búsqueda, filtro, orden, paginación, formularios, detalle, auditoría */
const IlvaCrud = (() => {
  const A = IlvaApp, icon = ILVA.icon, fmt = ILVA.fmt;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLS = { ok: 'chip-ok', warn: 'chip-warn', bad: 'chip-danger', info: 'chip-info' };
  const PAGE = 8, pad = n => String(n).padStart(2, '0'), num = n => Number(n).toLocaleString('es-BO');
  const opt = o => (o !== null && typeof o === 'object') ? o : { v: o, l: o };
  const optsHTML = (f, v, vals, ph) => {
    const list = (typeof f.options === 'function' ? f.options(vals) : f.options).map(opt);
    return `<option value="">${ph || 'Selecciona...'}</option>` + list.map(o => `<option value="${esc(o.v)}"${o.v === v ? ' selected' : ''}>${esc(o.l)}</option>`).join('');
  };
  const itemRow = (f, r, vals) => `<div class="item-row"><select aria-label="Producto">${optsHTML(f, r.producto, vals, 'Producto...')}</select>
    <input type="number" min="1" step="1" inputmode="numeric" placeholder="Cant." aria-label="Cantidad" value="${esc(r.cant ?? '')}">
    <span class="item-sub">${ILVA.bs(0)}</span><button type="button" class="icon-act" data-rm aria-label="Quitar producto" title="Quitar">${icon('x')}</button></div>`;

  function fieldHTML(f, v, vals) {
    if (f.type === 'items') {
      const rows = v && v.length ? v : [{}];
      return `<div class="field wide items-field" data-items="${f.k}"><label>${f.label} *</label><div class="items-rows">${rows.map(r => itemRow(f, r, vals)).join('')}</div>
        <div class="items-foot"><button type="button" class="btn btn-ghost btn-sm" data-add>${icon('plus')}Agregar producto</button><strong class="items-total">Total: ${ILVA.bs(0)}</strong></div>
        <small class="field-err" data-err="${f.k}"></small></div>`;
    }
    const val = v ?? '';
    const ctl = f.type === 'select'
      ? `<select id="f-${f.k}" name="${f.k}">${optsHTML(f, val, vals)}</select>`
      : `<input id="f-${f.k}" name="${f.k}" type="${f.type || 'text'}" value="${esc(val)}"${f.type === 'number' ? ` step="${f.step || 'any'}"` : ''} autocomplete="off"${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}>`;
    return `<div class="field${f.wide ? ' wide' : ''}"><label for="f-${f.k}">${f.label}${f.req ? ' *' : ''}</label>${ctl}<small class="field-err" data-err="${f.k}"></small></div>`;
  }

  function mount(m) {
    document.body.append(m);
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    document.addEventListener('keydown', onKey);
    m.addEventListener('mousedown', e => { if (e.target === m) close(); });
    $$('[data-x]', m).forEach(b => { b.onclick = close; });
    return close;
  }

  function openDetail(title, html) {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-card form-card lg" role="dialog" aria-modal="true"><h3>${esc(title)}</h3>${html}<div class="modal-actions"><button class="btn btn-primary" data-x>Cerrar</button></div></div>`;
    mount(m); $('[data-x]', m).focus();
  }

  /* Ventana con formulario validado. submit(valores) devuelve un texto de error para bloquear el guardado. */
  function openForm(title, fields, vals, submit, ok = 'Guardar') {
    const itemF = fields.find(f => f.type === 'items');
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<form class="modal-card form-card${itemF ? ' lg' : ''}" novalidate role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3>
      <div class="form-grid">${fields.map(f => fieldHTML(f, vals[f.k], vals)).join('')}</div>
      <p class="form-err" data-form-err role="alert"></p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary">${ok}</button></div></form>`;
    const close = mount(m), form = $('form', m);
    const first = $('input,select', m); if (first) first.focus();
    const recalc = () => {
      if (!itemF) return; let tot = 0;
      $$('.item-row', m).forEach(row => {
        const p = $('select', row).value, q = Number($('input', row).value) || 0, pr = p && itemF.price ? itemF.price(p) : 0;
        tot += pr * q; $('.item-sub', row).textContent = ILVA.bs(pr * q);
      });
      $('.items-total', m).textContent = 'Total: ' + ILVA.bs(tot);
    };
    if (itemF) { m.addEventListener('input', recalc); m.addEventListener('change', recalc); recalc(); }
    m.addEventListener('click', e => {
      const add = e.target.closest('[data-add]'), rm = e.target.closest('[data-rm]');
      if (add) { $('.items-rows', m).insertAdjacentHTML('beforeend', itemRow(itemF, {}, vals)); recalc(); }
      if (rm && $('.items-rows', m).children.length > 1) { rm.closest('.item-row').remove(); recalc(); }
    });
    form.onsubmit = e => {
      e.preventDefault();
      const out = {}; let bad = false;
      fields.forEach(f => {
        if (f.type === 'items') {
          const val = [], seen = new Set(); let msg = '';
          $$('.item-row', m).forEach(row => {
            const p = $('select', row).value, qv = $('input', row).value.trim(), q = Number(qv);
            if (!p || qv === '') { msg = msg || 'Completa el producto y la cantidad en cada línea.'; return; }
            if (!Number.isInteger(q) || q < 1) { msg = msg || 'La cantidad debe ser un número entero mayor a 0.'; return; }
            if (seen.has(p)) { msg = msg || 'Un producto no puede repetirse: suma las cantidades en una sola línea.'; return; }
            seen.add(p); val.push({ producto: p, cant: q });
          });
          $(`[data-err="${f.k}"]`, m).textContent = msg; if (msg) bad = true; out[f.k] = val; return;
        }
        const el = form.elements[f.k]; let v = el.value.trim(), msg = '';
        if (f.req && v === '') msg = f.type === 'select' ? 'Elige una opción.' : 'Este campo es obligatorio.';
        else if (f.type === 'number' && v !== '') {
          const n = Number(v);
          if (isNaN(n)) msg = 'Escribe un número válido.';
          else if (f.int && !Number.isInteger(n)) msg = 'Usa un número entero.';
          else if (f.min != null && n < f.min) msg = `El valor mínimo es ${f.min}.`;
          else if (f.max != null && n > f.max) msg = `El valor máximo es ${f.max}.`;
          else v = n;
        } else if (f.pattern && v !== '' && !f.pattern.test(v)) msg = f.hint || 'Formato no válido.';
        $(`[data-err="${f.k}"]`, m).textContent = msg; el.classList.toggle('bad', !!msg);
        if (msg) bad = true; out[f.k] = v;
      });
      if (bad) { const b = $('.bad', m); if (b) b.focus(); return; }
      const err = submit(out);
      if (typeof err === 'string' && err) { $('[data-form-err]', m).textContent = err; return; }
      close();
    };
  }

  const nextId = (list, idk, prefix, sep, w) => {
    const max = list.reduce((a, r) => Math.max(a, parseInt((String(r[idk]).match(/(\d+)$/) || [0, 0])[1], 10)), 0);
    return prefix + sep + String(max + 1).padStart(w, '0');
  };
  const emptyHTML = (t, s, btn) => `<div class="empty">${icon('info')}<b>${t}</b><span>${s}</span><div style="margin-top:12px">${btn}</div></div>`;

  function create(cfg) {
    const idk = cfg.idKey || 'id', lbl = r => r[cfg.nameKey || 'nombre'] || r[idk];
    const dflt = () => (typeof cfg.defaults === 'function' ? cfg.defaults() : cfg.defaults) || {};
    const aud = (D, accion, desc) => ILVA.pushAudit(D, A.user(), accion, cfg.title, desc);

    return el => {
      const st = { q: '', f: '', sort: cfg.sort || { k: cfg.cols[0].k, dir: 1 }, page: 1 };
      const can = () => A.canEdit() && (!cfg.editRoles || cfg.editRoles.includes(A.user().role));
      const canDel = () => can() && !cfg.noDelete && (!cfg.delRoles || cfg.delRoles.includes(A.user().role));
      const raw = (r, c) => c.get ? c.get(r) : r[c.k];
      const txt = (r, c) => {
        const v = raw(r, c);
        if (c.chip) return c.chip(r)[1];
        if (c.fmt) return c.fmt(r);
        if (c.type === 'date') return fmt(v);
        if (c.type === 'money') return ILVA.bs(v);
        if (c.type === 'num') return num(v);
        return v == null ? '' : String(v);
      };
      const cell = (r, c) => {
        if (c.status) {
          const v = r[c.k], tone = cfg.tone[v] || 'ok';
          if (!can()) return `<span class="chip ${CLS[tone]}">${esc(v)}</span>`;
          return `<select class="status-sel ${tone}" data-st="${esc(r[idk])}" aria-label="Cambiar estado de ${esc(lbl(r))}">${cfg.states.map(s => `<option${s === v ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>`;
        }
        if (c.chip) { const [t, x] = c.chip(r); return `<span class="chip ${CLS[t]}">${esc(x)}</span>`; }
        const t = esc(txt(r, c));
        return t ? (c.unit ? `${t} <small>${c.unit}</small>` : t) : '<span class="muted">-</span>';
      };
      const rows = () => {
        const D = ILVA.get(); let r = D[cfg.key].slice();
        if (st.f) r = r.filter(x => cfg.filter.get(x) === st.f);
        if (st.q) {
          const q = st.q.toLowerCase();
          r = r.filter(x => cfg.cols.some(c => txt(x, c).toLowerCase().includes(q)) || (cfg.searchExtra && cfg.searchExtra(x).toLowerCase().includes(q)));
        }
        const c = cfg.cols.find(c => c.k === st.sort.k);
        r.sort((a, b) => {
          const x = raw(a, c), y = raw(b, c);
          if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y, 'es') * st.sort.dir;
          return ((x > y) - (x < y)) * st.sort.dir;
        });
        return r;
      };
      const log = (D, m) => {
        if (!m) return;
        const t = new Date();
        D.movs.unshift({ ...m, d: ILVA.iso(t), h: `${pad(t.getHours())}:${pad(t.getMinutes())}`, who: A.user().name });
        D.movs = D.movs.slice(0, 60);
      };

      function drawTable() {
        const all = rows(), pages = Math.max(1, Math.ceil(all.length / PAGE));
        st.page = Math.min(st.page, pages);
        const total = ILVA.get()[cfg.key].length, box = $('#tbl', el), edit = can(), del = canDel();
        $('#count', el).textContent = `${all.length} de ${total} registros`;
        if (!all.length) {
          box.innerHTML = total
            ? emptyHTML('Sin resultados', 'Prueba con otra búsqueda o quita los filtros.', '<button class="btn btn-ghost btn-sm" data-clear>Limpiar filtros</button>')
            : emptyHTML('Aún no hay registros', 'Crea el primero para comenzar.', edit && !cfg.noAdd ? `<button class="btn btn-primary btn-sm" data-new>${cfg.newLabel}</button>` : '');
          return;
        }
        const a = (st.page - 1) * PAGE, slice = all.slice(a, a + PAGE);
        const hasAct = !!cfg.detail || (edit && (cfg.adjust || !cfg.noEdit)) || del;
        box.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr>${cfg.cols.map(c => {
          const on = st.sort.k === c.k;
          return `<th class="${c.type === 'num' || c.type === 'money' ? 'r' : ''}" aria-sort="${on ? (st.sort.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${c.k}">${c.label}${on ? (st.sort.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
        }).join('')}${hasAct ? '<th><span class="sr">Acciones</span></th>' : ''}</tr></thead><tbody>${slice.map(r => {
          const id = esc(r[idk]);
          return `<tr>${cfg.cols.map(c => `<td class="${c.type === 'num' || c.type === 'money' ? 'r' : ''}">${cell(r, c)}</td>`).join('')}${hasAct ? `<td class="acts"><div class="row-actions">
            ${cfg.detail ? `<button class="icon-act" data-view="${id}" title="Ver detalle" aria-label="Ver detalle de ${esc(lbl(r))}">${icon('eye')}</button>` : ''}
            ${edit && cfg.adjust ? `<button class="btn btn-ghost btn-sm" data-adj="in" data-id="${id}">Entrada</button><button class="btn btn-ghost btn-sm" data-adj="out" data-id="${id}">Salida</button>` : ''}
            ${edit && !cfg.noEdit ? `<button class="icon-act" data-edit="${id}" title="Editar" aria-label="Editar ${esc(lbl(r))}">${icon('edit')}</button>` : ''}
            ${del ? `<button class="icon-act" data-del="${id}" title="Eliminar" aria-label="Eliminar ${esc(lbl(r))}">${icon('trash')}</button>` : ''}</div></td>` : ''}</tr>`;
        }).join('')}</tbody></table></div>
        <div class="pager"><span class="muted">Mostrando ${a + 1}-${a + slice.length} de ${all.length}</span>${pages > 1 ? `<div><button class="btn btn-ghost btn-sm" data-pg="-1"${st.page <= 1 ? ' disabled' : ''}>Anterior</button><span class="pg">Página ${st.page} de ${pages}</span><button class="btn btn-ghost btn-sm" data-pg="1"${st.page >= pages ? ' disabled' : ''}>Siguiente</button></div>` : ''}</div>`;
      }

      const find = (D, id) => D[cfg.key].find(x => String(x[idk]) === id);

      function openNew() {
        openForm(cfg.newLabel, cfg.fields, dflt(), out => {
          const D = ILVA.get(), err = cfg.validate && cfg.validate(out, D, null);
          if (err) return err;
          if (cfg.prepare) Object.assign(out, cfg.prepare(out, D, null));
          const id = cfg.genId ? cfg.genId(D) : nextId(D[cfg.key], idk, cfg.prefix, cfg.sep ?? '-', cfg.idw || 3);
          const rec = Object.assign({ [idk]: id }, cfg.base ? cfg.base(D) : {}, out);
          D[cfg.key].push(rec);
          if (cfg.apply) cfg.apply(rec, null, D);
          log(D, cfg.mov && cfg.mov(rec)); aud(D, 'Crear', `Se creó «${lbl(rec)}»`);
          ILVA.save(D); drawTable(); A.toast(cfg.nm.new);
        });
      }
      function openEdit(id) {
        const r0 = find(ILVA.get(), id);
        openForm(`Editar: ${lbl(r0)}`, cfg.editFields || cfg.fields, r0, out => {
          const D = ILVA.get(), rec = find(D, id), err = cfg.validate && cfg.validate(out, D, rec);
          if (err) return err;
          if (cfg.prepare) Object.assign(out, cfg.prepare(out, D, rec));
          const prev = { ...rec }; Object.assign(rec, out);
          if (cfg.apply) cfg.apply(rec, prev, D);
          if (cfg.movEdit) log(D, cfg.movEdit(rec, prev));
          aud(D, 'Editar', `Se editó «${lbl(rec)}»`);
          ILVA.save(D); drawTable(); A.toast(cfg.nm.edit);
        });
      }
      async function remove(id) {
        const D = ILVA.get(), rec = find(D, id), err = cfg.guardDelete && cfg.guardDelete(rec, D);
        if (err) { A.toast(err, 'err'); return; }
        if (!await A.confirm('Eliminar registro', `¿Eliminar «${lbl(rec)}»? Esta acción no se puede deshacer.`, 'Eliminar')) return;
        const D2 = ILVA.get(), r2 = find(D2, id);
        D2[cfg.key] = D2[cfg.key].filter(x => x !== r2);
        if (cfg.apply) cfg.apply(null, { ...r2 }, D2);
        if (cfg.movDel) log(D2, cfg.movDel(r2));
        aud(D2, 'Eliminar', `Se eliminó «${lbl(r2)}»`);
        ILVA.save(D2); drawTable(); A.toast(cfg.nm.del);
      }
      function adjust(id, dir) {
        const r0 = find(ILVA.get(), id), word = dir === 'in' ? 'entrada' : 'salida';
        openForm(`Registrar ${word}: ${r0.nombre}`, [{ k: 'qty', label: 'Cantidad (unid.)', type: 'number', min: 1, int: true, req: true }], {}, out => {
          const D = ILVA.get(), p = find(D, id);
          if (dir === 'out' && out.qty > p.stock) return `La salida supera el stock disponible (${num(p.stock)} unid.).`;
          p.stock += dir === 'in' ? out.qty : -out.qty;
          log(D, { t: dir, desc: `${dir === 'in' ? 'Entrada' : 'Salida'} de ${p.nombre}`, qty: `${num(out.qty)} unid.` });
          aud(D, 'Ajuste', `${dir === 'in' ? 'Entrada' : 'Salida'} de ${num(out.qty)} unid. en «${p.nombre}»`);
          ILVA.save(D); drawTable(); A.toast(`Se registró la ${word} de ${num(out.qty)} unid.`);
        }, `Registrar ${word}`);
      }

      /* Estructura de la pantalla */
      el.innerHTML = `<div class="page-h"><div><h1>${cfg.title}</h1><p class="muted">${cfg.desc}</p></div>
        ${can() && !cfg.noAdd ? `<button class="btn btn-primary" data-new>${icon('plus')}${cfg.newLabel}</button>` : ''}</div>
        ${can() ? '' : `<div class="demo-note ro">${icon('info')}<span>Tu perfil puede consultar este módulo, pero no modificarlo.</span></div>`}
        ${cfg.hint ? `<p class="hint">${icon('info')}<span>${cfg.hint}</span></p>` : ''}
        <section class="card"><div class="toolbar"><div class="search">${icon('search')}<input id="q" type="search" placeholder="${cfg.searchPh || 'Buscar'}" aria-label="Buscar" autocomplete="off"></div>
        ${cfg.filter ? `<select id="flt" aria-label="Filtrar por ${cfg.filter.label.toLowerCase()}"><option value="">${cfg.filter.label}: todos</option>${cfg.filter.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>` : ''}
        <span class="muted" id="count"></span></div><div id="tbl"></div></section>`;
      drawTable();

      el.oninput = e => { if (e.target.id === 'q') { st.q = e.target.value.trim(); st.page = 1; drawTable(); } };
      el.onchange = e => {
        const t = e.target;
        if (t.id === 'flt') { st.f = t.value; st.page = 1; drawTable(); return; }
        if (t.dataset.st) {
          const D = ILVA.get(), rec = find(D, t.dataset.st), sc = cfg.cols.find(c => c.status).k, nv = t.value;
          const err = cfg.guardStatus && cfg.guardStatus(rec, nv, D);
          if (err) { A.toast(err, 'err'); drawTable(); return; }
          const prev = { ...rec }; rec[sc] = nv;
          if (cfg.apply) cfg.apply(rec, prev, D);
          if (cfg.movStatus) log(D, cfg.movStatus(rec, prev));
          aud(D, 'Estado', `«${lbl(rec)}» cambió de «${prev[sc]}» a «${nv}»`);
          ILVA.save(D); drawTable(); A.toast(`Estado actualizado a «${nv}».`);
        }
      };
      el.onclick = e => {
        const b = e.target.closest('[data-new],[data-edit],[data-del],[data-view],[data-sort],[data-pg],[data-adj],[data-clear]');
        if (!b || !el.contains(b)) return;
        const d = b.dataset;
        if ('new' in d) openNew();
        else if (d.edit) openEdit(d.edit);
        else if (d.del) remove(d.del);
        else if (d.view) { const D = ILVA.get(), r = find(D, d.view); openDetail(cfg.detail.title(r), cfg.detail.html(r, D)); }
        else if (d.adj) adjust(d.id, d.adj);
        else if (d.sort) { st.sort = { k: d.sort, dir: st.sort.k === d.sort ? -st.sort.dir : 1 }; drawTable(); }
        else if (d.pg) { st.page += +d.pg; drawTable(); }
        else if ('clear' in d) { st.q = st.f = ''; $('#q', el).value = ''; const f = $('#flt', el); if (f) f.value = ''; st.page = 1; drawTable(); }
      };
    };
  }
  return { create, openForm };
})();
