'use strict';
const assert = require('node:assert/strict');
const Library = require('../docs/prototype/account-library.js');

function fakeClient() {
  let row = null;
  return {
    from(name) {
      assert.equal(name, 'tripbox_style_libraries');
      let user, revision, operation, next;
      const query = {
        select() { return query; },
        eq(key, value) { if (key === 'user_id') user = value; if (key === 'revision') revision = value; return query; },
        insert(value) { operation = 'insert'; next = value; return query; },
        update(value) { operation = 'update'; next = value; return query; },
        async maybeSingle() {
          if (operation === 'insert') {
            if (row) return { data: null, error: { code: '23505' } };
            row = next; return { data: { revision: row.revision }, error: null };
          }
          if (operation === 'update') {
            if (!row || row.user_id !== user || row.revision !== revision) return { data: null, error: null };
            row = next; return { data: { revision: row.revision }, error: null };
          }
          return { data: row && row.user_id === user ? row : null, error: null };
        }
      };
      return query;
    }
  };
}
(async () => {
  const db = fakeClient(), session = { user: { id: 'user-a' } };
  await assert.rejects(() => Library.load(db, null), /Sign in/);
  assert.deepEqual(await Library.load(db, session), { revision: 0, payload: null });
  assert.equal(await Library.save(db, session, 0, { photos: ['preview'] }), 1);
  assert.deepEqual(await Library.load(db, session), { revision: 1, payload: { photos: ['preview'] } });
  assert.equal(await Library.save(db, session, 1, { photos: [] }), 2);
  await assert.rejects(() => Library.save(db, session, 1, { photos: [] }), /changed elsewhere/);
  await assert.rejects(() => Library.save(db, session, 0, { photos: [] }), /changed elsewhere/);
  assert.equal((await Library.load(db, { user: { id: 'user-b' } })).payload, null);
  await assert.rejects(() => Library.save(db, session, 2, { huge: 'x'.repeat(8 * 1024 * 1024) }), /too large/);
  console.log('Account library adapter checks passed (mocked database).');
})().catch(error => { console.error(error); process.exitCode = 1; });
