// PHASE 26: Forge draft persistence in IndexedDB (supports Blobs; not localStorage).
const DB = 'tm_forge';
const STORE = 'drafts';
const KEY = 'current';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

/** Strip transient object URLs; keep Blobs. */
function serialize(doc) {
  return {
    ...doc,
    panels: doc.panels.map((p) => ({ ...p, src: p.blob ? '' : p.src })),
    base: doc.base ? { ...doc.base, url: doc.base.file ? '' : doc.base.url } : null,
    layers: doc.layers.map((l) => (l.blob ? { ...l, src: '' } : l))
  };
}

export function hydrate(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    panels: doc.panels.map((p) => (p.blob ? { ...p, src: URL.createObjectURL(p.blob) } : p)),
    base: doc.base?.file ? { ...doc.base, url: URL.createObjectURL(doc.base.file) } : doc.base,
    layers: doc.layers.map((l) => (l.blob ? { ...l, src: URL.createObjectURL(l.blob) } : l))
  };
}

export const saveDraft = (doc) =>
  tx('readwrite', (s) => s.put({ doc: serialize(doc), savedAt: Date.now() }, KEY)).catch(() => null);

export const loadDraft = () => tx('readonly', (s) => s.get(KEY)).catch(() => null);

export const clearDraft = () => tx('readwrite', (s) => s.delete(KEY)).catch(() => null);
