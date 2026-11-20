/* ILVA 360 - Módulos operativos (tanda 1): configuración sobre el motor común de crud.js */
(() => {
  const A = IlvaApp, C = IlvaCrud, today = () => ILVA.iso(new Date());
  const CATS = ['Leche', 'Yogurt', 'Queso', 'Bebidas'];
  const names = (k, ok) => () => ILVA.get()[k].filter(ok || (() => true)).map(x => x.nombre);
  const stk = p => p.stock <= p.min ? ['bad', 'Crítico'] : p.stock <= p.min * 1.25 ? ['warn', 'Bajo'] : ['ok', 'Normal'];
  const dupName = key => (o, D, r) => D[key].some(x => x.nombre.toLowerCase() === o.nombre.toLowerCase() && (!r || x.id !== r.id)) ? 'Ya existe un registro con ese nombre.' : '';
  const f = (k, label, type, extra) => Object.assign({ k, label, type }, extra);

  A.register('proveedores', C.create({
    key: 'proveedores', prefix: 'PRV', title: 'Proveedores', newLabel: 'Nuevo proveedor',
    desc: 'Productores que entregan leche cruda a la planta (datos DEMO).', searchPh: 'Buscar por nombre, zona o teléfono',
    cols: [{ k: 'id', label: 'Código' }, { k: 'nombre', label: 'Proveedor' }, { k: 'zona', label: 'Zona' }, { k: 'telefono', label: 'Teléfono' },
      { k: 'litros', label: 'Promedio diario', type: 'num', unit: 'L' }, { k: 'estado', label: 'Estado', status: true }],
    states: ['Activo', 'Inactivo'], tone: { Activo: 'ok', Inactivo: 'bad' },
    filter: { label: 'Estado', get: r => r.estado, options: ['Activo', 'Inactivo'] },
    fields: [f('nombre', 'Nombre del proveedor', 'text', { req: true, wide: true }),
      f('zona', 'Zona', 'select', { req: true, options: ['Quillacollo', 'Sacaba', 'Tiquipaya', 'Vinto', 'Colcapirhua', 'Cliza', 'Punata'] }),
      f('telefono', 'Teléfono', 'text', { req: true, pattern: /^[67]\d{7}$/, hint: 'Escribe 8 dígitos que empiecen con 6 o 7.', ph: '70000000' }),
      f('litros', 'Promedio diario (L)', 'number', { req: true, min: 1 }),
      f('estado', 'Estado', 'select', { req: true, options: ['Activo', 'Inactivo'] })],
    defaults: { estado: 'Activo' }, validate: dupName('proveedores'),
    guardDelete: (r, D) => D.recepciones.some(x => x.proveedor === r.nombre) ? 'No se puede eliminar: tiene recepciones registradas. Márcalo como Inactivo.' : '',
    nm: { new: 'Proveedor registrado.', edit: 'Proveedor actualizado.', del: 'Proveedor eliminado.' }
  }));

  A.register('recepcion', C.create({
    key: 'recepciones', prefix: 'REC', nameKey: 'id', title: 'Recepción de leche', newLabel: 'Registrar recepción', editRoles: ['admin', 'produccion'],
    desc: 'Entregas de leche cruda: cantidad, temperatura y estado de cada recepción.', searchPh: 'Buscar por proveedor o código',
    cols: [{ k: 'id', label: 'Código' }, { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'proveedor', label: 'Proveedor' },
      { k: 'litros', label: 'Cantidad', type: 'num', unit: 'L' }, { k: 'temp', label: 'Temperatura', type: 'num', unit: '°C' }, { k: 'estado', label: 'Estado', status: true }],
    sort: { k: 'fecha', dir: -1 },
    states: ['Recibida', 'En análisis', 'Rechazada'], tone: { 'Recibida': 'ok', 'En análisis': 'warn', 'Rechazada': 'bad' },
    filter: { label: 'Estado', get: r => r.estado, options: ['Recibida', 'En análisis', 'Rechazada'] },
    fields: [f('fecha', 'Fecha', 'date', { req: true }),
      f('estado', 'Estado', 'select', { req: true, options: ['Recibida', 'En análisis', 'Rechazada'] }),
      f('proveedor', 'Proveedor', 'select', { req: true, wide: true, options: names('proveedores', p => p.estado === 'Activo') }),
      f('litros', 'Cantidad (L)', 'number', { req: true, min: 1 }), f('temp', 'Temperatura (°C)', 'number', { req: true, min: 0, max: 40 })],
    defaults: () => ({ fecha: today(), estado: 'Recibida' }),
    validate: o => o.fecha > today() ? 'La fecha de recepción no puede ser futura.' : '',
    mov: r => ({ t: 'in', desc: `Recepción de leche cruda (${r.proveedor})`, qty: `${r.litros.toLocaleString('es-BO')} L` }),
    nm: { new: 'Recepción registrada.', edit: 'Recepción actualizada.', del: 'Recepción eliminada.' }
  }));

  A.register('productos', C.create({
    key: 'productos', prefix: 'P', sep: '', idw: 2, title: 'Productos', newLabel: 'Nuevo producto', editRoles: ['admin', 'produccion', 'almacen'],
    desc: 'Catálogo de productos terminados con categoría, presentación y precio en bolivianos.', searchPh: 'Buscar por nombre, categoría o presentación',
    cols: [{ k: 'id', label: 'Código' }, { k: 'nombre', label: 'Producto' }, { k: 'cat', label: 'Categoría' }, { k: 'pres', label: 'Presentación' }, { k: 'precio', label: 'Precio', type: 'money' }],
    filter: { label: 'Categoría', get: r => r.cat, options: CATS },
    fields: [f('nombre', 'Nombre del producto', 'text', { req: true, wide: true }), f('cat', 'Categoría', 'select', { req: true, options: CATS }),
      f('pres', 'Presentación', 'text', { req: true, ph: 'Ej. Botella 1 L' }), f('precio', 'Precio (Bs)', 'number', { req: true, min: 0.5 })],
    base: () => ({ stock: 0, min: 100, hoy: 0, meta: 0 }),
    validate: (o, D, r) => dupName('productos')(o, D, r) ||
      (r && o.nombre !== r.nombre && (D.lotes.some(l => l.prod === r.nombre) || D.producciones.some(p => p.producto === r.nombre)) ? 'No se puede cambiar el nombre: el producto ya tiene lotes o producción registrados.' : ''),
    guardDelete: (r, D) => D.lotes.some(l => l.prod === r.nombre) || D.producciones.some(p => p.producto === r.nombre) ? 'No se puede eliminar: el producto tiene lotes o producción registrados.' : '',
    nm: { new: 'Producto registrado.', edit: 'Producto actualizado.', del: 'Producto eliminado.' }
  }));

  A.register('produccion', C.create({
    key: 'producciones', prefix: 'PRD', nameKey: 'id', title: 'Producción', newLabel: 'Registrar producción', editRoles: ['admin', 'produccion'],
    desc: 'Órdenes de producción con cantidades, fechas y estado del proceso.', searchPh: 'Buscar por producto o código',
    hint: 'Al marcar una producción como Terminada, su cantidad se suma al inventario del producto.',
    cols: [{ k: 'id', label: 'Código' }, { k: 'fecha', label: 'Fecha', type: 'date' }, { k: 'producto', label: 'Producto' },
      { k: 'cantidad', label: 'Cantidad', type: 'num', unit: 'unid.' }, { k: 'estado', label: 'Estado', status: true }],
    sort: { k: 'fecha', dir: -1 },
    states: ['Planificada', 'En proceso', 'Terminada'], tone: { 'Planificada': 'info', 'En proceso': 'warn', 'Terminada': 'ok' },
    filter: { label: 'Estado', get: r => r.estado, options: ['Planificada', 'En proceso', 'Terminada'] },
    fields: [f('fecha', 'Fecha', 'date', { req: true }), f('estado', 'Estado', 'select', { req: true, options: ['Planificada', 'En proceso', 'Terminada'] }),
      f('producto', 'Producto', 'select', { req: true, wide: true, options: names('productos') }), f('cantidad', 'Cantidad (unid.)', 'number', { req: true, min: 1, int: true })],
    defaults: () => ({ fecha: today(), estado: 'Planificada' }),
    apply: (rec, prev, D) => {
      const adj = (r, s) => { if (!r || r.estado !== 'Terminada') return; const p = D.productos.find(x => x.nombre === r.producto); if (p) p.stock = Math.max(0, p.stock + s * r.cantidad); };
      adj(prev, -1); adj(rec, 1);
    },
    mov: r => ({ t: 'pr', desc: `Producción de ${r.producto}`, qty: `${r.cantidad.toLocaleString('es-BO')} unid.` }),
    nm: { new: 'Producción registrada.', edit: 'Producción actualizada.', del: 'Producción eliminada.' }
  }));

  const vig = r => { const d = ILVA.daysLeft(r.venc); return d < 0 ? ['bad', 'Vencido'] : d <= 10 ? ['warn', 'Por vencer'] : ['ok', 'Vigente']; };
  A.register('lotes', C.create({
    key: 'lotes', idKey: 'cod', nameKey: 'cod', title: 'Lotes y trazabilidad', newLabel: 'Nuevo lote', editRoles: ['admin', 'produccion', 'almacen'],
    desc: 'Código de cada lote con sus fechas de elaboración y vencimiento.', searchPh: 'Buscar por lote o producto',
    cols: [{ k: 'cod', label: 'Lote' }, { k: 'prod', label: 'Producto' }, { k: 'elab', label: 'Elaboración', type: 'date' }, { k: 'venc', label: 'Vencimiento', type: 'date' },
      { k: 'vig', label: 'Vigencia', get: r => ILVA.daysLeft(r.venc), chip: vig }],
    sort: { k: 'venc', dir: 1 },
    filter: { label: 'Vigencia', get: r => vig(r)[1], options: ['Vigente', 'Por vencer', 'Vencido'] },
    fields: [f('prod', 'Producto', 'select', { req: true, wide: true, options: names('productos') }), f('elab', 'Elaboración', 'date', { req: true }), f('venc', 'Vencimiento', 'date', { req: true })],
    defaults: () => ({ elab: today() }), base: () => ({ rev: false }),
    genId: D => { const t = new Date(), n = D.lotes.reduce((a, l) => Math.max(a, parseInt(l.cod.split('-').pop(), 10) || 0), 0); return `LT-${String(t.getFullYear()).slice(2)}${String(t.getMonth() + 1).padStart(2, '0')}-${String(n + 1).padStart(3, '0')}`; },
    validate: o => o.venc <= o.elab ? 'El vencimiento debe ser posterior a la fecha de elaboración.' : '',
    mov: r => ({ t: 'pr', desc: `Lote ${r.cod} registrado (${r.prod})`, qty: 'Nuevo lote' }),
    nm: { new: 'Lote registrado.', edit: 'Lote actualizado.', del: 'Lote eliminado.' }
  }));

  A.register('inventarios', C.create({
    key: 'productos', title: 'Inventarios', noAdd: true, noDelete: true, adjust: true, editRoles: ['admin', 'produccion', 'almacen'],
    desc: 'Existencias de producto terminado, entradas, salidas y alertas de stock.', searchPh: 'Buscar por producto o categoría',
    cols: [{ k: 'nombre', label: 'Producto' }, { k: 'cat', label: 'Categoría' }, { k: 'stock', label: 'Existencias', type: 'num', unit: 'unid.' },
      { k: 'min', label: 'Mínimo', type: 'num', unit: 'unid.' }, { k: 'estado', label: 'Estado', get: r => r.stock / (r.min || 1), chip: stk },
      { k: 'valor', label: 'Valor', type: 'money', get: r => r.stock * r.precio }],
    filter: { label: 'Estado', get: r => stk(r)[1], options: ['Normal', 'Bajo', 'Crítico'] },
    editFields: [f('min', 'Stock mínimo (unid.)', 'number', { req: true, min: 0, int: true })],
    nm: { new: '', edit: 'Stock mínimo actualizado.', del: '' }
  }));
})();
