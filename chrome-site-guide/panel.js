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
let requestedOrigin = null;
function showError(error) {
  const message = String(error?.message || error);
  if (error.code === 'restricted') {
    $('status').textContent = 'الصفحة دي غير مدعومة. افتح موقع HTTP أو HTTPS؛ صفحات كروم والمتجر وملفات PDF محمية.';
  } else if (requestedOrigin && /cannot access|permission|host access|not allowed|denied/i.test(message)) {
    $('allow').hidden = false;
    $('status').textContent = 'كروم لم يمنح الإضافة إذن قراءة الموقع. اضغط «اسمح بتحليل هذا الموقع» ثم وافق على طلب كروم.';
  } else {
    // Chrome errors can contain a full URL; never display its query/fragment.
    const safeMessage = message.replace(/https?:\/\/[^\s"'<>]+/g, raw => {
      try { const u = new URL(raw); return u.origin + u.pathname; } catch { return '[رابط]'; }
    }).slice(0, 300);
    $('status').textContent = `تعذّر التحليل: ${safeMessage}. جرّب تحديث الصفحة وإعادة تحميل الإضافة من chrome://extensions.`;
  }
}
async function analyzeCurrentPage() {
  $('analyze').disabled = true; $('allow').hidden = true; requestedOrigin = null;
  $('status').textContent = 'جاري قراءة عناصر الصفحة…';
  try {
    await loaded;
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) throw new Error('لا توجد صفحة نشطة');
    const url = new URL(tab.url || 'chrome://unknown');
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
      const error = new Error('صفحة محمية'); error.code = 'restricted'; throw error;
    }
    requestedOrigin = url.origin + '/*';
    // activeTab may already authorize injection. Request a site grant only if needed.
    const results = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: analyzePage});
    const page = results[0]?.result;
    if (!page?.url) throw new Error('لم ترجع الصفحة نتيجة. انتظر تحميلها وأعد المحاولة');
    const next = [page, ...pages.filter(p => p.url !== page.url)].slice(0, 100);
    await chrome.storage.local.set({siteGuidePages: next}); pages = next;
    render(page); renderHistory(); $('status').textContent = 'تم التحليل وحفظ الصفحة محليًا.';
  } catch (error) { showError(error); }
  finally { $('analyze').disabled = false; }
}
$('analyze').addEventListener('click', analyzeCurrentPage);
$('allow').addEventListener('click', () => {
  if (!requestedOrigin) return;
  // Request directly in a user gesture, for this site alone, never all sites.
  chrome.permissions.request({origins: [requestedOrigin]}).then(granted => {
    if (granted) return analyzeCurrentPage();
    $('status').textContent = 'لم يتم منح الإذن. لن نقرأ الصفحة إلا بعد موافقتك.';
  }).catch(showError);
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
