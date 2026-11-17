/**
 * Modal — reusable modal dialog component
 */
const Modal = (() => {
  let _modal = null;

  function open({ title, content, onConfirm, confirmText = 'Зберегти', cancelText = 'Скасувати', size = 'md', hideFooter = false }) {
    close();
    const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
    const sizeClass = sizes[size] || sizes.md;

    _modal = document.createElement('div');
    _modal.id = 'global-modal';
    _modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm';
    _modal.innerHTML = `
      <div class="modal-box bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${sizeClass} flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${title}</h2>
          <button id="modal-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none transition-colors">&times;</button>
        </div>
        <div class="modal-body flex-1 overflow-y-auto px-6 py-4">
          ${content}
        </div>
        ${hideFooter ? '' : `
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button id="modal-cancel" class="btn-secondary">${cancelText}</button>
          <button id="modal-confirm" class="btn-primary">${confirmText}</button>
        </div>`}
      </div>
    `;

    document.body.appendChild(_modal);

    _modal.querySelector('#modal-close').addEventListener('click', close);
    _modal.addEventListener('click', e => { if (e.target === _modal) close(); });

    if (!hideFooter) {
      _modal.querySelector('#modal-cancel').addEventListener('click', close);
      _modal.querySelector('#modal-confirm').addEventListener('click', () => {
        if (onConfirm) onConfirm();
      });
    }

    requestAnimationFrame(() => _modal?.classList.add('modal-visible'));
  }

  function close() {
    if (_modal) {
      _modal.remove();
      _modal = null;
    }
  }

  function getBody() {
    return _modal?.querySelector('.modal-body') || null;
  }

  return { open, close, getBody };
})();
