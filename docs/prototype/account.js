'use strict';
(() => {
  const signin = document.getElementById('account-signin');
  const signout = document.getElementById('account-signout');
  const status = document.getElementById('account-status');
  const tell = message => { status.textContent = message; };
  if (!window.supabase || !window.isSecureContext) {
    tell('Sign-in is unavailable here. Open Tripbox over HTTPS and check your connection.');
    return;
  }
  const client = window.supabase.createClient(
    'https://ugdvkdsxpxyjiutyfcwb.supabase.co',
    'sb_publishable_-2wXv8NgwbNgTdNAzmKT2g_DL46sXWo',
    { auth: { flowType: 'pkce', detectSessionInUrl: true } }
  );
  function show(session) {
    signin.hidden = !!session;
    signout.hidden = !session;
    signin.disabled = false;
    tell(session ? 'Signed in. Your photos and style references remain on this device.' : 'Sign in with your Google account.');
  }
  client.auth.onAuthStateChange((_event, session) => show(session));
  client.auth.getSession().then(({ data, error }) => {
    if (error) { signin.disabled = false; tell('Could not check your session. Try signing in again.'); return; }
    show(data.session);
  }).catch(() => { signin.disabled = false; tell('Could not reach the sign-in service. Check your connection and try again.'); });
  signin.addEventListener('click', async () => {
    signin.disabled = true;
    tell('Opening Google sign-in…');
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (_) { signin.disabled = false; tell('Sign-in could not start. Check your connection and try again.'); }
  });
  signout.addEventListener('click', async () => {
    signout.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      show(null);
    } catch (_) { tell('Could not sign out. Please try again.'); }
    finally { signout.disabled = false; }
  });
})();
