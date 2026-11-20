/* ILVA 360 - Módulos comerciales: Clientes, Ventas, Pedidos y Distribución (sobre el motor de crud.js) */
(() => {
  const A = IlvaApp, C = IlvaCrud, bs = ILVA.bs, fmt = ILVA.fmt, today = () => ILVA.iso(new Date());
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n).toLocaleString('es-BO');
  const f = (k, label, type, extra) => Object.assign({ k, label, type }, extra);
  const clientNames = () => ILVA.get().clientes.map(c => c.nombre);
  const priceOf = n => { const p = ILVA.get().productos.find(x => x.nombre === n); return p ? p.precio : 0; };
  const prodOpts = withStock => () => ILVA.get().productos.map(p => ({ v: p.nombre, l: `${p.nombre} - ${bs(p.precio)}${withStock ? ` (stock ${num(p.stock)})` : ''}` }));
  const units = r => r.items.reduce((a, i) => a + i.cant, 0);
  const mkItems = (o, D, rec) => {
    const items = o.items.map(i => {
      const old = rec && rec.items.find(x => x.producto === i.producto), p = D.productos.find(x => x.nombre === i.producto);
      return { producto: i.producto, cant: i.cant, precio: old ? old.precio : p.precio };
    });
    return { items, total: Math.round(items.reduce((a, i) => a + i.cant * i.precio, 0) * 100) / 100 };
  };
  const itemsCol = { k: 'n', label: 'Productos', get: r => r.items.length, fmt: r => `${r.items.length} (${num(units(r))} unid.)` };
  const detailHTML = extra => (r) => `<p class="muted" style="margin:4px 0 14px">${extra(r)}</p>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Producto</th><th class="r">Cantidad</th><th class="r">Precio</th><th class="r">Subtotal</th></tr></thead>
    <tbody>${r.items.map(i => `<tr><td>${esc(i.producto)}</td><td class="r">${num(i.cant)}</td><td class="r">${bs(i.precio)}</td><td class="r">${bs(i.cant * i.precio)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="3"><b>Total</b></td><td class="r"><b>${bs(r.total)}</b></td></tr></tfoot></table></div>`;

  /* ---------- Clientes ---------- */
  const refClient = (n, D) => D.ventas.some(v => v.cliente === n) || D.ordenes.some(o => o.cliente === n);
  A.register('clientes', C.create({
    key: 'clientes', prefix: 'CLI', title: 'Clientes', newLabel: 'Nuevo cliente', editRoles: ['admin', 'ventas'],
    desc: 'Clientes de la planta con su tipo, zona y datos de contacto (datos DEMO).', searchPh: 'Buscar por nombre, zona, teléfono o dirección',
    cols: [{ k: 'id', label: 'Código' }, { k: 'nombre', label: 'Cliente' }, { k: 'tipo', label: 'Tipo' }, { k: 'zona', label: 'Zona' }, { k: 'telefono', label: 'Teléfono' }, { k: 'direccion', label: 'Dirección' }],
    filter: { label: 'Tipo', get: r => r.tipo, options: ['Minorista', 'Mayorista', 'Institucional'] },
    fields: [f('nombre', 'Nombre del cliente', 'text', { req: true, wide: true }), f('tipo', 'Tipo', 'select', { req: true, options: ['Minorista', 'Mayorista', 'Institucional'] }),
      f('zona', 'Zona', 'select', { req: true, options: ['Cercado', 'Quillacollo', 'Sacaba', 'Tiquipaya', 'Vinto', 'Colcapirhua'] }),
      f('telefono', 'Teléfono', 'text', { req: true, pattern: /^[67]\d{7}$/, hint: 'Escribe 8 dígitos que empiecen con 6 o 7.', ph: '70000000' }),
      f('direccion', 'Dirección de entrega', 'text', { req: true, wide: true })],
    validate: (o, D, r) => D.clientes.some(x => x.nombre.toLowerCase() === o.nombre.toLowerCase() && (!r || x.id !== r.id)) ? 'Ya existe un cliente con ese nombre.'
      : (r && o.nombre !== r.nombre && refClient(r.nombre, D) ? 'No se puede cambiar el nombre: el cliente ya tiene ventas o pedidos registrados.' : ''),
    guardDelete: (r, D) => refClient(r.nombre, D) ? 'No se puede eliminar: el cliente tiene ventas o pedidos registrados.' : '',
    nm: { new: 'Cliente registrado.', edit: 'Cliente actualizado.', del: 'Cliente eliminado.' }
  }));

  /* ---------- Ventas (descuentan inventario) ---------- */
  const stockMsg = (D, items, rec) => {
    for (const i of items) {
      const p = D.productos.find(x => x.nombre === i.producto);
      const back = rec && rec.estado !== 'Anulada' ? rec.items.filter(x => x.producto === i.producto).reduce((a, x) => a + x.cant, 0) : 0;
      const avail = (p ? p.stock : 0) + back;
      if (i.cant > avail) return `Stock insuficiente de «${i.producto}»: hay ${num(avail)} unid. disponibles.`;
    }
    return '';
  };
  A.register('ventas', C.create({
    key: 'ventas', prefix: 'VTA', nameKey: 'id', title: 'Ventas', newLabel: 'Registrar venta', editRoles: ['admin', 'ventas'], delRoles: ['admin'],
    desc: 'Ventas por cliente con detalle de productos y total en bolivianos.', searchPh: 'Buscar por cliente, producto o código',
    hint: 'Cada venta descuenta el inventario. Si anulas o eliminas una venta, el stock se devuelve.',
    searchExtra: r => r.items.map(i => i.producto).join(' '),
    cols: [{ k: 'id', label: 'Venta' }, { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'cliente', label: 'Cliente' }, itemsCol,
      { k: 'total', label: 'Total', type: 'money' }, { k: 'estado', label: 'Estado', status: true }],
    sort: { k: 'fecha', dir: -1 }, states: ['Completada', 'Anulada'], tone: { Completada: 'ok', Anulada: 'bad' },
    filter: { label: 'Estado', get: r => r.estado, options: ['Completada', 'Anulada'] },
    fields: [f('fecha', 'Fecha', 'date', { req: true }), f('cliente', 'Cliente', 'select', { req: true, options: clientNames }),
      f('items', 'Productos vendidos', 'items', { options: prodOpts(true), price: priceOf })],
    defaults: () => ({ fecha: today() }), base: () => ({ estado: 'Completada' }),
    validate: (o, D, r) => o.fecha > today() ? 'La fecha de la venta no puede ser futura.' : (r && r.estado === 'Anulada' ? '' : stockMsg(D, o.items, r)),
    prepare: mkItems,
    apply: (rec, prev, D) => {
      const adj = (r, s) => { if (!r || r.estado === 'Anulada') return; r.items.forEach(i => { const p = D.productos.find(x => x.nombre === i.producto); if (p) p.stock = Math.max(0, p.stock + s * i.cant); }); };
      adj(prev, 1); adj(rec, -1);
    },
    guardStatus: (r, nv, D) => r.estado === 'Anulada' && nv === 'Completada' ? stockMsg(D, r.items, null).replace('Stock insuficiente', 'No se puede reactivar. Stock insuficiente') : '',
    mov: r => ({ t: 'out', desc: `Venta ${r.id} a ${r.cliente}`, qty: `${num(units(r))} unid.` }),
    movEdit: r => r.estado === 'Anulada' ? null : { t: 'out', desc: `Venta ${r.id} modificada: inventario ajustado`, qty: `${num(units(r))} unid.` },
    movStatus: (r, p) => r.estado === p.estado ? null : r.estado === 'Anulada'
      ? { t: 'in', desc: `Venta ${r.id} anulada: stock devuelto`, qty: `${num(units(r))} unid.` }
      : { t: 'out', desc: `Venta ${r.id} reactivada`, qty: `${num(units(r))} unid.` },
    movDel: r => r.estado === 'Anulada' ? null : { t: 'in', desc: `Venta ${r.id} eliminada: stock devuelto`, qty: `${num(units(r))} unid.` },
    detail: { title: r => `Venta ${r.id}`, html: detailHTML(r => `Cliente: <b>${esc(r.cliente)}</b>, fecha ${fmt(r.fecha)}, estado ${esc(r.estado)}`) },
    nm: { new: 'Venta registrada y stock descontado.', edit: 'Venta actualizada e inventario ajustado.', del: 'Venta eliminada y stock devuelto.' }
  }));

  /* ---------- Pedidos ---------- */
  const PST = ['Pendiente', 'En preparación', 'Despachado', 'Entregado', 'Cancelado'];
  A.register('pedidos', C.create({
    key: 'ordenes', prefix: 'PED', nameKey: 'id', title: 'Pedidos', newLabel: 'Crear pedido', editRoles: ['admin', 'ventas', 'almacen'], delRoles: ['admin', 'ventas'],
    desc: 'Pedidos de clientes con productos, fecha de entrega y seguimiento de estados.', searchPh: 'Buscar por cliente, producto o código',
    searchExtra: r => r.items.map(i => i.producto).join(' '),
    cols: [{ k: 'id', label: 'Pedido' }, { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'cliente', label: 'Cliente' }, itemsCol,
      { k: 'total', label: 'Total', type: 'money' }, { k: 'entrega', label: 'Entrega', type: 'date' }, { k: 'estado', label: 'Estado', status: true }],
    sort: { k: 'fecha', dir: -1 }, states: PST, tone: { 'Pendiente': 'warn', 'En preparación': 'info', 'Despachado': 'info', 'Entregado': 'ok', 'Cancelado': 'bad' },
    filter: { label: 'Estado', get: r => r.estado, options: PST },
    fields: [f('fecha', 'Fecha del pedido', 'date', { req: true }), f('entrega', 'Fecha de entrega', 'date', { req: true }),
      f('cliente', 'Cliente', 'select', { req: true, wide: true, options: clientNames }),
      f('items', 'Productos del pedido', 'items', { options: prodOpts(false), price: priceOf }),
      f('estado', 'Estado', 'select', { req: true, options: PST })],
    defaults: () => ({ fecha: today(), entrega: ILVA.iso(ILVA.addDays(1)), estado: 'Pendiente' }),
    validate: o => o.fecha > today() ? 'La fecha del pedido no puede ser futura.' : (o.entrega < o.fecha ? 'La entrega no puede ser anterior a la fecha del pedido.' : ''),
    prepare: mkItems,
    guardDelete: (r, D) => D.distribuciones.some(d => d.pedido === r.id) ? 'No se puede eliminar: el pedido tiene una entrega en Distribución. Cancélalo en su lugar.' : '',
    detail: { title: r => `Pedido ${r.id}`, html: detailHTML(r => `Cliente: <b>${esc(r.cliente)}</b>, pedido del ${fmt(r.fecha)}, entrega ${fmt(r.entrega)}, estado ${esc(r.estado)}`) },
    nm: { new: 'Pedido creado.', edit: 'Pedido actualizado.', del: 'Pedido eliminado.' }
  }));

  /* ---------- Distribución (relacionada con pedidos) ---------- */
  const DST = ['Programada', 'En ruta', 'Entregada', 'Fallida'], SYNC = { 'Programada': 'En preparación', 'En ruta': 'Despachado', 'Entregada': 'Entregado', 'Fallida': 'En preparación' };
  A.register('distribucion', C.create({
    key: 'distribuciones', prefix: 'DST', nameKey: 'id', title: 'Distribución', newLabel: 'Programar entrega', editRoles: ['admin', 'almacen'],
    desc: 'Entregas de pedidos: destino, responsable, fecha y estado de cada reparto.', searchPh: 'Buscar por pedido, cliente, destino o responsable',
    hint: 'El estado de la entrega actualiza el pedido: En ruta lo marca Despachado y Entregada lo marca Entregado.',
    cols: [{ k: 'id', label: 'Entrega' }, { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'pedido', label: 'Pedido' }, { k: 'cliente', label: 'Cliente' },
      { k: 'destino', label: 'Destino' }, { k: 'responsable', label: 'Responsable' }, { k: 'estado', label: 'Estado', status: true }],
    sort: { k: 'fecha', dir: -1 }, states: DST, tone: { 'Programada': 'info', 'En ruta': 'warn', 'Entregada': 'ok', 'Fallida': 'bad' },
    filter: { label: 'Estado', get: r => r.estado, options: DST },
    fields: [f('pedido', 'Pedido', 'select', { req: true, wide: true, options: vals => { const D = ILVA.get(); return D.ordenes.filter(o => o.id === vals.pedido || (o.estado !== 'Cancelado' && !D.distribuciones.some(d => d.pedido === o.id))).map(o => ({ v: o.id, l: `${o.id} - ${o.cliente} (${o.estado})` })); } }),
      f('fecha', 'Fecha de entrega', 'date', { req: true }),
      f('responsable', 'Responsable', 'select', { req: true, options: () => ILVA.get().usuarios.filter(u => u.estado === 'Activo' && (u.role === 'almacen' || u.role === 'admin')).map(u => u.nombre) }),
      f('destino', 'Destino (si queda vacío, se usa la dirección del cliente)', 'text', { wide: true }),
      f('estado', 'Estado', 'select', { req: true, options: DST })],
    defaults: () => ({ fecha: today(), estado: 'Programada' }),
    validate: (o, D, r) => {
      const ped = D.ordenes.find(x => x.id === o.pedido);
      if (!ped) return 'El pedido seleccionado no existe.';
      if (ped.estado === 'Cancelado') return 'No se puede programar la entrega de un pedido cancelado.';
      return D.distribuciones.some(d => d.pedido === o.pedido && (!r || d.id !== r.id)) ? 'Este pedido ya tiene una entrega asignada.' : '';
    },
    prepare: (o, D) => { const ped = D.ordenes.find(x => x.id === o.pedido), cl = D.clientes.find(c => c.nombre === ped.cliente); return { cliente: ped.cliente, destino: o.destino || (cl ? cl.direccion : '') }; },
    apply: (rec, prev, D) => {
      if (prev && (!rec || prev.pedido !== rec.pedido)) { const po = D.ordenes.find(x => x.id === prev.pedido); if (po && po.estado === 'Despachado') po.estado = 'En preparación'; }
      if (rec) { const o = D.ordenes.find(x => x.id === rec.pedido); if (o && o.estado !== 'Cancelado') o.estado = SYNC[rec.estado]; }
    },
    nm: { new: 'Entrega programada.', edit: 'Entrega actualizada.', del: 'Entrega eliminada.' }
  }));
})();
