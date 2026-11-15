'use strict';
/* Card previews and exports stay in the browser. Providers receive nothing automatically. */
const CardStudio = (() => {
  const formats = {
    postcard: {title: 'Postcard', width: 1800, height: 1200, inches: '6 × 4', heading: 'Wish you were here', message: 'A little memory from somewhere wonderful.', canva: 'https://www.canva.com/create/postcards/'},
    thanks: {title: 'Thank-you note', width: 2100, height: 1500, inches: '7 × 5', heading: 'Thank you', message: 'For being part of a memory I will always keep.', canva: 'https://www.canva.com/thank-you-cards/'},
    invitation: {title: 'Invitation', width: 1500, height: 2100, inches: '5 × 7', heading: 'You are invited', message: 'Join us for a moment worth celebrating.\nAdd your date, time, place, and RSVP details.', canva: 'https://www.canva.com/create/cards/party-invitations/'}
  };
  function wrap(ctx, text, maxWidth) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        for (const char of (line ? ' ' : '') + word) {
          if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line.trim()); line = ''; }
          line += char;
        }
      }
      lines.push(line.trim());
    }
    return lines;
  }
  return {formats, wrap};
})();
(() => {
  const el = id => document.getElementById(id);
  const canvas = el('card-preview'), ctx = canvas.getContext('2d');
  let signature = '', revision = 0, ready = false;
  function available() { return photos.filter(photo => photo.selected && !photo.excluded); }
  function refreshPhotos() {
    const keepers = available();
    const next = keepers.map(photo => photo.id).join(',');
    if (next === signature) return;
    signature = next;
    const previous = el('card-photo').value;
    el('card-photo').replaceChildren();
    for (const photo of keepers) {
      const option = document.createElement('option'); option.value = photo.id; option.textContent = photo.name; el('card-photo').append(option);
    }
    if (keepers.some(photo => String(photo.id) === previous)) el('card-photo').value = previous;
    el('card-photo').disabled = !keepers.length;
    draw();
  }
  async function draw() {
    const current = ++revision;
    ready = false; el('card-download').disabled = true;
    const format = CardStudio.formats[el('card-type').value];
    canvas.width = format.width; canvas.height = format.height;
    ctx.fillStyle = '#fffdf9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    el('card-dimensions').textContent = `${format.width} × ${format.height} pixels · ${format.inches} inches at 300 pixels/inch. No bleed or mailing back is included. Check the printer’s template and preview.`;
    el('canva-handoff').href = format.canva;
    const photo = available().find(item => String(item.id) === el('card-photo').value);
    el('card-empty').hidden = !!photo;
    canvas.hidden = !photo;
    if (!photo) { el('card-status').textContent = 'Keep a photo in Review picks, then return here to make a card.'; return; }
    try {
      const image = new Image(); image.src = photo.originalUrl;
      await image.decode();
      if (current !== revision) return;
      const margin = Math.round(canvas.width * .055);
      const photoBox = {x: margin, y: margin, width: canvas.width - margin * 2, height: Math.round(canvas.height * .57)};
      ctx.fillStyle = '#eee7f5'; ctx.fillRect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
      const scale = Math.min(photoBox.width / image.naturalWidth, photoBox.height / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.drawImage(image, photoBox.x + (photoBox.width - width) / 2, photoBox.y + (photoBox.height - height) / 2, width, height);
      const textTop = photoBox.y + photoBox.height + margin;
      const heading = el('card-heading').value.trim() || format.heading;
      const message = el('card-message').value.trim();
      const maxWidth = canvas.width - margin * 2;
      let font = Math.round(canvas.width * .055);
      ctx.fillStyle = '#30283c'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      while (font > 26) {
        ctx.font = `${font}px Georgia, serif`;
        if (CardStudio.wrap(ctx, heading, maxWidth).length <= 2) break;
        font -= 2;
      }
      const headingLines = CardStudio.wrap(ctx, heading, maxWidth);
      let y = textTop;
      for (const line of headingLines) { ctx.fillText(line, canvas.width / 2, y); y += font * 1.2; }
      y += margin * .35;
      let bodySize = Math.round(canvas.width * .025);
      let bodyLines;
      while (bodySize >= 18) {
        ctx.font = `${bodySize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        bodyLines = CardStudio.wrap(ctx, message, maxWidth);
        if (y + bodyLines.length * bodySize * 1.5 <= canvas.height - margin) break;
        bodySize -= 2;
      }
      if (bodySize < 18) throw new Error('Your message is too long for this card. Shorten it before downloading.');
      ctx.fillStyle = '#655c70';
      for (const line of bodyLines) { ctx.fillText(line, canvas.width / 2, y); y += bodySize * 1.5; }
      ready = true; el('card-download').disabled = false;
      const ppi = Math.min(image.naturalWidth / (width / 300), image.naturalHeight / (height / 300));
      el('card-status').textContent = `${format.title} preview ready. Your full photo fits without cropping.${ppi < 200 ? ' This photo may look soft in print; use a higher-resolution original if possible.' : ''} Download the PNG, then upload it yourself in Canva or Shutterfly.`;
    } catch (error) {
      if (current === revision) el('card-status').textContent = error.message || 'Could not load this photo. Choose another keeper.';
    }
  }
  el('card-type').addEventListener('change', () => {
    const format = CardStudio.formats[el('card-type').value];
    el('card-heading').value = format.heading; el('card-message').value = format.message; draw();
  });
  for (const id of ['card-photo', 'card-heading', 'card-message']) el(id).addEventListener(id === 'card-photo' ? 'change' : 'input', draw);
  el('card-download').addEventListener('click', () => {
    if (!ready) return;
    const current = revision;
    canvas.toBlob(blob => {
      if (!blob || current !== revision) { el('card-status').textContent = 'The preview changed. Try downloading again.'; return; }
      const link = document.createElement('a'), url = URL.createObjectURL(blob);
      link.href = url; link.download = `tripbox-${el('card-type').value}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      el('card-status').textContent = 'PNG downloaded. Open a provider below, choose its upload option, and review size, margins, and print quality before ordering.';
      window.posthog?.capture('card_exported', {card_type: el('card-type').value});
    }, 'image/png');
  });
  el('card-copy').addEventListener('click', async () => {
    try {
      const format = CardStudio.formats[el('card-type').value];
      await navigator.clipboard.writeText(`${el('card-heading').value.trim() || format.heading}\n\n${el('card-message').value}`);
      el('card-status').textContent = 'Card text copied. Paste it into Canva or Shutterfly if you want editable text there.';
    } catch { el('card-status').textContent = 'Clipboard access is unavailable. Select and copy the heading and message fields yourself.'; }
  });
  new MutationObserver(refreshPhotos).observe(el('grid'), {childList: true});
  // Keep the initial placeholder even before the first selection exists.
  draw(); refreshPhotos();
})();
