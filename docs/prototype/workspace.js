'use strict';
// This navigation only reorganizes the existing controls; it does not reset project data.
(() => {
  const nav = document.querySelector('.app-nav');
  const dashboard = document.getElementById('dashboard');
  const setup = document.querySelector('.setup-layout');
  const photos = setup.querySelector('section');
  const style = document.getElementById('taste');
  const options = document.getElementById('project-options');
  const gallery = document.getElementById('gallery');
  const groups = document.getElementById('groups');
  const drafts = document.getElementById('drafts-section');
  const cards = document.getElementById('card-studio');
  const panels = [dashboard, setup, options, gallery, groups, drafts, cards];
  const routes = { home: 'home', start: 'photos', gallery: 'review', groups: 'review',
    'drafts-section': 'drafts', 'card-studio': 'cards', taste: 'style' };
  function show() {
    const view = routes[location.hash.slice(1)] || 'home';
    for (const panel of panels) panel.hidden = true;
    photos.hidden = true;
    style.hidden = true;
    if (view === 'home') dashboard.hidden = false;
    if (view === 'photos') { setup.hidden = false; photos.hidden = false; options.hidden = false; }
    if (view === 'style') { setup.hidden = false; style.hidden = false; }
    if (view === 'review') { gallery.hidden = false; groups.hidden = false; }
    if (view === 'drafts') drafts.hidden = false;
    if (view === 'cards') cards.hidden = false;
    for (const link of nav.querySelectorAll('a')) {
      if (routes[link.hash.slice(1)] === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.documentElement.classList.add('workspace-ready');
  }
  window.addEventListener('hashchange', show);
  show();
})();

