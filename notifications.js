/**
 * Notifications — simulated Telegram/Email notification system
 */
const Notifications = (() => {
  const CHANNELS = { telegram: '📨 Telegram', email: '✉️ Email' };

  function _pick() {
    return Math.random() > 0.5 ? 'telegram' : 'email';
  }

  function add(message, channel) {
    const ch = channel || _pick();
    const note = Store.save('notifications', {
      channel: ch,
      channelLabel: CHANNELS[ch],
      message,
      read: false,
    });
    EventBus.emit('notifications:new', note);
    _showToast(note);
    return note;
  }

  function markRead(id) {
    Store.update('notifications', id, { read: true });
    EventBus.emit('notifications:updated');
  }

  function markAllRead() {
    Store.getAll('notifications').forEach(n => {
      if (!n.read) Store.update('notifications', n.id, { read: true });
    });
    EventBus.emit('notifications:updated');
  }

  function getUnreadCount() {
    return Store.getAll('notifications').filter(n => !n.read).length;
  }

  function _showToast(note) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `
      toast-item flex items-start gap-3 p-4 rounded-xl shadow-lg
      bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
      text-sm text-gray-700 dark:text-gray-200 max-w-sm w-full
      animate-slide-in
    `;
    toast.innerHTML = `
      <span class="text-xl">${note.channelLabel}</span>
      <div class="flex-1">
        <p class="font-semibold text-xs text-indigo-500 uppercase mb-0.5">${note.channelLabel} · Симуляція</p>
        <p>${note.message}</p>
      </div>
      <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  return { add, markRead, markAllRead, getUnreadCount };
})();
