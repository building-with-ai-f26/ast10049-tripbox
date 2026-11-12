'use strict';
let aiBusy = false;
const aiButton = document.getElementById('ai-suggest');
const aiStatus = document.getElementById('ai-status');
const consent = document.getElementById('ai-consent');
const localServer = ['localhost', '127.0.0.1'].includes(location.hostname) && location.protocol === 'http:';
let aiConfigured = false;
function updateAIButton() {
  aiButton.disabled = !aiConfigured || aiBusy || importing || examplesBusy || !consent.checked || !photos.some(p => !p.excluded);
}
// render() mutates the gallery as import and review state change.
new MutationObserver(updateAIButton).observe(document.getElementById('grid'), { childList: true });
consent.addEventListener('change', updateAIButton);
if (localServer) {
  fetch('/api/status').then(r => r.ok ? r.json() : Promise.reject()).then(status => {
    aiConfigured = status.configured;
    aiStatus.textContent = status.configured ? `Local AI ready · ${status.model}. Add photos, then allow preview sharing below.` : 'Save your OpenRouter key in .env and restart python3 server.py to enable AI.';
    updateAIButton();
  }).catch(() => { aiStatus.textContent = 'Start python3 server.py to use AI. The simple static server does not support AI requests.'; });
} else {
  aiStatus.textContent = 'AI recommendations run in the local app. Run python3 server.py on your laptop, then open http://127.0.0.1:8000/prototype/. Local suggestions above work here.';
}
function previewData(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  });
}
aiButton.addEventListener('click', async () => {
  if (aiButton.disabled || aiBusy) return;
  aiBusy = true; updateAIButton();
  const candidates = photos.filter(p => !p.excluded).slice(0, 12);
  const count = Math.min(6, candidates.length, Math.max(1, settings().perPost));
  const before = new Set(candidates.filter(p => p.manualKeep).map(p => p.id));
  aiStatus.textContent = `Sending ${candidates.length} photo previews and ${Math.min(3, referenceLibrary.length)} style previews. Your existing picks stay in place while AI responds…`;
  window.posthog?.capture('ai_recommendation_started', { candidate_count: candidates.length });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ photos: await Promise.all(candidates.map(async p => ({ id: p.id, image: await previewData(p.blob) }))),
        references: await Promise.all(referenceLibrary.slice(0, 3).map(p => previewData(p.blob))), count })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AI request failed.');
    // Reject stale results if the trip was reset or a candidate was skipped mid-request.
    if (!result.picks?.length || result.picks.some(p => !photos.some(q => q.id === p.id && !q.excluded))) throw new Error('Your photos changed during this request. Run AI again for the current collection.');
    const chosen = result.picks.map(p => photos.find(q => q.id === p.id));
    rememberChoices(chosen);
    invalidateDrafts();
    result.picks.forEach(pick => {
      const photo = photos.find(p => p.id === pick.id);
      photo.selected = true;
      photo.labels.add('Post');
      (photo.autoLabels ||= new Set()).add('Post');
      photo.reason = `AI suggestion: ${pick.reason}`;
    });
    view = 'shortlist'; visibleLimit = 40; render();
    const usage = result.usage || {};
    const cost = typeof usage.cost === 'number' ? ` · reported cost $${usage.cost.toFixed(6)}` : '';
    aiStatus.textContent = `AI returned ${result.picks.length} Post suggestions · ${result.picks.filter(p => before.has(p.id)).length} match your prior keeps. Existing labels and keeps were preserved. ${usage.prompt_tokens ?? '?'} input / ${usage.completion_tokens ?? '?'} output tokens${cost}. Review each suggestion; Undo reverses this batch.`;
    window.posthog?.capture('ai_recommendation_completed', { pick_count: result.picks.length, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
  } catch (error) {
    aiStatus.textContent = error.name === 'AbortError' ? 'AI request timed out. Existing picks were kept. Check OpenRouter Activity before retrying; a timed-out request may still be billed.' : `${error.message} Existing picks were kept.`;
    window.posthog?.capture('ai_recommendation_failed');
  } finally { clearTimeout(timer); aiBusy = false; updateAIButton(); }
});
