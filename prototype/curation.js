'use strict';
// Local visual measurements, not a trained model or a judgment about people.
const Curation = (() => {
  const distance = (a, b) => a.reduce((sum, value, i) => sum + (value !== b[i] ? 1 : 0), 0);
  function measure(pixels, width, height) {
    const gray = [], color = [0, 0, 0]; let saturation = 0, sharpness = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
      gray.push((rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) / 255);
      rgb.forEach((value, channel) => { color[channel] += value / 255; });
      saturation += (Math.max(...rgb) - Math.min(...rgb)) / 255;
    }
    const count = gray.length;
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      sharpness += Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width]);
    }
    const hash = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const row = Math.min(height - 1, Math.floor((y + .5) * height / 8)) * width;
      hash.push(gray[row + Math.floor(x * width / 9)] > gray[row + Math.floor((x + 1) * width / 9)] ? 1 : 0);
    }
    return { color: color.map(v => v / count), brightness: gray.reduce((a, b) => a + b, 0) / count, saturation: saturation / count, sharpness: sharpness / Math.max(1, (width - 2) * (height - 2)), hash };
  }
  function similar(a, b) {
    if (a.digest && a.digest === b.digest) return 'exact';
    if (Math.abs(Math.log((a.width / a.height) / (b.width / b.height))) > .18) return false;
    const colorDifference = a.features.color.reduce((sum, value, i) => sum + Math.abs(value - b.features.color[i]), 0);
    return distance(a.features.hash, b.features.hash) <= 10 && colorDifference < .24 ? 'similar' : false;
  }
  function groups(photos) {
    const result = [];
    for (const photo of photos) {
      // Compare to every member: avoid chains of increasingly unrelated images.
      const group = result.find(items => items.every(item => similar(item, photo)));
      if (group) group.push(photo); else result.push([photo]);
    }
    return result;
  }
  function score(photo, purpose, taste, settings) {
    const f = photo.features;
    let result = Math.min(.3, f.sharpness) + (1 - Math.abs(f.brightness - .55)) * .15;
    if (taste.length) result += 1 - taste.reduce((sum, example) => sum + f.color.reduce((s, c, i) => s + Math.abs(c - example.color[i]), 0) / 3 + Math.abs(f.saturation - example.saturation) * .3, 0) / taste.length;
    if (settings.colors === 'bright') result += f.saturation * .25 + f.brightness * .1;
    if (settings.colors === 'soft') result += (1 - f.saturation) * .25;
    if (photo.liked || photo.manualKeep) result += .6;
    if (purpose === 'Post' && settings.people !== 'balanced') {
      if (photo.subject === 'me') result += 1.1;
      else if (photo.subject === 'people') result += .65;
    }
    if (purpose === 'Story') result += photo.height > photo.width ? .3 : 0;
    if (purpose === 'Frame') {
      const ratio = settings.frameWidth / settings.frameHeight;
      result += Math.max(0, 1 - Math.abs(Math.log((photo.width / photo.height) / ratio))) * .3;
      result += Math.min(1, Math.min(photo.width / settings.frameWidth, photo.height / settings.frameHeight) / 300) * .3;
    }
    return result;
  }
  function unique(photos) {
    // Pairwise filtering also catches links between otherwise separate groups.
    const result = [];
    for (const photo of photos) if (!result.some(item => similar(item, photo))) result.push(photo);
    return result;
  }
  function choose(photos, purpose, count, taste, settings) {
    const ranked = photos.filter(p => !p.excluded).slice().sort((a, b) => score(b, purpose, taste, settings) - score(a, purpose, taste, settings));
    const chosen = [];
    while (ranked.length && chosen.length < count) {
      // Reward a mix of user-tagged subjects and colors instead of a run of scenery.
      ranked.sort((a, b) => {
        const variety = p => {
          if (!chosen.length) return 0;
          const sameSubject = chosen.filter(item => item.subject && item.subject === p.subject).length;
          const nearestColor = Math.min(...chosen.map(item => p.features.color.reduce((n, v, i) => n + Math.abs(v - item.features.color[i]), 0)));
          return Math.min(.15, nearestColor * .15) - (sameSubject / chosen.length) * .12;
        };
        return score(b, purpose, taste, settings) + variety(b) - score(a, purpose, taste, settings) - variety(a);
      });
      const candidate = ranked.shift();
      if (!chosen.some(item => similar(item, candidate))) chosen.push(candidate);
    }
    return chosen;
  }
  return { measure, similar, groups, score, choose, unique };
})();
