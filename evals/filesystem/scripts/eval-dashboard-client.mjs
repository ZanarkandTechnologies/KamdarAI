export const dashboardClientScript = String.raw`
const inspector = document.querySelector('.inspector');
const empty = document.querySelector('.empty');

function closeInspector() {
  document.body.classList.remove('inspector-open');
  inspector.classList.remove('open');
  inspector.classList.add('closed');
  empty.classList.add('visible');
}

function bindClose() {
  inspector.querySelector('.close')?.addEventListener('click', closeInspector);
}

function selectRow(id) {
  const template = document.getElementById('panel-' + id);
  if (!template) return;
  document.querySelectorAll('.case-row').forEach((row) => row.classList.toggle('selected', row.dataset.row === id));
  inspector.innerHTML = template.innerHTML;
  document.body.classList.add('inspector-open');
  inspector.classList.remove('closed');
  inspector.classList.add('open');
  empty.classList.remove('visible');
  inspector.scrollTop = 0;
  bindClose();
}

document.querySelectorAll('.case-row').forEach((row) => row.addEventListener('click', () => selectRow(row.dataset.row)));
document.querySelectorAll('.feature-toggle').forEach((toggle) => toggle.addEventListener('click', () => {
  const rows = toggle.nextElementSibling;
  const open = !rows.classList.contains('hidden');
  rows.classList.toggle('hidden', open);
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.querySelector('.toggle-glyph').textContent = open ? '▶' : '▼';
}));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeInspector();
});
bindClose();
`;
