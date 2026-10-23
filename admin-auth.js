// Personal authentication precedes the existing administrator PIN check.
(() => {
  const group = document.createElement('div');
  group.id = 'personalAuth';
  group.innerHTML = '<label for="adminEmail">Correo personal autorizado</label><input id="adminEmail" type="email" autocomplete="username"><label for="adminPassword">Contraseña de la cuenta personal</label><input id="adminPassword" type="password" autocomplete="current-password"><p class="msg">Primero se verifica su cuenta personal; después, el PIN existente.</p>';
  $('pinGroup').before(group);
  const sync = () => group.classList.toggle('hide', $('role').value !== 'admin');
  $('role').addEventListener('change', sync);
  sync();
  let busy = false;
  async function enter(event) {
    if ($('role').value !== 'admin') return;
    if (event.type === 'keydown' && event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    busy = true;
    $('enter').disabled = true;
    try {
      const email = $('adminEmail').value.trim();
      const password = $('adminPassword').value;
      if (!email || !password || !$('pin').value) throw new Error('Ingrese correo, contraseña personal y PIN.');
      // Reuse this client in login; never persist an administrator auth session.
      db ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth: {persistSession: false, detectSessionInUrl: false}});
      const {error} = await db.auth.signInWithPassword({email, password});
      if (error) throw new Error('No se pudo verificar la cuenta personal. Revise sus datos y la confirmación del correo.');
      await login();
    } catch (error) {
      $('loginmsg').textContent = error.message;
    } finally {
      $('adminPassword').value = '';
      $('pin').value = '';
      busy = false;
      $('enter').disabled = false;
    }
  }
  $('enter').addEventListener('click', enter, true);
  $('login').addEventListener('keydown', enter, true);
  $('logout').addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    try { if (db) await db.auth.signOut({scope: 'local'}); }
    finally { location.reload(); }
  }, true);
})();
