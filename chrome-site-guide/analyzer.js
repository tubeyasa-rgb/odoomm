/* Runs only on explicit user request. Never reads input values or page-wide text. */
function analyzePage() {
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const visible = el => {
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && style.visibility === 'visible' && style.display !== 'none' && !el.closest('[hidden],[inert],[aria-hidden="true"]');
  };
  const safeText = el => {
    if (!el || el.matches('input,textarea,select,[contenteditable]')) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('input,textarea,select,[contenteditable],script,style').forEach(n => n.remove());
    return clean(clone.textContent);
  };
  const label = el => {
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    return clean(el.getAttribute('aria-label')) || clean(ids.map(id => safeText(document.getElementById(id))).join(' ')) || clean(Array.from(el.labels || []).map(safeText).join(' ')) || safeText(el) || clean(el.getAttribute('title'));
  };
  const safeUrl = raw => {
    try { const u = new URL(raw, location.href); return /^https?:$/.test(u.protocol) ? u.origin + u.pathname : null; } catch { return null; }
  };
  const fields = Array.from(document.querySelectorAll('input,textarea,select,[contenteditable="true"]')).filter(visible).filter(el => {
    const hint = [el.type, el.name, el.id, el.autocomplete, label(el), el.getAttribute('placeholder')].join(' ');
    return !/password|passwd|pin|otp|token|secret|credit|card|كلمة.*مرور|رقم.*سري|رمز.*تحقق/i.test(hint) && !['hidden','submit','button','reset'].includes(el.type);
  }).slice(0, 60).map(el => ({label: label(el) || 'حقل بدون اسم واضح', type: el.tagName === 'SELECT' ? 'اختيار من قائمة' : el.type || 'نص'}));
  const buttons = Array.from(document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')).filter(visible).map(label).filter(Boolean).slice(0, 60);
  const links = Array.from(document.querySelectorAll('a[href]')).filter(visible).map(el => ({label: label(el), url: safeUrl(el.getAttribute('href'))})).filter(x => x.label && x.url).slice(0, 80);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,[role="heading"]')).filter(visible).map(safeText).filter(Boolean).slice(0, 25);
  return {url: safeUrl(location.href), title: clean(document.title), headings, fields, buttons: [...new Set(buttons)], links: links.filter((x,i,a) => a.findIndex(y => y.url === x.url && y.label === x.label) === i), odoo: !!document.querySelector('.o_web_client,.o_action_manager,.o_form_view,.o_list_view'), analyzedAt: new Date().toISOString()};
}
