/* Catálogo de módulos, roles e iconos */
(() => {
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    factory: '<path d="M3 20V9l6 4V9l6 4V5h3v15z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v5l3 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    in: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    out: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
  };
  ILVA.icon = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  ILVA.MODULES = [
    { id: 'dashboard', name: 'Dashboard', icon: 'home', group: 'General' },
    { id: 'proveedores', name: 'Proveedores', icon: 'truck', group: 'Abastecimiento' },
    { id: 'recepcion', name: 'Recepción de leche', icon: 'drop', group: 'Abastecimiento' },
    { id: 'productos', name: 'Productos', icon: 'box', group: 'Planta' },
    { id: 'produccion', name: 'Producción', icon: 'factory', group: 'Planta' },
    { id: 'lotes', name: 'Lotes y trazabilidad', icon: 'tag', group: 'Planta' },
    { id: 'inventarios', name: 'Inventarios', icon: 'layers', group: 'Planta' },
    { id: 'clientes', name: 'Clientes', icon: 'users', group: 'Comercial' },
    { id: 'ventas', name: 'Ventas', icon: 'cart', group: 'Comercial' },
    { id: 'pedidos', name: 'Pedidos', icon: 'clipboard', group: 'Comercial' },
    { id: 'distribucion', name: 'Distribución', icon: 'route', group: 'Comercial' },
    { id: 'reportes', name: 'Reportes', icon: 'chart', group: 'Gestión' },
    { id: 'usuarios', name: 'Usuarios', icon: 'shield', group: 'Gestión' },
    { id: 'auditoria', name: 'Auditoría', icon: 'history', group: 'Gestión' }
  ];

  ILVA.ROLES = {
    admin: { label: 'Administrador', short: 'Acceso completo', edit: true, modules: '*',
      desc: 'Tienes acceso a los 14 módulos y a la administración de usuarios.' },
    produccion: { label: 'Producción', short: 'Planta y lotes', edit: true,
      modules: ['dashboard', 'recepcion', 'productos', 'produccion', 'lotes', 'inventarios'],
      desc: 'Registra la leche recibida, la producción y los lotes de la planta.' },
    almacen: { label: 'Almacén', short: 'Existencias', edit: true,
      modules: ['dashboard', 'productos', 'lotes', 'inventarios', 'pedidos', 'distribucion'],
      desc: 'Controla existencias, salidas y despachos de producto terminado.' },
    ventas: { label: 'Ventas', short: 'Clientes y pedidos', edit: true,
      modules: ['dashboard', 'productos', 'clientes', 'ventas', 'pedidos', 'distribucion'],
      desc: 'Gestiona clientes, ventas y el seguimiento de pedidos.' },
    consulta: { label: 'Consulta', short: 'Solo lectura', edit: false,
      modules: ['dashboard', 'productos', 'lotes', 'inventarios', 'reportes'],
      desc: 'Puedes consultar la información, pero no modificarla.' }
  };
})();
