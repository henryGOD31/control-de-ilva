/* ILVA 360 - Dashboard: tarjetas, gráficos propios en canvas, alertas y movimientos */
(() => {
  const { icon, fmt, daysLeft, bs, ROLES, MODULES } = ILVA, A = IlvaApp, $ = s => document.querySelector(s);
  let range = 7;
  const state = p => p.stock <= p.min ? 'critico' : p.stock <= p.min * 1.25 ? 'bajo' : 'normal';
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
  const n0 = n => n.toLocaleString('es-BO');

  /* ---- Gráfico de líneas con información al pasar el cursor ---- */
  function lineChart(cv, tip, S) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'), L = 48, R = 14, T = 14, B = 28, pw = w - L - R, ph = h - T - B, n = S.labels.length;
    const all = [...S.leche, ...S.proc];
    const lo = Math.floor(Math.min(...all) / 500) * 500, hi = Math.ceil(Math.max(...all) / 500) * 500;
    const X = i => L + pw * i / (n - 1), Y = v => T + ph - (v - lo) / (hi - lo) * ph;
    const lines = [{ d: S.leche, col: '#246B91' }, { d: S.proc, col: '#70B89A' }];
    function draw(hv) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      c.font = '12px Manrope, system-ui, sans-serif'; c.textBaseline = 'middle';
      for (let g = 0; g <= 4; g++) {
        const v = lo + (hi - lo) * g / 4, y = Y(v);
        c.strokeStyle = '#E7ECF0'; c.lineWidth = 1; c.beginPath(); c.moveTo(L, y); c.lineTo(w - R, y); c.stroke();
        c.fillStyle = '#64748B'; c.textAlign = 'right'; c.fillText(n0(Math.round(v)), L - 8, y);
      }
      c.textAlign = 'center'; const step = n > 8 ? 2 : 1;
      S.labels.forEach((l, i) => { if ((n - 1 - i) % step === 0) c.fillText(l, X(i), h - 10); });
      if (hv != null) { c.strokeStyle = '#CBD5DE'; c.beginPath(); c.moveTo(X(hv), T); c.lineTo(X(hv), T + ph); c.stroke(); }
      lines.forEach((s, k) => {
        const path = () => { c.beginPath(); s.d.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v))); };
        if (k === 0) { path(); c.lineTo(X(n - 1), T + ph); c.lineTo(X(0), T + ph); c.closePath(); c.fillStyle = 'rgba(36,107,145,.07)'; c.fill(); }
        path(); c.strokeStyle = s.col; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke();
        const i = hv != null ? hv : n - 1;
        c.beginPath(); c.arc(X(i), Y(s.d[i]), 4.5, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
      });
    }
    draw(null);
    cv.onpointermove = e => {
      const x = e.clientX - cv.getBoundingClientRect().left;
      const i = Math.max(0, Math.min(n - 1, Math.round((x - L) / pw * (n - 1))));
      draw(i);
      tip.innerHTML = `<b>${S.labels[i]}</b>Recibida: ${n0(S.leche[i])} L<br>Procesada: ${n0(S.proc[i])} L`;
      tip.hidden = false; const tx = X(i);
      tip.style.left = (tx > w / 2 ? tx - tip.offsetWidth - 12 : tx + 12) + 'px';
    };
    cv.onpointerleave = () => { tip.hidden = true; draw(null); };
  }

  function donut(cv, vals, cols) {
    const dpr = window.devicePixelRatio || 1, s = cv.clientWidth; if (!s) return;
    cv.width = cv.height = s * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tot = vals.reduce((a, b) => a + b, 0), r = s / 2 - 14; let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      if (!v) return; const e = a + v / tot * 2 * Math.PI;
      c.beginPath(); c.arc(s / 2, s / 2, r, a + .03, e - .03); c.strokeStyle = cols[i]; c.lineWidth = 20; c.stroke(); a = e;
    });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#15344B'; c.font = '800 30px Manrope, system-ui, sans-serif'; c.fillText(tot, s / 2, s / 2 - 6);
    c.fillStyle = '#64748B'; c.font = '12px Manrope, system-ui, sans-serif'; c.fillText('productos', s / 2, s / 2 + 18);
  }

  function drawCharts() {
    const D = ILVA.get(), cnt = { normal: 0, bajo: 0, critico: 0 };
    D.productos.forEach(p => cnt[state(p)]++);
    lineChart($('#ch-line'), $('#tip'), ILVA.series(range));
    donut($('#ch-donut'), [cnt.normal, cnt.bajo, cnt.critico], ['#70B89A', '#D6B36A', '#B4483C']);
  }

  /* ---- Bloques con datos ---- */
  function alertsHTML(D) {
    const list = D.lotes.filter(l => !l.rev && daysLeft(l.venc) <= 10).sort((a, b) => a.venc.localeCompare(b.venc));
    if (!list.length) return `<div class="empty">${icon('check')}<b>Sin lotes por vencer</b><span>No hay lotes que venzan en los próximos 10 días.</span></div>`;
    return '<ul class="list">' + list.map(l => {
      const d = daysLeft(l.venc);
      return `<li><div class="li-main"><b>${l.prod}</b><small>Lote ${l.cod}, vence el ${fmt(l.venc)}</small></div>
        <span class="chip ${d <= 3 ? 'chip-danger' : 'chip-warn'}">${d <= 0 ? 'Vence hoy' : 'en ' + d + (d === 1 ? ' día' : ' días')}</span>
        ${A.canEdit() ? `<button class="btn btn-ghost btn-sm" data-rev="${l.cod}">Marcar revisado</button>` : ''}</li>`;
    }).join('') + '</ul>' + (A.canEdit() ? '' : '<p class="note" style="margin-top:12px">Tu perfil es de solo lectura.</p>');
  }

  function movsHTML(D) {
    const ic = { in: ['in', 'mv-in'], out: ['out', 'mv-out'], pr: ['factory', 'mv-pr'] };
    return '<ul class="list">' + D.movs.slice(0, 6).map(m =>
      `<li><span class="mv-ic ${ic[m.t][1]}">${icon(ic[m.t][0])}</span>
       <div class="li-main"><b>${m.desc}</b><small>${m.who}, ${fmt(m.d)} a las ${m.h}</small></div><span class="qty">${m.qty}</span></li>`).join('') + '</ul>';
  }

  function bindRev(el, D) {
    el.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => {
      const l = D.lotes.find(x => x.cod === b.dataset.rev); l.rev = true;
      const t = new Date(), p = n => String(n).padStart(2, '0');
      D.movs.unshift({ t: 'pr', desc: `Revisión de calidad del lote ${l.cod}`, qty: 'Revisado', d: ILVA.iso(t), h: `${p(t.getHours())}:${p(t.getMinutes())}`, who: A.user().name });
      ILVA.save(D);
      $('#alerts').innerHTML = alertsHTML(D); $('#movs').innerHTML = movsHTML(D); bindRev($('#alerts'), D);
      A.toast(`Lote ${l.cod} marcado como revisado.`);
    });
  }

  function render(el) {
    const D = ILVA.get(), u = A.user(), r = ROLES[u.role], S2 = ILVA.series(2);
    const hoyL = S2.leche[1], dl = Math.round((hoyL - S2.leche[0]) / S2.leche[0] * 100);
    const prodHoy = D.productos.reduce((a, p) => a + p.hoy, 0), meta = D.productos.reduce((a, p) => a + p.meta, 0);
    const stockBs = D.productos.reduce((a, p) => a + p.stock * p.precio, 0);
    const O = D.ordenes || [], PED = { pend: O.filter(o => o.estado === 'Pendiente' || o.estado === 'En preparación').length, ruta: O.filter(o => o.estado === 'Despachado').length, hoy: O.filter(o => o.estado === 'Entregado' && o.entrega === ILVA.iso(new Date())).length };
    const cnt = { normal: 0, bajo: 0, critico: 0 }; D.productos.forEach(p => cnt[state(p)]++);
    const porVencer = D.lotes.filter(l => !l.rev && daysLeft(l.venc) <= 10).length;
    const cats = ['Leche', 'Yogurt', 'Queso', 'Bebidas'].map(c => {
      const ps = D.productos.filter(p => p.cat === c), h = ps.reduce((a, p) => a + p.hoy, 0), m = ps.reduce((a, p) => a + p.meta, 0);
      return { c, h, m, pct: m ? Math.min(100, Math.round(h / m * 100)) : 0 };
    });
    const QUICK = ['recepcion', 'produccion', 'lotes', 'inventarios', 'ventas', 'pedidos', 'distribucion', 'reportes'];
    const quick = QUICK.filter(A.allowed).slice(0, 6).map(id => MODULES.find(m => m.id === id));
    const fecha = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    el.innerHTML = `
    <section class="welcome">
      <h1>${greet()}, ${u.name}</h1>
      <p>${r.desc}</p>
      <div class="row"><span class="demo-pill">DATOS DEMO</span><span class="date">${fecha}</span>
        <button class="btn btn-ghost btn-sm" id="go-alerts">Ver alertas (${porVencer})</button></div>
    </section>

    <div class="grid g-stats">
      <div class="card stat"><span class="stat-ic">${icon('drop')}</span><div><div class="stat-v">${n0(hoyL)} L</div><div class="stat-l">Leche recibida hoy</div>
        <div class="stat-s"><span class="${dl >= 0 ? 'up' : 'down'}">${dl >= 0 ? '+' : ''}${dl}%</span> frente a ayer</div></div></div>
      <div class="card stat"><span class="stat-ic">${icon('factory')}</span><div><div class="stat-v">${n0(prodHoy)}</div><div class="stat-l">Unidades producidas hoy</div>
        <div class="stat-s">${meta ? Math.round(prodHoy / meta * 100) : 0}% de la meta diaria</div></div></div>
      <div class="card stat"><span class="stat-ic">${icon('layers')}</span><div><div class="stat-v">${bs(stockBs)}</div><div class="stat-l">Inventario valorizado</div>
        <div class="stat-s">${cnt.bajo + cnt.critico} productos con stock bajo</div></div></div>
      <div class="card stat"><span class="stat-ic">${icon('clipboard')}</span><div><div class="stat-v">${PED.pend}</div><div class="stat-l">Pedidos pendientes</div>
        <div class="stat-s">${PED.ruta} en ruta, ${PED.hoy} entregados hoy</div></div></div>
    </div>

    <div class="grid g-2">
      <section class="card"><div class="card-h"><h3>Actividad de recepción y proceso</h3>
        <div class="seg" role="group" aria-label="Periodo"><button data-range="7" aria-pressed="true">7 días</button><button data-range="14" aria-pressed="false">14 días</button></div></div>
        <div class="chart-wrap"><canvas id="ch-line" role="img" aria-label="Litros de leche recibidos y procesados por día"></canvas><div class="tip" id="tip" hidden></div></div>
        <div class="legend"><span><i class="dot" style="background:#246B91"></i>Leche recibida (L)</span><span><i class="dot" style="background:#70B89A"></i>Leche procesada (L)</span></div></section>
      <section class="card"><div class="card-h"><h3>Estado de inventarios</h3></div>
        <div class="donut-box"><canvas id="ch-donut" role="img" aria-label="Productos por estado de stock"></canvas>
        <ul class="donut-leg">
          <li><span><i class="dot" style="background:#70B89A"></i>Stock normal</span><b>${cnt.normal}</b></li>
          <li><span><i class="dot" style="background:#D6B36A"></i>Stock bajo</span><b>${cnt.bajo}</b></li>
          <li><span><i class="dot" style="background:#B4483C"></i>Stock crítico</span><b>${cnt.critico}</b></li></ul></div></section>
    </div>

    <div class="grid g-2b">
      <section class="card"><div class="card-h"><h3>Resumen de producción de hoy</h3></div>
        ${cats.map(c => `<div class="prod-row"><div class="prod-top"><span>${c.c}</span><span><b>${n0(c.h)}</b> de ${n0(c.m)} unid.</span></div><div class="bar"><i style="width:${c.pct}%"></i></div></div>`).join('')}</section>
      <section class="card" id="alerts-card"><div class="card-h"><h3>Lotes próximos a vencer</h3></div><div id="alerts">${alertsHTML(D)}</div></section>
    </div>

    <div class="grid g-2b">
      <section class="card"><div class="card-h"><h3>Últimos movimientos</h3></div><div id="movs">${movsHTML(D)}</div></section>
      <section class="card"><div class="card-h"><h3>Accesos rápidos</h3></div>
        <div class="quick">${quick.map(m => `<button data-go="${m.id}">${icon(m.icon)}${m.name}</button>`).join('')}</div></section>
    </div>

    <div class="demo-note">${icon('info')}<span>ILVA 360 es una demostración académica. Los datos son ficticios y se guardan solo en este navegador (localStorage); no representan una base de datos empresarial real ni información interna de ILVA.</span></div>`;

    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => A.navigate(b.dataset.go));
    $('#go-alerts').onclick = () => $('#alerts-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelectorAll('[data-range]').forEach(b => b.onclick = () => {
      range = +b.dataset.range;
      el.querySelectorAll('[data-range]').forEach(x => x.setAttribute('aria-pressed', x === b));
      lineChart($('#ch-line'), $('#tip'), ILVA.series(range));
    });
    bindRev(el, D);
    drawCharts();
  }

  A.register('dashboard', render);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (A.user() && A.current() === 'dashboard') drawCharts(); }, 120); });
})();
