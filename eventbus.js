/**
 * EventBus — minimal pub/sub
 */
const EventBus = (() => {
  const listeners = {};

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return () => off(event, cb);
  }

  function off(event, cb) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(l => l !== cb);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`EventBus error on "${event}":`, e); }
    });
  }

  return { on, off, emit };
})();
