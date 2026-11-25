'use strict';
const photos = [];
const purposes = ['Post', 'Story', 'Photo Book', 'Frame'];
let view = 'all';
let nextId = 0;
let visibleLimit = 40;
let importing = false;
let examplesBusy = false;
const styleExamples = [];
const referenceLibrary = [];
let referenceLimit = 24;
let removedReferences = [];
let libraryQueue = Promise.resolve();
let libraryReady = false;
let librarySession = null;
let libraryRevision = 0;
let libraryGeneration = 0;
let librarySyncFailed = false;
let reviewIds = [];
let reviewIndex = 0;
const choiceHistory = [];
let draftPlan = null;
const settings = () => {
  const read = (id, min, max) => Math.min(max, Math.max(min, Math.floor(Number($(id).value) || 0)));
  const size = $('frame-size').value.split(',').map(Number);
  if ($('frame-orientation').value === 'landscape') size.reverse();
  return { posts: read('post-count', 0, 20), perPost: read('post-size', 1, 20), stories: read('story-count', 0, 200), pages: read('book-pages', 0, 200), perPage: read('page-size', 1, 6), frames: read('frame-count', 0, 50), frameWidth: size[0], frameHeight: size[1], mat: $('frame-mat').value, colors: $('colors').value, people: $('people-priority').value };
};
const postLimit = () => settings().posts * settings().perPost;
const $ = id => document.getElementById(id);
const favorites = () => photos.filter(photo => photo.selected);
const say = text => { $('message').textContent = text; };
function render() {
  const selected = favorites();
  $('count').textContent = `${selected.length} keepers · ${photos.length} photos · ${selected.filter(p => p.labels.has('Post')).length} / ${postLimit()} Post picks`;
  $('all').setAttribute('aria-pressed', String(view === 'all'));
  $('shortlist').setAttribute('aria-pressed', String(view === 'shortlist'));
  $('analyze').disabled = !photos.length || importing || examplesBusy;
  $('start-review').disabled = !photos.length || importing;
  $('undo-choice').disabled = !choiceHistory.length;
  for (const id of ['unreviewed', 'skipped']) $(id).setAttribute('aria-pressed', String(view === id));
  $('duplicates').disabled = !photos.length || importing;
  $('new-project').disabled = importing || examplesBusy;
  $('confirm-new-project').disabled = importing || examplesBusy;
  $('build-drafts').disabled = !photos.length || importing || examplesBusy;
  $('review-next-step').hidden = !photos.length;
  $('review-summary').textContent = selected.length
    ? `${selected.length} ${selected.length === 1 ? 'keeper' : 'keepers'} in this trip.`
    : 'Keep and label photos to add them to your drafts.';
  const duplicateGroups = view === 'duplicates' ? Curation.groups(photos).filter(g => g.length > 1) : [];
  const duplicateIds = new Set(duplicateGroups.flat().map(p => p.id));
  const visible = visiblePhotos(duplicateIds);
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = !photos.length ? 'Add trip photos to start reviewing your picks.' : 'No photos in this view. Try All photos or a different subject filter.';
  $('more').hidden = visible.length <= visibleLimit;
  $('grid').replaceChildren();
  for (const photo of visible.slice(0, visibleLimit)) {
    const card = document.createElement('article');
    card.className = `card${photo.selected ? ' selected' : ''}`;
    const img = document.createElement('img');
    img.src = photo.url; img.alt = photo.name; img.loading = 'lazy';
    const name = document.createElement('p'); name.className = 'filename'; name.textContent = photo.name;
    const button = document.createElement('button');
    button.textContent = photo.manualKeep ? 'Kept by you' : photo.selected ? 'Keep this pick' : 'Keep';
    button.setAttribute('aria-label', `${button.textContent}: ${photo.name}`);
    button.setAttribute('aria-pressed', String(Boolean(photo.manualKeep)));
    button.dataset.reviewAction = 'keep';
    button.addEventListener('click', () => {
      changeCardChoice(button, () => applyChoice(photo, photo.manualKeep ? 'reset' : 'keep'));
    });
    card.dataset.photo = photo.id;
    const open = document.createElement('button'); open.className = 'photo-open';
    open.setAttribute('aria-label', `Review ${photo.name}`); open.append(img);
    open.addEventListener('click', () => openReview(photo.id));
    card.append(open, name, button);
    const skip = textElement('button', photo.excluded ? 'Skipped · Undo' : 'Skip');
    skip.className = 'skip-button'; skip.setAttribute('aria-pressed', String(Boolean(photo.excluded)));
    skip.dataset.reviewAction = 'skip';
    skip.addEventListener('click', () => {
      changeCardChoice(skip, () => applyChoice(photo, photo.excluded ? 'reset' : 'skip'));
    });
    card.append(skip);
    const state = textElement('p', photo.excluded ? 'Skipped' : photo.manualKeep ? 'Your keeper' : photo.selected ? 'Suggested · review me' : 'Not reviewed');
    state.className = 'photo-state'; card.append(state);
    const subjectLabel = textElement('label', 'In this photo');
    const subject = document.createElement('select');
    subject.setAttribute('aria-label', `Who is in ${photo.name}?`);
    for (const [value, title] of [['unknown','Not tagged'],['me','Me'],['people','Other people'],['scenery','Scenery']]) {
      const option = textElement('option', title); option.value = value; subject.append(option);
    }
    subject.value = photo.subject || 'unknown';
    subject.addEventListener('change', () => { photo.subject = subject.value; invalidateDrafts(); say('Subject saved for this project. Regenerate picks to use it.'); });
    subjectLabel.append(subject); card.append(subjectLabel);
    const original = document.createElement('a'); original.textContent = 'View original ↗';
    original.href = photo.originalUrl; original.target = '_blank'; original.rel = 'noopener'; original.className = 'original-link';
    card.append(original, originalDownload(photo, 'Download original'));
    if (photo.reason) { const reason = document.createElement('p'); reason.className = 'reason'; reason.textContent = photo.reason; card.append(reason); }
    if (view === 'duplicates') {
      const group = duplicateGroups.find(g => g.includes(photo));
      const tag = document.createElement('p'); tag.className = 'reason';
      tag.textContent = `Similar-shot group ${group[0].id + 1} · ${group.length} photos. Review originals before choosing.`; card.append(tag);
      const only = textElement('button', 'Keep only this take');
      only.dataset.reviewAction = 'keep-only';
      only.addEventListener('click', () => {
        changeCardChoice(only, () => {
          rememberChoices(photos.filter(p => p === photo || Curation.similar(p, photo)));
          photos.forEach(p => { if (p !== photo && Curation.similar(p, photo)) setChoice(p, 'skip'); });
          setChoice(photo, 'keep');
          invalidateDrafts();
          render();
          say('Kept this take and skipped its similar shots. Undo restores the whole choice.');
        });
      });
      card.append(only);
    }
    if (photo.selected) {
      const fieldset = document.createElement('fieldset'); fieldset.className = 'labels';
      const legend = document.createElement('legend'); legend.textContent = 'Use this favorite for'; fieldset.append(legend);
      for (const purpose of purposes) {
        const label = document.createElement('label'); const check = document.createElement('input');
        check.type = 'checkbox'; check.checked = photo.labels.has(purpose);
        check.addEventListener('change', () => {
          if (purpose === 'Post' && check.checked && favorites().filter(p => p.labels.has('Post')).length >= postLimit()) {
            check.checked = false; say('Your Post plan is full. Uncheck a Post label or increase the number of posts/photos per post.'); return;
          }
          check.checked ? photo.labels.add(purpose) : photo.labels.delete(purpose);
          (photo.manualLabels ||= new Set());
          check.checked ? photo.manualLabels.add(purpose) : photo.manualLabels.delete(purpose);
          if (photo.autoLabels) photo.autoLabels.delete(purpose);
          invalidateDrafts();
          $('count').textContent = `${favorites().length} keepers · ${photos.length} photos · ${favorites().filter(p => p.labels.has('Post')).length} / ${postLimit()} Post picks`;
          renderAlbums();
        });
        label.append(check, document.createTextNode(purpose)); fieldset.append(label);
      }
      card.append(fieldset);
    }
    $('grid').append(card);
  }
  renderAlbums();
}
function renderAlbums() {
  $('albums').replaceChildren();
  for (const purpose of purposes) {
    const group = favorites().filter(photo => photo.labels.has(purpose));
    const album = document.createElement('div'); album.className = 'album';
    const heading = document.createElement('h3'); heading.textContent = `${purpose} · ${group.length}${purpose === 'Post' ? ` / ${postLimit()} planned slots` : ''}`; album.append(heading);
    if (!group.length) { const p = document.createElement('p'); p.textContent = `No ${purpose} photos yet. Label a favorite above to add it here.`; album.append(p); }
    const row = document.createElement('div'); row.className = 'album-photos';
    for (const photo of group.slice(0, 20)) {
      const figure = document.createElement('figure'); const img = document.createElement('img');
      img.src = photo.url; img.alt = photo.name; img.loading = 'lazy';
      const caption = document.createElement('figcaption'); caption.textContent = photo.name;
      figure.append(img, caption); row.append(figure);
    }
    album.append(row);
    if (group.length > 20) { const note = document.createElement('p'); note.textContent = `Showing the first 20 of ${group.length} memories. All are kept; use The keepers to review and change every photo.`; album.append(note); }
    $('albums').append(album);
  }
}
// Decode one image at a time and retain only a small preview, not 200 full-size decodes.
async function makePreview(file) {
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => { img.src = ''; reject(new Error('Image timed out')); }, 20000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('Unsupported image')); };
      img.src = source;
    });
    const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const analysis = document.createElement('canvas'); analysis.width = 36; analysis.height = 32;
    const aCtx = analysis.getContext('2d'); aCtx.drawImage(image, 0, 0, 36, 32);
    const features = Curation.measure(aCtx.getImageData(0, 0, 36, 32).data, 36, 32);
    const width = image.naturalWidth, height = image.naturalHeight;
    const digest = globalThis.crypto?.subtle ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('') : null;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error('Preview failed');
    return { url: URL.createObjectURL(blob), blob, features, width, height, digest };
  } finally { URL.revokeObjectURL(source); }
}
$('files').addEventListener('change', async event => {
  if (importing) return;
  const files = [...event.target.files];
  if (!files.length) return;
  invalidateDrafts();
  importing = true; event.target.disabled = true; render();
  $('progress').hidden = false; $('progress').max = files.length; $('progress').value = 0;
  let added = 0, rejected = 0;
  try {
    for (const [index, file] of files.entries()) {
      $('import-status').textContent = `Unpacking memories… ${index + 1} of ${files.length}`;
      if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(file.name)) { rejected++; }
      else {
        try {
          const preview = await makePreview(file);
          photos.push({ id: nextId++, name: file.name, ...preview, file, originalUrl: URL.createObjectURL(file), selected: false, labels: new Set() }); added++;
        } catch { rejected++; }
      }
      $('progress').value = index + 1;
      if ((index + 1) % 10 === 0) { render(); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
    $('import-status').textContent = `Welcome to the pile: ${added} photo${added === 1 ? '' : 's'}.${rejected ? ` Couldn’t open ${rejected} file(s). Try converting HEIC or unsupported images to JPG; damaged files may also fail.` : ''}`;
  } finally {
    importing = false; event.target.disabled = false; event.target.value = '';
    $('progress').hidden = true;
    const groups = Curation.groups(photos).filter(g => g.length > 1);
    $('duplicate-status').textContent = `${groups.length} possible duplicate groups · ${groups.reduce((n, g) => n + g.length, 0)} photos. Review rather than delete.`;
    render();
  }
});
$('name').addEventListener('input', event => { invalidateDrafts(); $('collection-name').textContent = event.target.value.trim() || 'My memory pile'; });
$('all').addEventListener('click', () => { view = 'all'; visibleLimit = 40; render(); });
$('shortlist').addEventListener('click', () => { view = 'shortlist'; visibleLimit = 40; render(); });
$('more').addEventListener('click', () => { visibleLimit += 40; render(); });
function accountStatus() {
  $('account-status').textContent = $('account').value === 'Personal'
    ? 'Personal account: supply examples yourself. Instagram’s API does not offer a personal-account connection here. Tripbox cannot read a profile from a username.'
    : 'Creator / Business: an authorized Meta app connection is possible in principle, but is not configured in this local prototype. Supply examples here for now. No password or token is requested.';
}
$('account').addEventListener('change', accountStatus);
accountStatus();
// Instagram exports hold relative media URIs, not embedded image bytes.
const instagramReferences = new Set();
const instagramFiles = new Map();
const importedInstagramPaths = new Set();
const isJson = file => /\.json$/i.test(file.name);
const isExampleImage = path => /\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(path);
function mediaPath(value) {
  if (typeof value !== 'string') return null;
  let path;
  try { path = decodeURIComponent(value).replace(/\\/g, '/').replace(/^\.\//, ''); } catch { return null; }
  if (/^(?:[a-z]+:|\/)/i.test(path) || path.split('/').includes('..')) return null;
  // Strip the enclosing export directory, retaining Instagram's media path.
  const index = path.indexOf('media/');
  return index < 0 ? path : path.slice(index);
}
function instagramUris(data) {
  const result = new Set();
  const pending = [data];
  while (pending.length) {
    const item = pending.pop();
    if (!item || typeof item !== 'object') continue;
    if (typeof item.uri === 'string') {
      const path = mediaPath(item.uri);
      if (path && /\.(jpe?g|png|webp|heic|heif|gif|avif|mp4|mov|m4v)$/i.test(path)) result.add(path);
    }
    for (const value of Object.values(item)) if (value && typeof value === 'object') pending.push(value);
  }
  return [...result];
}
$('example-source').addEventListener('change', () => {
  const useExport = $('example-source').value === 'export';
  $('photo-examples').hidden = useExport;
  $('instagram-export').hidden = !useExport;
});
async function importExamples(event, fromFolder = false) {
  if (examplesBusy || !libraryReady) return;
  const files = [...event.target.files];
  if (!files.length) return;
  examplesBusy = true; render();
  const controls = ['examples', 'instagram-json', 'instagram-folder'];
  controls.forEach(id => { $(id).disabled = true; });
  let rejected = 0, badJson = 0, unrecognized = 0;
  try {
    $('example-status').textContent = 'Reading your examples locally…';
    for (const file of files) {
      if (fromFolder) {
        const path = mediaPath(file.webkitRelativePath || file.name);
        if (path && isExampleImage(path)) instagramFiles.set(path, file);
      }
      if (isJson(file)) {
        try {
          if (file.size > 100 * 1024 * 1024) throw new Error('JSON too large');
          const data = JSON.parse(await file.text());
          if (data.type === 'tripbox-style-library' && data.version === 1 && Array.isArray(data.photos)) {
            for (const item of data.photos) {
              if (typeof item.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(item.data)) { rejected++; continue; }
              const response = await fetch(item.data);
              const blob = await response.blob();
              await addReference(new File([blob], String(item.name || 'Reference photo'), { type: blob.type }), undefined, item.id);
            }
            continue;
          }
          const refs = instagramUris(data);
          if (!refs.length) unrecognized++;
          refs.forEach(path => instagramReferences.add(path));
        } catch { badJson++; }
      } else if (!fromFolder) {
        if (!file.type.startsWith('image/') && !isExampleImage(file.name)) { rejected++; continue; }
        try { await addReference(file); }
        catch { rejected++; }
      }
    }
    let missing = 0;
    for (const path of instagramReferences) {
      if (!isExampleImage(path) || importedInstagramPaths.has(path)) continue;
      const file = instagramFiles.get(path);
      if (!file) { missing++; continue; }
      $('example-status').textContent = `Matching your Instagram photos… ${styleExamples.length} examples ready.`;
      try {
        await addReference(file, path);
        importedInstagramPaths.add(path);
      } catch { rejected++; }
    }
    const videos = [...instagramReferences].filter(path => !isExampleImage(path)).length;
    const notes = [`${styleExamples.length} photo examples ready for local color and saturation matching.`];
    if (missing) notes.push(`${missing} referenced photos still needed. Choose the unzipped folder containing those photos.`);
    if (fromFolder && !instagramReferences.size) notes.push('Choose an unzipped Instagram export containing photos and their Posts, Stories, or Reels JSON. You can also choose the media JSON separately.');
    if (badJson) notes.push(`${badJson} JSON files could not be read. Use valid Instagram JSON files no larger than 100 MB each.`);
    if (unrecognized && !fromFolder) notes.push(`${unrecognized} JSON files contained no supported media references. Look for the media JSON files, not account settings or a Tripbox draft plan.`);
    if (videos) notes.push(`${videos} video references skipped: still photos only; reel video content is not analyzed.`);
    if (rejected) notes.push(`${rejected} files could not be opened; try JPG or PNG.`);
    renderReferences();
    await persistIfEnabled();
    notes.push(librarySession ? 'No Instagram account was accessed. Style previews are saved to your account when syncing succeeds.' : 'No Instagram account was accessed. References stay in this tab.');
    $('example-status').textContent = notes.join(' ');
  } finally {
    examplesBusy = false; renderReferences(); controls.forEach(id => { $(id).disabled = false; });
    event.target.value = ''; render();
  }
}
$('examples').addEventListener('change', event => importExamples(event));
$('instagram-json').addEventListener('change', event => importExamples(event));
$('instagram-folder').addEventListener('change', event => importExamples(event, true));
$('duplicates').addEventListener('click', () => { view = 'duplicates'; visibleLimit = 40; render(); $('gallery').scrollIntoView({ behavior: 'smooth' }); });
$('analyze').addEventListener('click', () => {
  const config = settings();
  const needs = { Post: config.posts * config.perPost, Story: config.stories, 'Photo Book': config.pages * config.perPage, Frame: config.frames };
  invalidateDrafts();
  // Automatic labels are replaced; explicit user labels and keeps remain.
  photos.forEach(photo => {
    for (const label of photo.autoLabels || []) if (!photo.manualLabels?.has(label)) photo.labels.delete(label);
    photo.autoLabels = new Set();
    photo.selected = !photo.excluded && (photo.manualKeep || photo.labels.size > 0);
    photo.reason = '';
  });
  const report = [];
  for (const purpose of purposes) {
    const existing = favorites().filter(p => p.labels.has(purpose));
    const candidates = photos.filter(p => !existing.some(q => p === q || Curation.similar(p, q)));
    const picks = Curation.choose(candidates, purpose, Math.max(0, needs[purpose] - existing.length), styleExamples, config);
    let added = 0;
    for (const photo of picks) {
      if (photo.labels.has(purpose) && photo.selected) continue;
      if (existing.length + added >= needs[purpose]) break;
      if (favorites().some(p => p.labels.has(purpose) && Curation.similar(p, photo))) continue;
      photo.selected = true; photo.labels.add(purpose); photo.autoLabels.add(purpose); added++;
      photo.reason = `Suggested for ${purpose}: ${purpose === 'Post' && photo.subject === 'me' && config.people !== 'balanced' ? 'you tagged yourself in this photo; ' : purpose === 'Post' && photo.subject === 'people' && config.people !== 'balanced' ? 'you tagged other people; ' : ''}${photo.manualKeep ? 'your explicit keep; ' : ''}local color, detail, and variety. Similar shots filtered. Review before using.`;
    }
    const total = favorites().filter(p => p.labels.has(purpose)).length;
    report.push(`${purpose}: ${total} / ${needs[purpose]} requested${total < needs[purpose] ? ' (fewer distinct eligible shots)' : total > needs[purpose] ? ' (manual labels exceed request)' : ''}`);
  }
  const summary = `Picks refreshed. ${report.join(' · ')}. Your explicit keeps were preserved. Tag photos as Me or Other people to guide Instagram picks. Similarity is approximate.`;
  $('analysis-status').textContent = summary;
  view = 'shortlist'; visibleLimit = 40; render(); say(summary); location.hash = '#gallery';
});
function textElement(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
function originalDownload(photo, label) {
  const link = textElement('a', label);
  link.href = photo.originalUrl;
  link.download = photo.name;
  link.className = 'original-link';
  link.setAttribute('aria-label', `${label}: ${photo.name}`);
  return link;
}
function buildPlan() {
  if (importing || examplesBusy) { $('draft-status').textContent = 'Wait for the import to finish before creating drafts.'; return; }
  const config = settings();
  let omitted = 0;
  const album = purpose => {
    const source = favorites().filter(p => p.labels.has(purpose) && !p.excluded);
    const distinct = Curation.unique(source.slice().sort((a, b) => Number(Boolean(b.manualKeep)) - Number(Boolean(a.manualKeep)) || Curation.score(b, purpose, styleExamples, config) - Curation.score(a, purpose, styleExamples, config)));
    omitted += source.length - distinct.length;
    return distinct.map(p => p.id);
  };
  const albums = Object.fromEntries(purposes.map(p => [p, album(p)]));
  const post = albums.Post, book = albums['Photo Book'];
  draftPlan = { name: $('name').value.trim() || 'My memory pile', settings: config, sections: [] };
  const add = (type, title, ids) => draftPlan.sections.push({ type, title, ids });
  for (let i = 0; i < config.posts; i++) add('Post', `Post ${i + 1}`, post.slice(i * config.perPost, (i + 1) * config.perPost));
  add('Story', 'Story sequence', albums.Story.slice(0, config.stories));
  for (let i = 0; i < config.pages; i++) add('Photo Book', `Page ${i + 1}`, book.slice(i * config.perPage, (i + 1) * config.perPage));
  albums.Frame.slice(0, config.frames).forEach((id, i) => add('Frame', `Frame ${i + 1} · ${config.frameWidth} × ${config.frameHeight} in`, [id]));
  const slots = { Post: config.posts * config.perPost, Story: config.stories, 'Photo Book': config.pages * config.perPage, Frame: config.frames };
  const extras = purposes.map(purpose => `${purpose}: ${Math.max(0, albums[purpose].length - slots[purpose])}`).join(' · ');
  $('draft-status').textContent = `Drafts created. ${omitted} similar photos left out across the drafts, including the whole book. Empty slots need more distinct picks. Labels outside requested quantities are kept but not placed: ${extras}. Rebuild after changing labels or settings.`;
  renderDrafts();
}
function renderDrafts() {
  $('drafts').replaceChildren();
  if (!draftPlan) return;
  for (const section of draftPlan.sections) {
    const block = document.createElement('details'); block.open = draftPlan.sections.length <= 10;
    const count = section.ids.length;
    block.append(textElement('summary', `${section.title} · ${count} ${count === 1 ? 'photo' : 'photos'}`));
    if (!section.ids.length) block.append(textElement('p', 'An empty little spot. Add labels in your collection, then rebuild your drafts.'));
    const row = document.createElement('div'); row.className = 'draft-row';
    section.ids.forEach((id, index) => {
      const photo = photos.find(p => p.id === id); const card = document.createElement('figure');
      const img = document.createElement('img'); img.src = photo.url; img.alt = photo.name; img.loading = 'lazy';
      if (section.type === 'Frame') {
        img.style.aspectRatio = `${draftPlan.settings.frameWidth} / ${draftPlan.settings.frameHeight}`;
        img.style.background = { white: '#fff', cream: '#fff3da', black: '#222' }[draftPlan.settings.mat];
        img.className = 'frame-preview';
      }
      card.append(img, textElement('figcaption', `${index + 1}. ${photo.name}`));
      if (section.type === 'Post' || section.type === 'Story') {
        card.append(originalDownload(photo, 'Download photo'));
      }
      if (section.type === 'Frame') {
        const ppi = Math.min(photo.width / draftPlan.settings.frameWidth, photo.height / draftPlan.settings.frameHeight);
        card.append(textElement('p', `${photo.width} × ${photo.height} original pixels · about ${Math.round(ppi)} pixels/inch at this size. ${ppi < 200 ? 'May look soft; inspect the original.' : 'Pixel count only; focus and print quality still need review.'} Full image fits with margins; no crop.`));
      }
      for (const delta of [-1, 1]) {
        const button = textElement('button', delta < 0 ? '← Earlier' : 'Later →');
        button.disabled = index + delta < 0 || index + delta >= section.ids.length;
        button.dataset.move = `${section.type}-${section.title}-${id}-${delta}`;
        button.addEventListener('click', () => {
          [section.ids[index], section.ids[index + delta]] = [section.ids[index + delta], section.ids[index]]; renderDrafts();
          const buttons = $('drafts').querySelectorAll('button');
          const replacement = [...buttons].find(item => item.dataset.move === button.dataset.move);
          (replacement && !replacement.disabled ? replacement : [...buttons].find(item => item.dataset.move?.startsWith(`${section.type}-${section.title}-${id}-`) && !item.disabled))?.focus();
        });
        card.append(button);
      }
      row.append(card);
    });
    block.append(row); $('drafts').append(block);
  }
}
$('build-drafts').addEventListener('click', buildPlan);
$('export-plan').addEventListener('click', () => {
  if (!draftPlan) { $('draft-status').textContent = 'Create your drafts first, then save the plan.'; return; }
  const plan = { name: draftPlan.name, settings: draftPlan.settings, note: 'Planning file only. No photos, account access, or automatic publishing. Keep original files separately.', sections: draftPlan.sections.map(section => ({ type: section.type, title: section.title, photos: section.ids.map(id => { const p = photos.find(photo => photo.id === id); return { id: p.id, filename: p.name, width: p.width, height: p.height, sha256: p.digest }; }) })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'tripbox-draft-plan.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
for (const id of ['post-count', 'post-size', 'story-count', 'book-pages', 'page-size', 'frame-count', 'frame-size', 'frame-orientation', 'frame-mat', 'colors', 'people-priority']) {
  $(id).addEventListener('change', () => { invalidateDrafts(); render(); $('draft-status').textContent = 'Options changed. Rebuild drafts to apply them. Existing labels are preserved.'; });
}
function invalidateDrafts() {
  if (!draftPlan) return;
  draftPlan = null; $('drafts').replaceChildren();
  $('draft-status').textContent = 'Your picks changed. Rebuild drafts to use the latest choices.';
}
function visiblePhotos(duplicateIds) {
  let result = view === 'all' ? photos : view === 'duplicates' ? photos.filter(p => duplicateIds ? duplicateIds.has(p.id) : photos.some(q => q !== p && Curation.similar(p, q))) : view === 'unreviewed' ? photos.filter(p => !p.reviewed) : view === 'skipped' ? photos.filter(p => p.excluded) : favorites();
  const filter = $('subject-filter').value || 'all';
  if (filter !== 'all') result = result.filter(p => (p.subject || 'unknown') === filter);
  return result;
}
function rememberChoices(items) {
  choiceHistory.push(items.map(p => ({ id: p.id, selected: p.selected, manualKeep: p.manualKeep, excluded: p.excluded, reviewed: p.reviewed, reason: p.reason, labels: [...p.labels], autoLabels: [...(p.autoLabels || [])], manualLabels: [...(p.manualLabels || [])] })));
  if (choiceHistory.length > 100) choiceHistory.shift();
}
function setChoice(photo, choice) {
  photo.reviewed = choice !== 'reset'; photo.manualKeep = choice === 'keep';
  photo.excluded = choice === 'skip'; photo.selected = choice === 'keep';
  if (choice !== 'keep') { photo.labels.clear(); photo.autoLabels = new Set(); photo.manualLabels = new Set(); photo.reason = ''; }
}
function applyChoice(photo, choice) {
  rememberChoices([photo]); setChoice(photo, choice); invalidateDrafts(); render();
  say(`${choice === 'keep' ? 'Kept' : choice === 'skip' ? 'Skipped' : 'Reset'} ${photo.name}. Undo is available.`);
}
function undoChoice() {
  const previous = choiceHistory.pop();
  if (!previous) return;
  previous.forEach(snapshot => {
    const photo = photos.find(p => p.id === snapshot.id);
    if (photo) Object.assign(photo, snapshot, { labels: new Set(snapshot.labels), autoLabels: new Set(snapshot.autoLabels), manualLabels: new Set(snapshot.manualLabels) });
  });
  invalidateDrafts(); render(); say('Last choice undone.');
  if ($('review-dialog').open) {
    const index = reviewIds.indexOf(previous[0].id); if (index >= 0) reviewIndex = index;
    renderReview();
  }
}
function changeCardChoice(button, change) {
  const grid = $('grid');
  const previous = button.closest('[data-photo]');
  const index = [...grid.children].indexOf(previous);
  const top = window.scrollY;
  const left = window.scrollX;
  change();

  // A reset or skip can remove this card from the current filter.
  const card = grid.querySelector(`[data-photo="${previous.dataset.photo}"]`)
    || grid.children[Math.min(index, grid.children.length - 1)];
  const control = card?.querySelector(`[data-review-action="${button.dataset.reviewAction}"]`);
  (control || $('all')).focus({ preventScroll: true });
  window.scrollTo({ top, left, behavior: 'instant' });
}
function openReview(id) {
  reviewIds = visiblePhotos().map(p => p.id);
  if (!reviewIds.length) { say('No photos in this view to review.'); return; }
  reviewIndex = Math.max(0, reviewIds.indexOf(id)); renderReview(); $('review-dialog').showModal();
}
function renderReview() {
  const photo = photos.find(p => p.id === reviewIds[reviewIndex]);
  if (!photo) return;
  $('review-image').src = photo.url; $('review-image').alt = photo.name;
  $('review-title').textContent = photo.name;
  $('review-position').textContent = `${reviewIndex + 1} of ${reviewIds.length}`;
  $('review-state').textContent = photo.excluded ? 'Skipped' : photo.manualKeep ? 'Kept by you' : photo.selected ? 'Suggested pick · your choice' : 'Ready to review';
  $('review-prev').disabled = reviewIndex === 0;
  $('review-next').disabled = reviewIndex === reviewIds.length - 1;
  $('review-undo').disabled = !choiceHistory.length;
  ['me','people','scenery','unknown'].forEach(subject => $('tag-' + subject).setAttribute('aria-pressed', String((photo.subject || 'unknown') === subject)));
}
function moveReview(delta) { reviewIndex = Math.max(0, Math.min(reviewIds.length - 1, reviewIndex + delta)); renderReview(); }
function chooseInReview(choice) {
  const photo = photos.find(p => p.id === reviewIds[reviewIndex]);
  if (!photo) return;
  applyChoice(photo, choice);
  if (reviewIndex < reviewIds.length - 1) moveReview(1);
  else { renderReview(); $('review-state').textContent += ' · End of this review. Close to see your picks.'; }
}
$('start-review').addEventListener('click', () => openReview());
$('review-prev').addEventListener('click', () => moveReview(-1));
$('review-next').addEventListener('click', () => moveReview(1));
$('review-keep').addEventListener('click', () => chooseInReview('keep'));
$('review-skip').addEventListener('click', () => chooseInReview('skip'));
$('review-undo').addEventListener('click', undoChoice);
$('undo-choice').addEventListener('click', undoChoice);
$('review-dialog').addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  const action = { k: () => chooseInReview('keep'), s: () => chooseInReview('skip'), u: undoChoice, ArrowLeft: () => moveReview(-1), ArrowRight: () => moveReview(1) }[event.key];
  if (action) { event.preventDefault(); action(); }
});
for (const subject of ['me','people','scenery','unknown']) $('tag-' + subject).addEventListener('click', () => {
  const photo = photos.find(p => p.id === reviewIds[reviewIndex]);
  if (photo) { photo.subject = subject; invalidateDrafts(); renderReview(); render(); }
});
for (const id of ['unreviewed', 'skipped']) $(id).addEventListener('click', () => { view = id; visibleLimit = 40; render(); });
$('subject-filter').addEventListener('change', () => { visibleLimit = 40; render(); });
$('new-project').addEventListener('click', () => $('new-project-dialog').showModal());
$('confirm-new-project').addEventListener('click', () => {
  if (importing || examplesBusy) return;
  photos.forEach(p => { URL.revokeObjectURL(p.url); URL.revokeObjectURL(p.originalUrl); });
  photos.length = 0; choiceHistory.length = 0; reviewIds = []; draftPlan = null;
  $('name').value = ''; $('collection-name').textContent = 'My memory pile';
  $('drafts').replaceChildren(); $('draft-status').textContent = ''; $('import-status').textContent = '';
  $('analysis-status').textContent = 'New project ready. Your style library is still here.';
  $('duplicate-status').textContent = 'Add photos to compare similar shots.';
  $('subject-filter').value = 'all'; view = 'all'; visibleLimit = 40;
  $('new-project-dialog').close(); render(); say(''); location.hash = '#start';
});

// Persist thumbnails and measurements, never the original trip collection.
function renderReferences() {
  styleExamples.splice(0, styleExamples.length, ...referenceLibrary.map(p => p.features));
  $('reference-grid').replaceChildren();
  for (const reference of referenceLibrary.slice(0, referenceLimit)) {
    const card = document.createElement('figure');
    const img = document.createElement('img'); img.src = reference.url; img.alt = reference.name; img.loading = 'lazy';
    const remove = textElement('button', 'Remove'); remove.setAttribute('aria-label', `Remove reference ${reference.name}`);
    remove.disabled = !libraryReady || examplesBusy || librarySyncFailed;
    remove.addEventListener('click', async () => {
      const referenceIndex = referenceLibrary.indexOf(reference);
      removedReferences.forEach(p => URL.revokeObjectURL(p.url));
      removedReferences = [reference]; referenceLibrary.splice(referenceLibrary.indexOf(reference), 1);
      if (reference.sourcePath) importedInstagramPaths.delete(reference.sourcePath);
      renderReferences(); await persistIfEnabled();
      const nextCard = $('reference-grid').children[Math.min(referenceIndex, $('reference-grid').children.length - 1)];
      (nextCard?.querySelector('button') || $('undo-reference')).focus();
    });
    card.append(img, remove); $('reference-grid').append(card);
  }
  $('more-references').hidden = referenceLibrary.length <= referenceLimit;
  $('clear-references').disabled = !referenceLibrary.length || examplesBusy || !libraryReady;
  $('undo-reference').disabled = !removedReferences.length || examplesBusy || !libraryReady;
  $('backup-references').disabled = !referenceLibrary.length || examplesBusy || !libraryReady;
  $('import-browser-library').disabled = !libraryReady || examplesBusy || librarySyncFailed;
}
async function addReference(file, sourcePath, stableId) {
  const preview = await makePreview(file);
  const id = typeof stableId === 'string' && /^[a-f0-9]{64}$/.test(stableId) ? stableId : preview.digest || `${file.name}:${file.size}:${file.lastModified}`;
  if (referenceLibrary.some(p => p.id === id)) { URL.revokeObjectURL(preview.url); return; }
  referenceLibrary.push({ id, name: file.name, ...preview, sourcePath });
  styleExamples.push(preview.features);
}
function persistLibrary() {
  if (!librarySession) {
    $('library-status').textContent = 'Sign in to save these references. Unsaved references clear when you refresh.';
    return Promise.resolve();
  }
  const generation = libraryGeneration;
  const session = librarySession;
  const records = referenceLibrary.map(({ id, name, blob, features, width, height, digest }) => ({ id, name, blob, features, width, height, digest }));
  const preferences = { people: $('people-priority').value, colors: $('colors').value };
  $('library-status').textContent = 'Saving your style library…';
  const operation = libraryQueue.then(async () => {
    if (librarySyncFailed || generation !== libraryGeneration) throw new Error('Library session changed or needs recovery.');
    const photos = await Promise.all(records.map(async ({ blob, ...record }) => ({
      ...record,
      data: await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
      })
    })));
    if (generation !== libraryGeneration) throw new Error('Library session changed.');
    const revision = await AccountLibrary.save(window.TripboxAccount.client, session, libraryRevision, { version: 1, photos, preferences });
    if (generation === libraryGeneration) libraryRevision = revision;
  });
  libraryQueue = operation.catch(() => { if (generation === libraryGeneration) librarySyncFailed = true; });
  return operation.then(() => {
    if (generation === libraryGeneration) $('library-status').textContent = `${records.length} style references saved to your account.`;
  }).catch(() => {
    if (generation !== libraryGeneration) return;
    librarySyncFailed = true;
    $('library-status').textContent = 'Your changes could not be saved. Download a library backup before refreshing; your account library may have changed on another device.';
    renderReferences();
  });
}
function persistIfEnabled() {
  return persistLibrary();
}
window.TripboxPrepareSignout = async () => {
  libraryReady = false;
  ['examples','instagram-json','instagram-folder'].forEach(id => { $(id).disabled = true; });
  renderReferences();
  await libraryQueue;
  if (librarySyncFailed || examplesBusy) {
    libraryReady = true;
    ['examples','instagram-json','instagram-folder'].forEach(id => { $(id).disabled = librarySyncFailed; });
    renderReferences();
    return false;
  }
  return true;
};
window.addEventListener('tripbox-signout-failed', () => {
  libraryReady = true;
  ['examples','instagram-json','instagram-folder'].forEach(id => { $(id).disabled = librarySyncFailed; });
  renderReferences();
});
for (const id of ['people-priority', 'colors']) {
  $(id).addEventListener('change', () => { if (libraryReady) persistIfEnabled(); });
}
$('more-references').addEventListener('click', () => { referenceLimit += 24; renderReferences(); });
$('clear-references').addEventListener('click', async () => {
  removedReferences.forEach(p => URL.revokeObjectURL(p.url));
  removedReferences = referenceLibrary.splice(0);
  importedInstagramPaths.clear(); instagramReferences.clear(); instagramFiles.clear();
  renderReferences(); await persistIfEnabled();
});
$('undo-reference').addEventListener('click', async () => {
  for (const reference of removedReferences) if (!referenceLibrary.some(p => p.id === reference.id)) {
    referenceLibrary.push(reference); if (reference.sourcePath) importedInstagramPaths.add(reference.sourcePath);
  }
  removedReferences = []; renderReferences(); await persistIfEnabled();
});
$('backup-references').addEventListener('click', async () => {
  $('backup-references').disabled = true;
  try {
    const records = await Promise.all(referenceLibrary.map(async reference => ({ id: reference.id, name: reference.name, data: await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(reference.blob);
    }) })));
    const backup = new Blob([JSON.stringify({ type: 'tripbox-style-library', version: 1, photos: records })], { type: 'application/json' });
    if (backup.size > 100 * 1024 * 1024) {
      $('library-status').textContent = 'This library exceeds the 100 MB backup limit. Remove some references before downloading a backup; Undo removal can restore them afterward.';
      return;
    }
    const url = URL.createObjectURL(backup);
    const link = document.createElement('a'); link.href = url; link.download = 'tripbox-style-library.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('library-status').textContent = 'Library backup downloaded. Import that JSON using the photos/examples picker to restore it in another browser.';
  } catch { $('library-status').textContent = 'Backup could not be created. Your references are still here; try again.'; }
  finally { renderReferences(); }
});
let libraryUserId;
async function loadReferenceLibrary(session) {
  const userId = session?.user?.id || null;
  if (libraryUserId === userId) { librarySession = session; return; }
  libraryUserId = userId;
  const generation = ++libraryGeneration;
  librarySession = session;
  libraryRevision = 0;
  librarySyncFailed = false;
  libraryReady = false;
  libraryQueue = Promise.resolve();
  ['examples','instagram-json','instagram-folder'].forEach(id => { $(id).disabled = true; });
  for (const item of [...referenceLibrary, ...removedReferences]) URL.revokeObjectURL(item.url);
  referenceLibrary.splice(0);
  removedReferences = [];
  importedInstagramPaths.clear(); instagramReferences.clear(); instagramFiles.clear();
  $('example-status').textContent = 'No examples yet. Add some to enable style-informed suggestions.';
  $('people-priority').value = 'people';
  $('colors').value = 'examples';
  $('import-browser-library').hidden = true;
  renderReferences();
  try {
    if (!session) {
      $('library-status').textContent = 'Sign in to save your style references to your account.';
      return;
    }
    $('library-status').textContent = 'Loading your style library…';
    const saved = await AccountLibrary.load(window.TripboxAccount.client, session);
    if (generation !== libraryGeneration) return;
    const records = saved.payload?.photos || [];
    if (saved.payload && (saved.payload.version !== 1 || !Array.isArray(records))) throw new Error('Unsupported library format');
    const loaded = [];
    for (const record of records) {
      if (typeof record.data !== 'string' || !/^data:image\/jpeg;base64,/.test(record.data) || record.features?.color?.length !== 3) throw new Error('Invalid saved reference');
      const blob = await (await fetch(record.data)).blob();
      loaded.push({ ...record, data: undefined, blob, url: URL.createObjectURL(blob) });
    }
    if (generation !== libraryGeneration) { loaded.forEach(item => URL.revokeObjectURL(item.url)); return; }
    referenceLibrary.push(...loaded);
    if (loaded.length) $('example-status').textContent = `${loaded.length} photo examples ready for local color and saturation matching.`;
    if (['people', 'balanced'].includes(saved.payload?.preferences?.people)) $('people-priority').value = saved.payload.preferences.people;
    if (['examples', 'bright', 'soft'].includes(saved.payload?.preferences?.colors)) $('colors').value = saved.payload.preferences.colors;
    libraryRevision = saved.revision;
    $('library-status').textContent = `${loaded.length} style references saved to your account.`;
    try {
      const local = await ReferenceStore.load();
      if (generation === libraryGeneration && local?.version === 1 && local.records?.length) $('import-browser-library').hidden = false;
    } catch (_) { /* Browser library is optional. */ }
  } catch (_) {
    if (generation !== libraryGeneration) return;
    librarySyncFailed = true;
    $('library-status').textContent = 'Could not load your account library. Check your connection and refresh before making changes.';
  } finally {
    if (generation === libraryGeneration) {
      libraryReady = true;
      ['examples','instagram-json','instagram-folder'].forEach(id => { $(id).disabled = librarySyncFailed; });
      renderReferences();
    }
  }
}
$('import-browser-library').addEventListener('click', async () => {
  if (!librarySession || !libraryReady || librarySyncFailed) return;
  const generation = libraryGeneration;
  $('import-browser-library').disabled = true;
  try {
    const saved = await ReferenceStore.load();
    if (generation !== libraryGeneration) return;
    for (const reference of saved?.records || []) {
      if (reference.blob instanceof Blob && reference.features?.color?.length === 3 && !referenceLibrary.some(item => item.id === reference.id)) {
        referenceLibrary.push({ ...reference, url: URL.createObjectURL(reference.blob) });
      }
    }
    renderReferences();
    await persistLibrary();
    if (!librarySyncFailed && generation === libraryGeneration) $('import-browser-library').hidden = true;
  } catch (_) {
    if (generation === libraryGeneration) $('library-status').textContent = 'Could not import your browser library. Your existing browser copy has not been removed.';
  } finally { renderReferences(); }
});
window.addEventListener('tripbox-auth-change', event => {
  const session = event.detail;
  setTimeout(() => loadReferenceLibrary(session), 0);
});
loadReferenceLibrary(window.TripboxAccount?.session || null);

render();

