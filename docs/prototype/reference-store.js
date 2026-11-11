'use strict';
// One opt-in library per browser origin. Transactions commit atomically.
const ReferenceStore = (() => {
  function transact(mode, action) {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Browser storage unavailable')); return; }
      let blocked = false;
      const opening = indexedDB.open('tripbox-style-library', 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore('library');
      opening.onerror = () => reject(opening.error);
      opening.onblocked = () => { blocked = true; reject(new Error('Storage is busy in another tab')); };
      opening.onsuccess = () => {
        const db = opening.result;
        if (blocked) { db.close(); return; }
        const tx = db.transaction('library', mode);
        const request = action(tx.objectStore('library'));
        tx.oncomplete = () => { const result = request.result; db.close(); resolve(result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Storage transaction failed')); };
      };
    });
  }
  return {
    load: () => transact('readonly', store => store.get('references')),
    save: records => transact('readwrite', store => store.put({ version: 1, records }, 'references')),
    clear: () => transact('readwrite', store => store.delete('references'))
  };
})();
