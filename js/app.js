/* ILVA 360 - Núcleo: sesión visual, roles, menú, notificaciones y confirmaciones */
const IlvaApp = (() => {
  const $ = s => document.querySelector(s);
  const { icon, ROLES, MODULES } = ILVA;
  const SK = 'ilva360_session';
  const renderers = {};
  let user = null, current = 'dashboard';

  const allowed = id => { const r = ROLES[user.role]; return r.modules === '*' || r.modules.includes(id); };
  const modName = id => MODULES.find(m => m.id === id).name;

  function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = icon(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check') + `<span>${msg}</span>`;
    const box = $('#toasts'); box.append(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3800);
  }

  function confirmBox(title, msg, ok = 'Confirmar') {
    return new Promise(res => {
      const m = $('#modal'), okb = $('#modal-ok'), no = $('#modal-cancel');
      $('#modal-title').textContent = title; $('#modal-msg').textContent = msg; okb.textContent = ok;
      m.hidden = false; okb.focus();
      const done = v => { m.hidden = true; okb.onclick = no.onclick = m.onclick = null; document.removeEventListener('keydown', esc); res(v); };
      const esc = e => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', esc);
      okb.onclick = () => done(true); no.onclick = () => done(false);
      m.onclick = e => { if (e.target === m) done(false); };
    });
  }

  /* Acceso */
  function bindLogin() {
    $('#role-list').innerHTML = ILVA.accounts.map(a =>
      `<button type="button" class="role-opt" data-user="${a.user}"><b>${ROLES[a.role].label}</b><small>${ROLES[a.role].short}</small></button>`).join('');
    const err = $('#login-err');
    document.querySelectorAll('.role-opt').forEach(b => b.onclick = () => {
      document.querySelectorAll('.role-opt').forEach(x => x.classList.toggle('sel', x === b));
      $('#lg-user').value = b.dataset.user; $('#lg-pass').value = 'demo123'; err.textContent = '';
    });
    $('#login-form').onsubmit = e => {
      e.preventDefault();
      const u = $('#lg-user').value.trim().toLowerCase(), p = $('#lg-pass').value;
      if (!u || !p) { err.textContent = 'Escribe usuario y contraseña, o elige un perfil de demostración.'; return; }
      const a = ILVA.findUser(u);
      if (!a || p !== 'demo123') { err.textContent = 'Usuario o contraseña incorrectos. Elige uno de los perfiles de la lista.'; return; }
      if (a.estado !== 'Activo') { err.textContent = 'Esta cuenta está inactiva. Pide a un administrador que la active.'; return; }
      err.textContent = ''; start(a);
    };
  }

  function start(a, restore) {
    user = a; try { sessionStorage.setItem(SK, a.user); } catch (e) {}
    const r = ROLES[a.role];
    $('#view-login').hidden = true; $('#view-app').hidden = false;
    $('#avatar').textContent = a.name.split(' ').map(w => w[0]).slice(0, 2).join('');
    $('#u-name').textContent = a.name; $('#u-role').textContent = r.label;
    buildMenu(); const h = location.hash.slice(1); navigate(renderers[h] && allowed(h) ? h : 'dashboard'); toast(`Bienvenido, perfil ${r.label}.`);
    if (!restore) audit('Ingreso', 'Acceso', 'Inicio de sesión (simulado)');
  }

  function audit(accion, modulo, desc) {
    if (!user) return;
    const D = ILVA.get(); ILVA.pushAudit(D, user, accion, modulo, desc); ILVA.save(D);
  }

  function logout(msg) {
    audit('Cierre', 'Acceso', 'Cierre de sesión (simulado)');
    user = null; try { sessionStorage.removeItem(SK); } catch (e) {}
    document.body.classList.remove('nav-open'); $('#acct-pop').hidden = true;
    $('#login-form').reset(); document.querySelectorAll('.role-opt').forEach(x => x.classList.remove('sel'));
    $('#view-app').hidden = true; $('#view-login').hidden = false; toast(msg, 'info');
  }

  /* Menú y navegación */
  function buildMenu() {
    let html = '', group = '';
    MODULES.filter(m => allowed(m.id)).forEach(m => {
      if (m.group !== group) { group = m.group; html += `<div class="menu-group">${group}</div>`; }
      html += `<button class="menu-item" data-id="${m.id}">${icon(m.icon)}<span>${m.name}</span></button>`;
    });
    $('#menu').innerHTML = html;
    document.querySelectorAll('.menu-item').forEach(b => b.onclick = () => navigate(b.dataset.id));
  }

  function navigate(id) {
    if (!allowed(id)) { toast('Tu perfil no tiene acceso a este módulo.', 'err'); return; }
    document.body.classList.remove('nav-open');
    if (!renderers[id]) { toast(`El módulo «${modName(id)}» no está disponible en este momento.`, 'err'); return; }
    current = id;
    document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    $('#crumb').textContent = modName(id);
    const c = $('#content'); c.onclick = c.oninput = c.onchange = null; try { history.replaceState(null, '', '#' + id); } catch (e) {} renderers[id](c); c.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }

  async function resetData() {
    $('#acct-pop').hidden = true;
    if (await confirmBox('Restablecer datos DEMO', 'Se borrarán los cambios guardados en este navegador y se volverán a cargar los datos de ejemplo.', 'Restablecer')) {
      ILVA.reset(); navigate(current); toast('Datos DEMO restablecidos.');
    }
  }

  function init() {
    $('#btn-menu').innerHTML = icon('menu');
    $('#act-switch').innerHTML = icon('swap') + 'Cambiar de perfil';
    $('#act-reset').innerHTML = icon('refresh') + 'Restablecer datos DEMO';
    $('#act-logout').innerHTML = icon('logout') + 'Cerrar sesión';
    const t = new Date(), p = n => String(n).padStart(2, '0');
    $('#top-date').textContent = `${p(t.getDate())}/${p(t.getMonth() + 1)}/${t.getFullYear()}`;
    $('#btn-menu').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    $('#acct-btn').onclick = e => { e.stopPropagation(); const h = $('#acct-pop').hidden; $('#acct-pop').hidden = !h; $('#acct-btn').setAttribute('aria-expanded', h); };
    document.addEventListener('click', () => { $('#acct-pop').hidden = true; });
    $('#act-switch').onclick = () => logout('Elige otro perfil de demostración.');
    $('#act-logout').onclick = () => logout('Sesión cerrada (simulación).');
    $('#act-reset').onclick = resetData;
    bindLogin();
    let s = null; try { s = sessionStorage.getItem(SK); } catch (e) {}
    const a = s && ILVA.findUser(s);
    if (a && a.estado === 'Activo') start(a, true); else $('#view-login').hidden = false;
  }
  document.addEventListener('DOMContentLoaded', init);

  return { toast, confirm: confirmBox, navigate, allowed, audit,
    register: (id, fn) => { renderers[id] = fn; },
    user: () => user, current: () => current, canEdit: () => ROLES[user.role].edit };
})();
