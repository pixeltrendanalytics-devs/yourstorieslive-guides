const apiBrowser = document.querySelector('[data-api-browser]');
if (apiBrowser) {
  const search = document.querySelector('#api-search');
  const area = document.querySelector('#api-area');
  const method = document.querySelector('#api-method');
  const groups = [...apiBrowser.querySelectorAll('[data-api-group]')];
  const entries = [...apiBrowser.querySelectorAll('.api-endpoint')];
  const searchable = new Map(entries.map(entry => [entry, entry.textContent.toLocaleLowerCase()]));
  function filter() {
    const term = search.value.trim().toLocaleLowerCase();
    let shown = 0;
    for (const group of groups) {
      let inGroup = 0;
      for (const entry of group.querySelectorAll('.api-endpoint')) {
        const matches = (area.value === 'all' || group.dataset.apiGroup === area.value)
          && (method.value === 'all' || entry.dataset.apiMethod === method.value)
          && searchable.get(entry).includes(term);
        entry.hidden = !matches;
        if (matches) { shown++; inGroup++; }
      }
      group.hidden = inGroup === 0;
      const jump = apiBrowser.querySelector(`.api-jump-links a[href="#${group.id}"]`);
      if (jump) jump.hidden = inGroup === 0;
    }
    document.querySelector('#api-result-count').textContent = `${shown} ${shown === 1 ? 'endpoint' : 'endpoints'} shown`;
    document.querySelector('#api-empty').hidden = shown !== 0;
  }
  search.addEventListener('input', filter);
  area.addEventListener('change', filter);
  method.addEventListener('change', filter);
  document.querySelector('#api-clear').addEventListener('click', () => {
    search.value = '';
    area.value = 'all';
    method.value = 'all';
    filter();
    search.focus();
  });
  const anchor = decodeURIComponent(location.hash.slice(1));
  const linked = entries.find(entry => entry.id === anchor);
  if (linked) { linked.open = true; linked.scrollIntoView(); }
}
