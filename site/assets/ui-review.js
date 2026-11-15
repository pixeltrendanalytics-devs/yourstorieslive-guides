(() => {
  const select = document.querySelector('#screen-select');
  const panels = [...document.querySelectorAll('[data-screen]')];
  const modes = [...document.querySelectorAll('[data-mode]')];
  let index = 0;
  let mode = 'pair';
  function render(scroll = false) {
    panels.forEach((panel, i) => { panel.hidden = i !== index; panel.dataset.mode = mode; });
    select.value = panels[index].dataset.screen;
    document.querySelector('#screen-position').textContent = `${index + 1} / ${panels.length}`;
    document.querySelector('#previous').disabled = index === 0;
    document.querySelector('#next').disabled = index === panels.length - 1;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    if (scroll) document.querySelector('#comparison').scrollIntoView({ block: 'start' });
  }
  select.addEventListener('change', () => { index = panels.findIndex(panel => panel.dataset.screen === select.value); render(true); });
  document.querySelector('#previous').addEventListener('click', () => { index = Math.max(0, index - 1); render(true); });
  document.querySelector('#next').addEventListener('click', () => { index = Math.min(panels.length - 1, index + 1); render(true); });
  modes.forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; render(); }));
  const dialog = document.querySelector('#image-dialog');
  let opener;
  document.querySelectorAll('.enlarge').forEach(button => button.addEventListener('click', () => {
    opener = button;
    const image = button.querySelector('img');
    const enlarged = dialog.querySelector('img');
    enlarged.src = image.src;
    enlarged.alt = image.alt;
    dialog.showModal();
  }));
  document.querySelector('#close-image').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  const key = 'ysl-ui-review-62a7e286-v1';
  const status = document.querySelector('#review-status');
  const note = document.querySelector('#review-note');
  const saved = document.querySelector('#save-status');
  try { const value = JSON.parse(localStorage.getItem(key) || '{}'); if ([...status.options].some(option => option.value === value.status)) status.value = value.status; note.value = value.note || ''; } catch { /* Browser storage can be disabled. */ }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ status: status.value, note: note.value })); saved.textContent = 'Saved in this browser'; }
    catch { saved.textContent = 'Browser storage unavailable; download notes to retain them.'; }
  }
  status.addEventListener('change', save);
  note.addEventListener('input', save);
  document.querySelector('#export-review').addEventListener('click', () => {
    const file = new Blob([JSON.stringify({ source: '62a7e286', reviewedAt: new Date().toISOString(), screen: select.value, status: status.value, note: note.value }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = 'ysl-ui-integration-review.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saved.textContent = 'Review notes downloaded';
  });
  render();
})();
