/* ILVA 360 - Módulos de gestión: Usuarios, Auditoría y Reportes */
(() => {
  const A = IlvaApp, C = IlvaCrud, icon = ILVA.icon, fmt = ILVA.fmt, bs = ILVA.bs, today = () => ILVA.iso(new Date());
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n).toLocaleString('es-BO');
  const f = (k, label, type, extra) => Object.assign({ k, label, type }, extra);
  const roleLabel = r => (ILVA.ROLES[r] || { label: r }).label;

  /* ---------- Usuarios ---------- */
  const activeAdmins = D => D.usuarios.filter(u => u.role === 'admin' && u.estado === 'Activo');
  const lastAdmin = (r, D) => r.role === 'admin' && r.estado === 'Activo' && activeAdmins(D).length === 1;
  A.register('usuarios', C.create({
    key: 'usuarios', prefix: 'USR', title: 'Usuarios', newLabel: 'Nuevo usuario', editRoles: ['admin'],
    desc: 'Cuentas de demostración, roles y estados.', searchPh: 'Buscar por nombre, usuario o rol',
    hint: 'Todas las cuentas DEMO usan la contraseña demo123. Es una simulación académica, no seguridad real.',
    cols: [{ k: 'id', label: 'Código' }, { k: 'nombre', label: 'Nombre' }, { k: 'user', label: 'Usuario' },
      { k: 'role', label: 'Rol', get: r => roleLabel(r.role) }, { k: 'estado', label: 'Estado', status: true }],
    states: ['Activo', 'Inactivo'], tone: { Activo: 'ok', Inactivo: 'bad' },
    filter: { label: 'Rol', get: r => roleLabel(r.role), options: Object.values(ILVA.ROLES).map(r => r.label) },
    fields: [f('nombre', 'Nombre completo', 'text', { req: true, wide: true }),
      f('user', 'Usuario de acceso', 'text', { req: true, pattern: /^[a-z0-9]{3,16}$/, hint: 'Usa de 3 a 16 letras minúsculas o números, sin espacios.', ph: 'ventas3' }),
      f('role', 'Rol', 'select', { req: true, options: () => Object.entries(ILVA.ROLES).map(([k, r]) => ({ v: k, l: r.label })) }),
      f('estado', 'Estado de la cuenta', 'select', { req: true, options: ['Activo', 'Inactivo'] })],
    defaults: { estado: 'Activo' },
    validate: (o, D, r) => {
      if (D.usuarios.some(x => x.user === o.user && (!r || x.id !== r.id))) return 'Ese nombre de usuario ya existe.';
      if (!r) return '';
      if (r.user === A.user().user && (o.user !== r.user || o.role !== r.role || o.estado !== r.estado)) return 'No puedes cambiar el usuario, rol o estado de tu propia cuenta mientras la usas.';
      if (lastAdmin(r, D) && (o.role !== 'admin' || o.estado !== 'Activo')) return 'Debe quedar al menos un administrador activo.';
      return '';
    },
    guardStatus: (r, nv, D) => r.user === A.user().user && nv !== 'Activo' ? 'No puedes desactivar tu propia cuenta.' : (lastAdmin(r, D) && nv !== 'Activo' ? 'Debe quedar al menos un administrador activo.' : ''),
    guardDelete: (r, D) => r.user === A.user().user ? 'No puedes eliminar tu propia cuenta.' : lastAdmin(r, D) ? 'Debe quedar al menos un administrador activo.'
      : D.distribuciones.some(d => d.responsable === r.nombre) ? 'No se puede eliminar: figura como responsable de entregas. Márcala como Inactiva.' : '',
    nm: { new: 'Usuario registrado.', edit: 'Usuario actualizado.', del: 'Usuario eliminado.' }
  }));

  /* ---------- Auditoría (solo lectura) ---------- */
  const TONE = { Crear: 'ok', Editar: 'info', Eliminar: 'bad', Estado: 'warn', Ajuste: 'warn', Ingreso: 'info', Cierre: 'info', Exportar: 'ok' };
  A.register('auditoria', C.create({
    key: 'auditoria', nameKey: 'id', title: 'Auditoría', noAdd: true, noEdit: true, noDelete: true,
    desc: 'Historial de acciones realizadas en el sistema: quién, cuándo y qué operación.', searchPh: 'Buscar por usuario, módulo o descripción',
    cols: [{ k: 'fh', label: 'Fecha y hora', get: r => r.fecha + ' ' + r.hora, fmt: r => fmt(r.fecha) + ' ' + r.hora }, { k: 'usuario', label: 'Usuario' }, { k: 'rol', label: 'Rol' },
      { k: 'accion', label: 'Acción', get: r => r.accion, chip: r => [TONE[r.accion] || 'info', r.accion] }, { k: 'modulo', label: 'Módulo' }, { k: 'desc', label: 'Descripción' }],
    sort: { k: 'fh', dir: -1 }, filter: { label: 'Acción', get: r => r.accion, options: Object.keys(TONE) }, nm: {}
  }));

  /* ---------- Reportes ---------- */
  const TIPOS = [['ventas', 'Ventas'], ['produccion', 'Producción'], ['inventarios', 'Inventarios'], ['movimientos', 'Movimientos']];
  const TM = { in: 'Entrada', out: 'Salida', pr: 'Proceso' };
  const within = (d, r) => d >= r.desde && d <= r.hasta;
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const stat = (ic, v, l, s) => ({ ic, v, l, s });
  const stk = p => p.stock <= p.min ? 'Crítico' : p.stock <= p.min * 1.25 ? 'Bajo' : 'Normal';
  const BUILD = {
    ventas(D, r) {
      const all = D.ventas.filter(x => within(x.fecha, r)), ok = all.filter(x => x.estado !== 'Anulada').sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
      const total = ok.reduce((a, x) => a + x.total, 0), uds = ok.reduce((a, x) => a + x.items.reduce((b, i) => b + i.cant, 0), 0), byP = {};
      ok.forEach(x => x.items.forEach(i => { byP[i.producto] = (byP[i.producto] || 0) + i.cant * i.precio; }));
      return { label: 'ventas', title: 'Ventas por producto', bars: top(byP), bfmt: bs,
        stats: [stat('cart', bs(total), 'Total vendido', `${ok.length} ventas completadas`), stat('box', num(uds), 'Unidades vendidas', `${all.length - ok.length} anuladas en el periodo`),
          stat('chart', bs(ok.length ? total / ok.length : 0), 'Venta promedio', 'Por venta completada'), stat('users', num(new Set(ok.map(x => x.cliente)).size), 'Clientes atendidos', 'En el periodo')],
        cols: [{ l: 'Fecha', t: 'date' }, { l: 'Venta' }, { l: 'Cliente' }, { l: 'Productos' }, { l: 'Total (Bs)', t: 'money' }],
        rows: ok.map(x => [x.fecha, x.id, x.cliente, x.items.map(i => `${i.cant} × ${i.producto}`).join(', '), x.total]) };
    },
    produccion(D, r) {
      const p = D.producciones.filter(x => within(x.fecha, r)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)), fin = p.filter(x => x.estado === 'Terminada'), byP = {};
      fin.forEach(x => { byP[x.producto] = (byP[x.producto] || 0) + x.cantidad; });
      return { label: 'producción', title: 'Unidades terminadas por producto', bars: top(byP), bfmt: v => num(v) + ' unid.',
        stats: [stat('factory', num(fin.reduce((a, x) => a + x.cantidad, 0)), 'Unidades terminadas', `${fin.length} órdenes terminadas`), stat('clipboard', num(p.length), 'Órdenes registradas', 'En el periodo'),
          stat('check', (p.length ? Math.round(fin.length / p.length * 100) : 0) + '%', 'Órdenes terminadas', 'Del total del periodo'), stat('info', num(p.length - fin.length), 'Pendientes de terminar', 'Planificadas o en proceso')],
        cols: [{ l: 'Fecha', t: 'date' }, { l: 'Orden' }, { l: 'Producto' }, { l: 'Cantidad (unid.)', t: 'num' }, { l: 'Estado' }],
        rows: p.map(x => [x.fecha, x.id, x.producto, x.cantidad, x.estado]) };
    },
    inventarios(D) {
      const ps = D.productos, valor = ps.reduce((a, p) => a + p.stock * p.precio, 0), byC = {};
      ps.forEach(p => { byC[p.cat] = (byC[p.cat] || 0) + p.stock * p.precio; });
      return { label: 'inventarios', title: 'Valor del inventario por categoría', bars: top(byC), bfmt: bs,
        stats: [stat('layers', bs(valor), 'Inventario valorizado', `${ps.length} productos`), stat('box', num(ps.reduce((a, p) => a + p.stock, 0)), 'Unidades en existencia', 'Total actual'),
          stat('alert', num(ps.filter(p => stk(p) !== 'Normal').length), 'Productos en alerta', 'Stock bajo o crítico'), stat('check', num(ps.filter(p => stk(p) === 'Normal').length), 'Productos con stock normal', 'Sobre su mínimo')],
        cols: [{ l: 'Producto' }, { l: 'Categoría' }, { l: 'Existencias (unid.)', t: 'num' }, { l: 'Mínimo (unid.)', t: 'num' }, { l: 'Estado' }, { l: 'Valor (Bs)', t: 'money' }],
        rows: ps.map(p => [p.nombre, p.cat, p.stock, p.min, stk(p), p.stock * p.precio]) };
    },
    movimientos(D, r) {
      const m = D.movs.filter(x => within(x.d, r)).sort((a, b) => (b.d + b.h).localeCompare(a.d + a.h)), c = t => m.filter(x => x.t === t).length;
      return { label: 'movimientos', title: 'Movimientos por tipo', bars: [['Entradas', c('in')], ['Salidas', c('out')], ['Procesos', c('pr')]].filter(x => x[1]), bfmt: v => num(v),
        stats: [stat('history', num(m.length), 'Movimientos', 'En el periodo'), stat('in', num(c('in')), 'Entradas', 'Recepciones, ingresos y devoluciones'), stat('out', num(c('out')), 'Salidas', 'Ventas y despachos'), stat('factory', num(c('pr')), 'Procesos', 'Producción y revisiones')],
        cols: [{ l: 'Fecha', t: 'date' }, { l: 'Hora' }, { l: 'Tipo' }, { l: 'Descripción' }, { l: 'Cantidad' }, { l: 'Usuario' }],
        rows: m.map(x => [x.d, x.h, TM[x.t] || x.t, x.desc, x.qty, x.who]) };
    }
  };
  const showV = (c, v) => c.t === 'date' ? fmt(v) : c.t === 'money' ? bs(v) : c.t === 'num' ? num(v) : v;
  const csvV = (c, v) => c.t === 'date' ? fmt(v) : c.t === 'money' ? Number(v).toFixed(2).replace('.', ',') : c.t === 'num' ? String(v).replace('.', ',') : v;
  const csvC = v => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  A.register('reportes', el => {
    const $ = s => el.querySelector(s), st = { tipo: 'ventas', desde: ILVA.iso(ILVA.addDays(-30)), hasta: today() };
    let cur = null;
    el.innerHTML = `<div class="page-h"><div><h1>Reportes</h1><p class="muted">Estadísticas calculadas con los registros de demostración. Elige el reporte y el periodo, y exporta el resultado a CSV.</p></div>
      <button class="btn btn-primary" id="rep-export">${icon('download')}Exportar CSV</button></div>
      <section class="card" style="margin-bottom:20px"><div class="toolbar rep-filters">
        <div class="seg" role="group" aria-label="Tipo de reporte">${TIPOS.map(([k, l]) => `<button data-tipo="${k}" aria-pressed="${k === st.tipo}">${l}</button>`).join('')}</div>
        <label>Desde<input type="date" id="rep-d" value="${st.desde}"></label><label>Hasta<input type="date" id="rep-h" value="${st.hasta}"></label>
        <button class="btn btn-ghost btn-sm" id="rep-reset">Últimos 30 días</button></div>
        <p class="hint" id="rep-note" hidden style="margin:12px 0 0">${icon('info')}<span>El reporte de inventarios muestra la situación actual; las fechas no se aplican.</span></p></section>
      <div id="rep"></div>`;

    function draw() {
      const box = $('#rep'), inv = st.tipo === 'inventarios', ok = inv || (st.desde && st.hasta && st.desde <= st.hasta);
      $('#rep-note').hidden = !inv; $('#rep-export').disabled = !ok;
      if (!ok) { cur = null; box.innerHTML = `<div class="card"><div class="empty">${icon('alert')}<b>Rango de fechas no válido</b><span>La fecha inicial debe ser anterior o igual a la fecha final.</span></div></div>`; return; }
      cur = BUILD[st.tipo](ILVA.get(), st);
      const max = cur.bars.length ? cur.bars[0][1] : 0;
      box.innerHTML = `<div class="grid g-stats">${cur.stats.map(s => `<div class="card stat"><span class="stat-ic">${icon(s.ic)}</span><div><div class="stat-v">${s.v}</div><div class="stat-l">${s.l}</div><div class="stat-s">${s.s}</div></div></div>`).join('')}</div>
        <section class="card" style="margin-bottom:20px"><div class="card-h"><h3>${cur.title}</h3></div>${cur.bars.length
          ? cur.bars.map(([n, v]) => `<div class="prod-row"><div class="prod-top"><span>${esc(n)}</span><b>${cur.bfmt(v)}</b></div><div class="bar"><i style="width:${max ? Math.round(v / max * 100) : 0}%"></i></div></div>`).join('')
          : '<p class="muted">Sin datos para graficar en este periodo.</p>'}</section>
        <section class="card"><div class="card-h"><h3>Detalle del reporte</h3><span class="muted" id="rep-count">${cur.rows.length} registros</span></div>${cur.rows.length
          ? `<div class="table-wrap tall"><table class="tbl"><thead><tr>${cur.cols.map(c => `<th class="${c.t === 'num' || c.t === 'money' ? 'r' : ''}"><span class="th">${c.l}</span></th>`).join('')}</tr></thead>
            <tbody>${cur.rows.map(r => `<tr>${r.map((v, i) => `<td class="${cur.cols[i].t === 'num' || cur.cols[i].t === 'money' ? 'r' : ''}">${esc(showV(cur.cols[i], v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
          : `<div class="empty">${icon('info')}<b>No hay registros en este periodo</b><span>Amplía el rango de fechas para ver más información.</span></div>`}</section>`;
    }
    function exportCsv() {
      if (!cur) return;
      if (!cur.rows.length) { A.toast('No hay datos para exportar con estos filtros.', 'err'); return; }
      const lines = [cur.cols.map(c => csvC(c.l)), ...cur.rows.map(r => r.map((v, i) => csvC(csvV(cur.cols[i], v))))].map(r => r.join(';'));
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `ilva360_reporte_${st.tipo}_${today()}.csv`; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      A.audit('Exportar', 'Reportes', `Se exportó el reporte de ${cur.label} a CSV (${cur.rows.length} filas)`);
      A.toast('Reporte exportado a CSV.');
    }
    el.onclick = e => {
      const b = e.target.closest('[data-tipo],#rep-export,#rep-reset'); if (!b) return;
      if (b.dataset.tipo) { st.tipo = b.dataset.tipo; el.querySelectorAll('[data-tipo]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); }
      else if (b.id === 'rep-export') exportCsv();
      else { st.desde = ILVA.iso(ILVA.addDays(-30)); st.hasta = today(); $('#rep-d').value = st.desde; $('#rep-h').value = st.hasta; draw(); }
    };
    el.onchange = e => { if (e.target.id === 'rep-d') st.desde = e.target.value; else if (e.target.id === 'rep-h') st.hasta = e.target.value; else return; draw(); };
    draw();
  });
})();
