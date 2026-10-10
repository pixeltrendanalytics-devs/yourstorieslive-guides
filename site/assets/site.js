const search = document.querySelector('#guide-search');
const filters = [...document.querySelectorAll('[data-category-filter]')];
const cards = [...document.querySelectorAll('[data-guide]')];
let category = 'All';

function filterGuides() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of cards) {
    const matches = (category === 'All' || card.dataset.category === category)
      && card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visible++;
  }
  for (const section of document.querySelectorAll('[data-guide-section]')) {
    section.hidden = ![...section.querySelectorAll('[data-guide]')].some(card => !card.hidden);
  }
  document.querySelector('#results-count').textContent = `${visible} ${visible === 1 ? 'guide' : 'guides'}${query || category !== 'All' ? ' found' : ' in the library'}`;
  document.querySelector('#empty-state').hidden = visible !== 0;
}

if (search) {
  search.addEventListener('input', filterGuides);
  for (const button of filters) {
    button.addEventListener('click', () => {
      category = button.dataset.categoryFilter;
      for (const other of filters) other.setAttribute('aria-pressed', String(other === button));
      filterGuides();
    });
  }
}
