'use strict';
// Prepared account-library adapter. The application does not call it yet.
// The server must enforce owner-only RLS; the public client key is not a secret.
const AccountLibrary = (() => {
  const table = 'tripbox_style_libraries';
  const maxBytes = 8 * 1024 * 1024;
  function requireUser(session) {
    const id = session?.user?.id;
    if (typeof id !== 'string' || !id) throw new Error('Sign in to access your style library.');
    return id;
  }
  async function load(client, session) {
    const userId = requireUser(session);
    const { data, error } = await client.from(table).select('revision,payload').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? { revision: data.revision, payload: data.payload } : { revision: 0, payload: null };
  }
  async function save(client, session, revision, payload) {
    const userId = requireUser(session);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid library revision.');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid library.');
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > maxBytes - 1024) {
      throw new Error('Your style library is too large to sync. Download a backup before removing references.');
    }
    const next = revision + 1;
    const row = { user_id: userId, revision: next, payload, updated_at: new Date().toISOString() };
    const result = revision === 0
      ? await client.from(table).insert(row).select('revision').maybeSingle()
      : await client.from(table).update(row).eq('user_id', userId).eq('revision', revision).select('revision').maybeSingle();
    if (result.error) {
      if (result.error.code === '23505') throw new Error('This library changed elsewhere. Reload before saving.');
      throw result.error;
    }
    if (!result.data) throw new Error('This library changed elsewhere. Reload before saving.');
    return result.data.revision;
  }
  return { load, save };
})();
if (typeof module !== 'undefined') module.exports = AccountLibrary;
