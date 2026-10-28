const $ = id => document.getElementById(id);
let pages = [];
const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
function list(parent, title, items) {
  if (!items.length) return;
  parent.append(node('h3', title));
  const ul = node('ul'); items.forEach(text => ul.append(node('li', text))); parent.append(ul);
}
function render(page) {
  $('result').replaceChildren();
  if (!page) return;
  const card = node('article');
  card.append(node('h2', page.title || 'الصفحة الحالية'), node('p', page.url, 'url'));
  card.append(node('span', page.odoo ? 'واجهة Odoo مرجّحة' : 'صفحة ويب', 'chip'));
  card.append(node('p', `رصدنا ${page.buttons.length} زر و${page.fields.length} حقل و${page.links.length} رابط. الأسماء توضح الوظائف المحتملة؛ لم يتم تشغيل أي إجراء.`));
  list(card, 'عناوين تساعدك تفهم الصفحة', page.headings);
  list(card, 'الإجراءات المتاحة حسب أسماء الأزرار', page.buttons);
  list(card, 'الحقول الظاهرة', page.fields.map(f => `${f.label} — ${f.type}`));
  const details = node('details'); details.append(node('summary', 'الروابط المكتشفة'));
  list(details, 'أسماء الروابط', page.links.map(l => `${l.label} — ${l.url}`)); card.append(details);
  if (!page.headings.length && !page.buttons.length && !page.fields.length) card.append(node('p', 'لم تظهر عناصر كافية. جرّب بعد تحميل الصفحة. محتوى الإطارات الداخلية وShadow DOM غير مشمول.'));
  $('result').append(card);
}
function renderHistory() {
  $('count').textContent = pages.length;
  $('history').replaceChildren();
  pages.forEach(p => {
    const row = node('div', undefined, 'history-item');
    const b = node('button', p.title || p.url); b.addEventListener('click', () => render(p));
    row.append(b, node('div', p.url, 'url')); $('history').append(row);
  });
}
const loaded = chrome.storage.local.get({siteGuidePages: []}).then(data => { pages = data.siteGuidePages; renderHistory(); });
$('analyze').addEventListener('click', async () => {
  $('analyze').disabled = true; $('status').textContent = 'جاري قراءة عناصر الصفحة…';
  try {
    await loaded;
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) throw new Error('no tab');
    const results = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: analyzePage});
    const page = results[0]?.result;
    if (!page?.url) throw new Error('unsupported');
    const next = [page, ...pages.filter(p => p.url !== page.url)].slice(0, 100);
    await chrome.storage.local.set({siteGuidePages: next}); pages = next;
    render(page); renderHistory(); $('status').textContent = 'تم التحليل وحفظ الصفحة محليًا.';
  } catch { $('status').textContent = 'تعذّر تحليل الصفحة. افتح موقعًا عاديًا، واضغط أيقونة الإضافة فيه لمنح الإذن، ثم أعد المحاولة. صفحات كروم الداخلية ومتجر الإضافات غير مدعومة.'; }
  finally { $('analyze').disabled = false; }
});
$('clear').addEventListener('click', async () => {
  await loaded;
  if (!confirm('مسح كل الصفحات المحفوظة محليًا؟')) return;
  try { await chrome.storage.local.remove('siteGuidePages'); pages = []; renderHistory(); render(null); $('status').textContent = 'تم مسح الخريطة.'; }
  catch { $('status').textContent = 'تعذّر مسح الخريطة. حاول مرة أخرى.'; }
});
$('export').addEventListener('click', async () => {
  await loaded;
  const report = {app: 'Site Guide', note: 'تحليل وصفي محلي. لا يثبت تنفيذ الوظائف. قد تتضمن أسماء العناصر وروابط الصفحات معلومات خاصة؛ راجع التقرير قبل مشاركته.', pages};
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
  const a = node('a'); a.href = url; a.download = 'site-guide-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
