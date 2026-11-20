/* ILVA 360 - Datos DEMO. Todo es ficticio y se guarda solo en localStorage. */
const ILVA = (() => {
  const KEY = 'ilva360_demo_v1';
  const pad = n => String(n).padStart(2, '0');
  const addDays = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmt = s => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const daysLeft = s => Math.round((new Date(s + 'T12:00:00') - addDays(0)) / 864e5);
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const bs = n => 'Bs ' + n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const accounts = [
    { user: 'admin', role: 'admin', name: 'Admin DEMO' },
    { user: 'produccion', role: 'produccion', name: 'Producción DEMO' },
    { user: 'almacen', role: 'almacen', name: 'Almacén DEMO' },
    { user: 'ventas', role: 'ventas', name: 'Ventas DEMO' },
    { user: 'consulta', role: 'consulta', name: 'Consulta DEMO' }
  ];

  /* Serie diaria de leche recibida y procesada (litros), coherente y determinista */
  function series(n) {
    const S = { labels: [], leche: [], proc: [] };
    for (let k = -(n - 1); k <= 0; k++) {
      const d = addDays(k);
      const leche = Math.round(4000 + rnd(k) * 900);
      S.labels.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}`);
      S.leche.push(leche);
      S.proc.push(Math.round(leche * (0.86 + rnd(k + 50) * 0.1)));
    }
    return S;
  }

  const N = { L1: 'Leche pasteurizada 1 L', LS: 'Leche saborizada 200 ml', YN: 'Yogurt natural 1 L', YD: 'Yogurt de durazno 500 ml', QC: 'Queso criollo 1 kg', QM: 'Queso mozzarella 500 g', BT: 'Bebida frutal de tumbo 300 ml', BM: 'Bebida frutal de maracuyá 300 ml' };
  const PR = { L1: 8.5, LS: 3, YN: 14, YD: 9, QC: 48, QM: 32, BT: 4.5, BM: 4.5 };
  const it = (k, c) => ({ producto: N[k], cant: c, precio: PR[k] });
  const tot = items => Math.round(items.reduce((a, i) => a + i.cant * i.precio, 0) * 100) / 100;
  const clis = () => [
    { id: 'CLI-001', nombre: 'Minimarket DEMO El Prado', tipo: 'Minorista', zona: 'Cercado', telefono: '70010001', direccion: 'Calle DEMO 101, Cercado' },
    { id: 'CLI-002', nombre: 'Tienda DEMO Villa Busch', tipo: 'Minorista', zona: 'Cercado', telefono: '70010002', direccion: 'Calle DEMO 202, Cercado' },
    { id: 'CLI-003', nombre: 'Distribuidora DEMO Valle Alto', tipo: 'Mayorista', zona: 'Sacaba', telefono: '70010003', direccion: 'Av. DEMO 303, Sacaba' },
    { id: 'CLI-004', nombre: 'Restaurante DEMO Sabor Andino', tipo: 'Institucional', zona: 'Cercado', telefono: '70010004', direccion: 'Calle DEMO 404, Cercado' },
    { id: 'CLI-005', nombre: 'Colegio DEMO Los Pinos', tipo: 'Institucional', zona: 'Tiquipaya', telefono: '60010005', direccion: 'Calle DEMO 505, Tiquipaya' },
    { id: 'CLI-006', nombre: 'Supermercado DEMO Quillacollo', tipo: 'Mayorista', zona: 'Quillacollo', telefono: '70010006', direccion: 'Av. DEMO 606, Quillacollo' },
    { id: 'CLI-007', nombre: 'Cafetería DEMO La Plaza', tipo: 'Minorista', zona: 'Cercado', telefono: '60010007', direccion: 'Plaza DEMO 707, Cercado' },
    { id: 'CLI-008', nombre: 'Hotel DEMO Cerro Verde', tipo: 'Institucional', zona: 'Cercado', telefono: '70010008', direccion: 'Av. DEMO 808, Cercado' }
  ];
  const CN = i => clis()[i - 1].nombre, CD = i => clis()[i - 1].direccion;
  const vt = (id, d, c, items, estado = 'Completada') => ({ id, fecha: iso(addDays(d)), cliente: CN(c), items, total: tot(items), estado });
  const od = (id, d, e, c, items, estado) => ({ id, fecha: iso(addDays(d)), entrega: iso(addDays(e)), cliente: CN(c), items, total: tot(items), estado });
  const ds = (id, ped, c, d, resp, estado) => ({ id, pedido: ped, cliente: CN(c), destino: CD(c), responsable: resp, fecha: iso(addDays(d)), estado });
  const au = (id, d, h, u, rol, accion, modulo, desc) => ({ id, fecha: iso(addDays(d)), hora: h, usuario: u, rol, accion, modulo, desc });

  const seed = () => ({
    productos: [
      { id: 'P01', pres: 'Botella 1 L', nombre: 'Leche pasteurizada 1 L', cat: 'Leche', precio: 8.5, stock: 1840, min: 600, hoy: 1420, meta: 1500 },
      { id: 'P02', pres: 'Sachet 200 ml', nombre: 'Leche saborizada 200 ml', cat: 'Leche', precio: 3, stock: 960, min: 400, hoy: 900, meta: 1200 },
      { id: 'P03', pres: 'Botella 1 L', nombre: 'Yogurt natural 1 L', cat: 'Yogurt', precio: 14, stock: 280, min: 250, hoy: 260, meta: 320 },
      { id: 'P04', pres: 'Vaso 500 ml', nombre: 'Yogurt de durazno 500 ml', cat: 'Yogurt', precio: 9, stock: 540, min: 300, hoy: 410, meta: 450 },
      { id: 'P05', pres: 'Pieza 1 kg', nombre: 'Queso criollo 1 kg', cat: 'Queso', precio: 48, stock: 85, min: 80, hoy: 40, meta: 60 },
      { id: 'P06', pres: 'Bolsa 500 g', nombre: 'Queso mozzarella 500 g', cat: 'Queso', precio: 32, stock: 60, min: 70, hoy: 35, meta: 50 },
      { id: 'P07', pres: 'Botella 300 ml', nombre: 'Bebida frutal de tumbo 300 ml', cat: 'Bebidas', precio: 4.5, stock: 720, min: 300, hoy: 600, meta: 700 },
      { id: 'P08', pres: 'Botella 300 ml', nombre: 'Bebida frutal de maracuyá 300 ml', cat: 'Bebidas', precio: 4.5, stock: 410, min: 300, hoy: 520, meta: 600 }
    ],
    lotes: [
      { cod: 'LT-2611-004', prod: 'Leche pasteurizada 1 L', elab: iso(addDays(-5)), venc: iso(addDays(2)), rev: false },
      { cod: 'LT-2611-007', prod: 'Yogurt natural 1 L', elab: iso(addDays(-12)), venc: iso(addDays(3)), rev: false },
      { cod: 'LT-2611-011', prod: 'Yogurt de durazno 500 ml', elab: iso(addDays(-10)), venc: iso(addDays(6)), rev: false },
      { cod: 'LT-2611-013', prod: 'Queso mozzarella 500 g', elab: iso(addDays(-20)), venc: iso(addDays(9)), rev: false },
      { cod: 'LT-2611-016', prod: 'Bebida frutal de tumbo 300 ml', elab: iso(addDays(-30)), venc: iso(addDays(21)), rev: false },
      { cod: 'LT-2611-018', prod: 'Queso criollo 1 kg', elab: iso(addDays(-8)), venc: iso(addDays(34)), rev: false }
    ],
    movs: [
      { t: 'in', desc: 'Recepción de leche cruda (proveedor DEMO 03)', qty: '2.350 L', d: iso(addDays(0)), h: '07:40', who: 'Producción DEMO' },
      { t: 'pr', desc: 'Producción de leche pasteurizada 1 L', qty: '1.420 unid.', d: iso(addDays(0)), h: '10:15', who: 'Producción DEMO' },
      { t: 'out', desc: 'Salida a distribución, ruta Cercado', qty: '480 unid.', d: iso(addDays(0)), h: '11:05', who: 'Almacén DEMO' },
      { t: 'pr', desc: 'Producción de yogurt de durazno 500 ml', qty: '410 unid.', d: iso(addDays(-1)), h: '15:30', who: 'Producción DEMO' },
      { t: 'in', desc: 'Entrada de frutas y envases', qty: '12 cajas', d: iso(addDays(-1)), h: '09:20', who: 'Almacén DEMO' },
      { t: 'out', desc: 'Pedido PED-0148 despachado', qty: '120 unid.', d: iso(addDays(-1)), h: '08:10', who: 'Ventas DEMO' }
    ],
    proveedores: [
      { id: 'PRV-001', nombre: 'Productor DEMO Quillacollo A', zona: 'Quillacollo', telefono: '70000001', litros: 820, estado: 'Activo' },
      { id: 'PRV-002', nombre: 'Productor DEMO Sacaba B', zona: 'Sacaba', telefono: '70000002', litros: 640, estado: 'Activo' },
      { id: 'PRV-003', nombre: 'Productor DEMO Tiquipaya C', zona: 'Tiquipaya', telefono: '70000003', litros: 510, estado: 'Activo' },
      { id: 'PRV-004', nombre: 'Productor DEMO Cliza D', zona: 'Cliza', telefono: '60000004', litros: 930, estado: 'Activo' },
      { id: 'PRV-005', nombre: 'Productor DEMO Punata E', zona: 'Punata', telefono: '60000005', litros: 760, estado: 'Activo' },
      { id: 'PRV-006', nombre: 'Productor DEMO Vinto F', zona: 'Vinto', telefono: '70000006', litros: 480, estado: 'Activo' },
      { id: 'PRV-007', nombre: 'Productor DEMO Colcapirhua G', zona: 'Colcapirhua', telefono: '70000007', litros: 350, estado: 'Inactivo' },
      { id: 'PRV-008', nombre: 'Productor DEMO Sacaba H', zona: 'Sacaba', telefono: '70000008', litros: 420, estado: 'Activo' }
    ],
    recepciones: [
      { id: 'REC-001', fecha: iso(addDays(0)), proveedor: 'Productor DEMO Cliza D', litros: 930, temp: 4.1, estado: 'Recibida' },
      { id: 'REC-002', fecha: iso(addDays(0)), proveedor: 'Productor DEMO Quillacollo A', litros: 820, temp: 4.4, estado: 'Recibida' },
      { id: 'REC-003', fecha: iso(addDays(0)), proveedor: 'Productor DEMO Punata E', litros: 600, temp: 6.8, estado: 'En análisis' },
      { id: 'REC-004', fecha: iso(addDays(-1)), proveedor: 'Productor DEMO Sacaba B', litros: 640, temp: 4.0, estado: 'Recibida' },
      { id: 'REC-005', fecha: iso(addDays(-1)), proveedor: 'Productor DEMO Tiquipaya C', litros: 510, temp: 4.6, estado: 'Recibida' },
      { id: 'REC-006', fecha: iso(addDays(-2)), proveedor: 'Productor DEMO Vinto F', litros: 480, temp: 9.2, estado: 'Rechazada' },
      { id: 'REC-007', fecha: iso(addDays(-2)), proveedor: 'Productor DEMO Cliza D', litros: 910, temp: 4.3, estado: 'Recibida' },
      { id: 'REC-008', fecha: iso(addDays(-3)), proveedor: 'Productor DEMO Sacaba H', litros: 420, temp: 4.8, estado: 'Recibida' },
      { id: 'REC-009', fecha: iso(addDays(-4)), proveedor: 'Productor DEMO Punata E', litros: 760, temp: 4.2, estado: 'Recibida' },
      { id: 'REC-010', fecha: iso(addDays(-5)), proveedor: 'Productor DEMO Quillacollo A', litros: 800, temp: 4.5, estado: 'Recibida' }
    ],
    producciones: [
      { id: 'PRD-001', fecha: iso(addDays(0)), producto: 'Leche pasteurizada 1 L', cantidad: 1420, estado: 'Terminada' },
      { id: 'PRD-002', fecha: iso(addDays(0)), producto: 'Yogurt natural 1 L', cantidad: 260, estado: 'En proceso' },
      { id: 'PRD-003', fecha: iso(addDays(1)), producto: 'Queso criollo 1 kg', cantidad: 60, estado: 'Planificada' },
      { id: 'PRD-004', fecha: iso(addDays(-1)), producto: 'Yogurt de durazno 500 ml', cantidad: 410, estado: 'Terminada' },
      { id: 'PRD-005', fecha: iso(addDays(-1)), producto: 'Bebida frutal de tumbo 300 ml', cantidad: 600, estado: 'Terminada' },
      { id: 'PRD-006', fecha: iso(addDays(-2)), producto: 'Queso mozzarella 500 g', cantidad: 50, estado: 'Terminada' },
      { id: 'PRD-007', fecha: iso(addDays(-3)), producto: 'Leche saborizada 200 ml', cantidad: 900, estado: 'Terminada' },
      { id: 'PRD-008', fecha: iso(addDays(1)), producto: 'Bebida frutal de maracuyá 300 ml', cantidad: 600, estado: 'Planificada' }
    ],
    clientes: clis(),
    ventas: [
      vt('VTA-001', -9, 3, [it('L1', 200), it('YN', 40)]), vt('VTA-002', -8, 6, [it('L1', 150), it('QM', 15), it('BT', 60)]),
      vt('VTA-003', -6, 1, [it('L1', 60), it('YD', 36)]), vt('VTA-004', -5, 5, [it('LS', 120), it('BM', 48)], 'Anulada'),
      vt('VTA-005', -4, 2, [it('L1', 36), it('QC', 6)]), vt('VTA-006', -3, 7, [it('YD', 24), it('BT', 24)]),
      vt('VTA-007', -1, 8, [it('YN', 30), it('QC', 8)]), vt('VTA-008', 0, 1, [it('L1', 48), it('BM', 24)])
    ],
    ordenes: [
      od('PED-001', -4, -3, 3, [it('L1', 300), it('YN', 60)], 'Entregado'), od('PED-002', -3, -2, 6, [it('L1', 240), it('QM', 20)], 'Entregado'),
      od('PED-003', -2, 0, 1, [it('L1', 60), it('BT', 48)], 'Entregado'), od('PED-004', -1, 0, 5, [it('L1', 120), it('YD', 48)], 'Despachado'),
      od('PED-005', -1, 0, 4, [it('QC', 10), it('YN', 12)], 'Despachado'), od('PED-006', 0, 1, 2, [it('L1', 36), it('BM', 24)], 'En preparación'),
      od('PED-007', 0, 2, 8, [it('YD', 36), it('QC', 6)], 'Pendiente'), od('PED-008', 0, 2, 7, [it('LS', 60)], 'Pendiente'),
      od('PED-009', -2, -1, 1, [it('YN', 24)], 'Cancelado')
    ],
    distribuciones: [
      ds('DST-001', 'PED-001', 3, -3, 'Almacén DEMO', 'Entregada'), ds('DST-002', 'PED-002', 6, -2, 'Almacén DEMO 2', 'Entregada'),
      ds('DST-003', 'PED-003', 1, 0, 'Almacén DEMO', 'Entregada'), ds('DST-004', 'PED-004', 5, 0, 'Almacén DEMO 2', 'En ruta'),
      ds('DST-005', 'PED-005', 4, 0, 'Almacén DEMO', 'En ruta'), ds('DST-006', 'PED-006', 2, 1, 'Almacén DEMO 2', 'Programada')
    ],
    usuarios: [
      { id: 'USR-001', user: 'admin', nombre: 'Admin DEMO', role: 'admin', estado: 'Activo' },
      { id: 'USR-002', user: 'produccion', nombre: 'Producción DEMO', role: 'produccion', estado: 'Activo' },
      { id: 'USR-003', user: 'almacen', nombre: 'Almacén DEMO', role: 'almacen', estado: 'Activo' },
      { id: 'USR-004', user: 'ventas', nombre: 'Ventas DEMO', role: 'ventas', estado: 'Activo' },
      { id: 'USR-005', user: 'consulta', nombre: 'Consulta DEMO', role: 'consulta', estado: 'Activo' },
      { id: 'USR-006', user: 'almacen2', nombre: 'Almacén DEMO 2', role: 'almacen', estado: 'Activo' },
      { id: 'USR-007', user: 'ventas2', nombre: 'Ventas DEMO 2', role: 'ventas', estado: 'Inactivo' }
    ],
    auditoria: [
      au('AUD-0001', -2, '08:02', 'Admin DEMO', 'Administrador', 'Ingreso', 'Acceso', 'Inicio de sesión (simulado)'),
      au('AUD-0002', -2, '08:20', 'Producción DEMO', 'Producción', 'Crear', 'Recepción de leche', 'Se creó «REC-007»'),
      au('AUD-0003', -2, '09:45', 'Producción DEMO', 'Producción', 'Estado', 'Producción', '«PRD-006» cambió de «En proceso» a «Terminada»'),
      au('AUD-0004', -1, '10:10', 'Ventas DEMO', 'Ventas', 'Crear', 'Ventas', 'Se creó «VTA-007»'),
      au('AUD-0005', -1, '11:30', 'Ventas DEMO', 'Ventas', 'Crear', 'Pedidos', 'Se creó «PED-004»'),
      au('AUD-0006', -1, '15:05', 'Almacén DEMO', 'Almacén', 'Ajuste', 'Inventarios', 'Salida de 480 unid. en «Leche pasteurizada 1 L»'),
      au('AUD-0007', 0, '07:55', 'Almacén DEMO', 'Almacén', 'Estado', 'Distribución', '«DST-004» cambió de «Programada» a «En ruta»'),
      au('AUD-0008', 0, '08:15', 'Admin DEMO', 'Administrador', 'Editar', 'Usuarios', 'Se editó «USR-007»')
    ],
    pedidos: { pendientes: 7, enRuta: 3, entregadosHoy: 5 }
  });

  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ } }
  function get() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) { /* completa colecciones nuevas en datos guardados por versiones anteriores */
        const d = JSON.parse(s), n = seed(); let ch = false;
        Object.keys(n).forEach(k => { if (!(k in d)) { d[k] = n[k]; ch = true; } });
        if (ch) save(d);
        return d;
      }
    } catch (e) { /* datos dañados: se recrean */ }
    const d = seed(); save(d); return d;
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} return get(); }

  /* Cuentas de demostración (la contraseña de todas es demo123: simulación, no seguridad real) */
  function findUser(u) {
    const x = get().usuarios.find(a => a.user === u);
    return x && ILVA.ROLES[x.role] ? { user: x.user, role: x.role, name: x.nombre, estado: x.estado } : null;
  }
  /* Registro de auditoría: se agrega a D y quien llama debe guardar D */
  function pushAudit(D, u, accion, modulo, desc) {
    const t = new Date(), n = D.auditoria.reduce((a, x) => Math.max(a, parseInt(String(x.id).slice(4), 10) || 0), 0) + 1;
    D.auditoria.unshift({ id: 'AUD-' + String(n).padStart(4, '0'), fecha: iso(t), hora: `${pad(t.getHours())}:${pad(t.getMinutes())}`,
      usuario: u ? u.name : 'Sistema', rol: u && ILVA.ROLES[u.role] ? ILVA.ROLES[u.role].label : '-', accion, modulo, desc });
    D.auditoria = D.auditoria.slice(0, 300);
  }

  return { get, save, reset, series, fmt, iso, addDays, daysLeft, bs, accounts, findUser, pushAudit };
})();
