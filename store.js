/**
 * Store — localStorage abstraction with full CRUD
 */
const Store = (() => {
  const PREFIX = 'saas_';

  function _key(collection) {
    return PREFIX + collection;
  }

  function getAll(collection) {
    try {
      return JSON.parse(localStorage.getItem(_key(collection)) || '[]');
    } catch {
      return [];
    }
  }

  function getById(collection, id) {
    return getAll(collection).find(item => item.id === id) || null;
  }

  function save(collection, item) {
    const all = getAll(collection);
    const newItem = {
      ...item,
      id: item.id || `${collection}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(newItem);
    _persist(collection, all);
    return newItem;
  }

  function update(collection, id, patch) {
    const all = getAll(collection).map(item =>
      item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
    );
    _persist(collection, all);
    return all.find(i => i.id === id) || null;
  }

  function remove(collection, id) {
    const all = getAll(collection).filter(item => item.id !== id);
    _persist(collection, all);
  }

  function _persist(collection, data) {
    try {
      localStorage.setItem(_key(collection), JSON.stringify(data));
    } catch (e) {
      console.error('Store persist error:', e);
    }
  }

  function clear(collection) {
    localStorage.removeItem(_key(collection));
  }

  return { getAll, getById, save, update, remove, clear };
})();
