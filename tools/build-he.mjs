// Builds he/index.html from the English index.html plus the Hebrew content in tools/he/.
//
//   node tools/build-he.mjs
//
// The Hebrew page reuses the English page's CSS and script, so any change to
// index.html must be followed by a rebuild. Every replacement below must match
// exactly once, so the build fails loudly when the English page changes.
import fs from 'fs';
const HERE = new URL('.', import.meta.url).pathname;      // tools/
const REPO = new URL('..', import.meta.url).pathname;     // repo root
const read = f => fs.readFileSync(HERE + 'he/' + f, 'utf8');
const en = fs.readFileSync(`${REPO}/index.html`, 'utf8');
const lines = en.split('\n');

// Section boundaries (1-based line numbers found by marker, not hard-coded).
const at = (re, from = 0) => { const i = lines.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error('marker ' + re); return i; };
const iSvg = at(/^<svg width="0"/), iSvgEnd = at(/^<\/svg>$/, iSvg);
const iHeader = at(/^<header>$/), iMainEnd = at(/^<\/main>$/);
const iFacData = at(/^<script type="application\/json" id="faculty-data">/);
const iPhoto = at(/^<script type="application\/json" id="photo-data">/);
const iScript = at(/^<script>$/, iPhoto), iScriptEnd = at(/^<\/script>$/, iScript);
const iStyleEnd = at(/^<\/style>$/);

function rep(s, pairs, label) {
  for (const [a, b] of pairs) {
    const n = typeof a === 'string' ? s.split(a).length - 1 : (s.match(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g')) || []).length;
    if (!n) throw new Error(`${label}: no match for ${a}`);
    s = typeof a === 'string' ? s.split(a).join(b) : s.replace(a, b);
  }
  return s;
}

/* ---------- head ---------- */
let head = lines.slice(0, iStyleEnd).join('\n');
head = rep(head, [
  ['<html lang="en">', '<html lang="he" dir="rtl">'],
  ['content="A redesign mockup of the Bar-Ilan University Department of Computer Science and AI website."', 'content="הצעה לעיצוב מחדש של אתר המחלקה למדעי המחשב ובינה מלאכותית באוניברסיטת בר־אילן."'],
  ['<title>BIU Computer Science</title>', '<title>מדעי המחשב בבר־אילן</title>\n<link rel="alternate" hreflang="en" href="../">\n<link rel="alternate" hreflang="he" href="./">'],
  ['family=Bricolage+Grotesque', 'family=Rubik:wght@500..700&family=Heebo:wght@400..700&family=Bricolage+Grotesque'],
  ['--display:"Bricolage Grotesque",', '--display:"Rubik","Bricolage Grotesque",'],
  ['--body:"Public Sans",', '--body:"Heebo","Public Sans",'],
  ['--mono:"IBM Plex Mono",', '--mono:"IBM Plex Mono","Heebo",'],
], 'head');

const rtlCss = `
/* ---------- Hebrew / RTL overrides ---------- */
h1,h2,h3{letter-spacing:0}
.label,.facts dt,dl.contact-list dt,table.data thead th{font-family:var(--body);font-weight:600;letter-spacing:.02em}
.drop{left:auto;right:0}
.path:hover{transform:translateX(-3px)}
table.data th,table.data td{text-align:right}
.pager a:last-child{text-align:left}
.toc a{padding:5px 12px 5px 0;border-left:0;border-right:2px solid var(--rule)}
.toc a.on{border-right-color:var(--accent)}
.checks li{padding-left:0;padding-right:26px}
.checks li::before{left:auto;right:3px}
.steps li{padding:12px 50px 12px 0}
.steps li::before{left:auto;right:0}
.facts div{padding:16px 0 16px 20px}
.facts div+div{padding-left:20px;padding-right:20px;border-left:0;border-right:1px solid var(--rule)}
blockquote.pull{border-left:0;border-right:3px solid var(--accent);padding:4px 20px 4px 0}
.members a{padding:4px 4px 4px 12px}
.members.roles a{padding:10px 10px 10px 14px}
.inline-badge{margin-right:0;margin-left:12px}
.btn{margin:4px 0 0 8px}
@media (max-width:920px){.drop{padding:0 12px 8px 0}}
@media (max-width:640px){.facts div,.facts div+div{padding:14px 0 14px 12px;border-right:0}.facts div:nth-child(2n){padding-left:0;padding-right:12px;border-right:1px solid var(--rule)}}
@media (max-width:860px){.toc a{border:1px solid var(--rule);padding:4px 12px}.toc a.on{border-color:var(--accent)}}
`;

/* ---------- faculty data ---------- */
const fac = JSON.parse(lines[iFacData].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
const he = Object.assign({}, ...[1, 2, 3, 4].map(i => JSON.parse(read(`fac-${i}.json`))));
const ROLE = { 'Head of Department': 'ראש המחלקה', 'Deputy Head of Department': 'משנה לראש המחלקה' };
const LINK = { 'Personal website': 'אתר אישי', 'Faculty page': 'דף סגל', 'Google Scholar': 'Google Scholar', 'DBLP': 'DBLP' };
const HOURS = { 'By appointment': 'בתיאום מראש', 'Sunday 9:00–10:00': 'יום א׳ 9:00–10:00' };
const POSITION = { 'Head, Bar-Ilan Robotics Consortium (BIRC)': 'ראש קונסורציום הרובוטיקה של בר־אילן (BIRC)', 'Assistant Professor': 'מרצה בכיר' };
const office = o => o
  .replace(/^Building (\d+), Room (\d+)$/, 'בניין $1, חדר $2')
  .replace(/^Nano building , (\d+) floor, (\w) entrance, room (\d+)$/, 'בניין הננו, קומה $1, כניסה $2, חדר $3');
const facHe = fac.map(p => {
  const t = he[p.slug];
  if (!t) throw new Error('missing translation ' + p.slug);
  const out = { ...p, first: t.first, last: t.last, role: p.role ? ROLE[p.role] : '', office: office(p.office),
    interest: p.interest ? t.interest : '', tagline: p.tagline ? t.tagline : '', cv: p.cv ? t.cv : '',
    research: p.research ? t.research : null, links: p.links.map(([l, u]) => [LINK[l], u]),
    ...(p.hours && { hours: HOURS[p.hours] }), ...(p.position && { position: POSITION[p.position] }) };
  if (p.hours && !out.hours) throw new Error('hours ' + p.hours);
  if (p.position && !out.position) throw new Error('position ' + p.position);
  if (out.links.some(([l]) => !l)) throw new Error('link label ' + p.slug);
  if (p.role && !out.role) throw new Error('role ' + p.role);
  if (/[A-Za-z]{3,} [A-Za-z]{3,}/.test(out.office)) throw new Error('office ' + p.office);
  for (const k of ['interest', 'tagline', 'cv']) if (p[k] && !out[k]) throw new Error(`untranslated ${p.slug}.${k}`);
  if (p.research && !out.research) throw new Error('research ' + p.slug);
  return out;
});
const json = JSON.stringify(facHe).replace(/</g, '\\u003c');

/* ---------- script ---------- */
let script = lines.slice(iScript, iScriptEnd + 1).join('\n');
script = rep(script, [
  [`const AREAS=[
  {k:'Theory',n:'Algorithms & Theory',i:'i-graph',d:'Pattern matching, dynamic and graph algorithms, geometry, complexity.',labs:['algorithms']},
  {k:'AI',n:'Artificial Intelligence',i:'i-spark',d:'Multi-agent systems, planning, negotiation and human–agent interaction.',labs:['multi-agent','iia']},
  {k:'ML',n:'Machine Learning',i:'i-chart',d:'Deep learning theory, representation learning, few-shot generalization.',labs:['learning-systems']},
  {k:'NLP',n:'Natural Language Processing',i:'i-chat',d:'Language models, interpretability, Hebrew and morphologically rich languages.',labs:['nlp']},
  {k:'Robotics',n:'Robotics',i:'i-robot',d:'Multi-robot systems, swarms, and assistive robots such as a robotic guide dog.',labs:['robotics','multi-agent']},
  {k:'Crypto',n:'Cryptography & Cyber Security',i:'i-lock',d:'Secure computation, protocols, privacy.',labs:['crypto']},
  {k:'Verification',n:'Formal Methods & Verification',i:'i-book',d:'Verification of hardware and software, automated reasoning, SMT.',labs:['formal-methods']},
  {k:'Data',n:'Data & Information Retrieval',i:'i-layers',d:'Data management in the cloud, crowdsourcing, information retrieval.',labs:[]},
  {k:'Bioinformatics',n:'Bioinformatics',i:'i-ai',d:'Biological sequences, mathematical biology, genomic big data.',labs:['bioinformatics']},
];`,
   `const AREAS=[
  {k:'Theory',n:'אלגוריתמים ותאוריה',i:'i-graph',d:'התאמת תבניות, אלגוריתמים דינמיים ואלגוריתמים לגרפים, גאומטריה, סיבוכיות.',labs:['algorithms']},
  {k:'AI',n:'בינה מלאכותית',i:'i-spark',d:'מערכות מרובות סוכנים, תכנון, משא ומתן ואינטראקציה בין אדם לסוכן.',labs:['multi-agent','iia']},
  {k:'ML',n:'למידת מכונה',i:'i-chart',d:'תאוריה של למידה עמוקה, למידת ייצוגים, הכללה מדוגמאות מעטות.',labs:['learning-systems']},
  {k:'NLP',n:'עיבוד שפה טבעית',i:'i-chat',d:'מודלי שפה, פרשנות מודלים, עברית ושפות עשירות מורפולוגית.',labs:['nlp']},
  {k:'Robotics',n:'רובוטיקה',i:'i-robot',d:'מערכות מרובות רובוטים, נחילים ורובוטים מסייעים, כמו כלב נחייה רובוטי.',labs:['robotics','multi-agent']},
  {k:'Crypto',n:'קריפטוגרפיה וסייבר',i:'i-lock',d:'חישוב מאובטח, פרוטוקולים, פרטיות.',labs:['crypto']},
  {k:'Verification',n:'שיטות פורמליות ואימות',i:'i-book',d:'אימות חומרה ותוכנה, הסקה אוטומטית, SMT.',labs:['formal-methods']},
  {k:'Data',n:'נתונים ואחזור מידע',i:'i-layers',d:'ניהול נתונים בענן, מיקור המונים ואחזור מידע.',labs:[]},
  {k:'Bioinformatics',n:'ביואינפורמטיקה',i:'i-ai',d:'רצפים ביולוגיים, ביולוגיה מתמטית, ביג דאטה גנומי.',labs:['bioinformatics']},
];`],
  ['} faculty members${labs.length?` · Labs: ', '} חברי סגל${labs.length?` · מעבדות: '],
  [`a.last.localeCompare(b.last)`, `a.last.localeCompare(b.last,'he')`],
  ['const fullName=p=>`${p.title} ${p.first} ${p.last}`;', "const TITLE={'Prof.':'פרופ׳','Dr.':'ד״ר'};\nconst fullName=p=>`${TITLE[p.title]||p.title} ${p.first} ${p.last}`;"],
  ['src="images/faculty/', 'src="../images/faculty/'],
  [`const SITE='BIU Computer Science';`, `const SITE='מדעי המחשב בבר־אילן';`],
  ['${areaCount(a.k)} faculty members →', '${areaCount(a.k)} חברי סגל ←'],
  [`'Profile coming soon'`, `'פרופיל יתפרסם בקרוב'`],
  [`aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span>People</span><span>/</span><span aria-current="page">Faculty</span>`, `aria-label="פירורי לחם"><a href="#/">דף הבית</a><span>/</span><span>אנשים</span><span>/</span><span aria-current="page">סגל אקדמי</span>`],
  ['<span class="label">People</span><h1>Faculty</h1><p>${active.length} faculty members and ${emeriti.length} emeriti working across AI, theory, security and systems.</p>',
   '<span class="label">אנשים</span><h1>סגל אקדמי</h1><p>${active.length} חברי סגל ו־${emeriti.length} גמלאים העוסקים בבינה מלאכותית, בתאוריה, באבטחה ובמערכות.</p>'],
  [`placeholder="Search by name or research topic" aria-label="Search faculty"`, `placeholder="חיפוש לפי שם או נושא מחקר" aria-label="חיפוש בסגל"`],
  [`aria-label="Filter by research area"`, `aria-label="סינון לפי תחום מחקר"`],
  ['data-area="">All <small>', 'data-area="">הכול <small>'],
  ['`<p class="empty">No faculty match “${esc(state.q)}”${state.area?` in ${esc(AREA[state.area])}`:\'\'}. Try a broader term or choose All.</p>`',
   '`<p class="empty">לא נמצאו חברי סגל התואמים ל״${esc(state.q)}״${state.area?` בתחום ${esc(AREA[state.area])}`:\'\'}. נסו מונח רחב יותר או בחרו ״הכול״.</p>`'],
  [`\${a.length+e.length} \${a.length+e.length===1?'person':'people'}`, `\${a.length+e.length===1?'איש אחד':\`\${a.length+e.length} אנשים\`}`],
  ['<h2 class="dir-sub">Emeriti</h2>', '<h2 class="dir-sub">גמלאים</h2>'],
  [`p.emeritus&&(p.title==='Prof.'?'Professor Emeritus':'Emeritus')`, `p.emeritus&&(p.title==='Prof.'?'פרופסור אמריטוס':'אמריטוס')`],
  ['<dt>Office hours</dt>', '<dt>שעות קבלה</dt>'],
  ["Content reviewed: ${new Date(reviewed).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}", "התוכן נבדק: ${new Date(reviewed).toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'})}"],
  [/<span class="label">Research<\/span>/g, '<span class="label">מחקר</span>'],
  ['<h3>Key research areas</h3>', '<h3>תחומי מחקר מרכזיים</h3>'],
  ['<h3>Research approach</h3>', '<h3>גישת המחקר</h3>'],
  ['<h3>Where graduates go</h3>', '<h3>לאן הבוגרים ממשיכים</h3>'],
  [`'Research interests'`, `'תחומי עניין במחקר'`],
  [`A full research profile hasn't been published yet.\${p.links.length?' See the links alongside for publications and current work.':''}`,
   `פרופיל מחקר מלא עדיין לא פורסם.\${p.links.length?' בקישורים שבצד תמצאו פרסומים ועבודה נוכחית.':''}`],
  ['<h3>Biography</h3>', '<h3>קורות חיים</h3>'],
  ['<h3>Colleagues in related areas</h3>', '<h3>עמיתים בתחומים קרובים</h3>'],
  [`aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/faculty">Faculty</a>`, `aria-label="פירורי לחם"><a href="#/">דף הבית</a><span>/</span><a href="#/faculty">סגל אקדמי</a>`],
  ['<dt>Email</dt><dd><a href=', '<dt>דוא״ל</dt><dd><a dir="ltr" href='],
  ['<dt>Phone</dt><dd style="font-variant-numeric:tabular-nums">', '<dt>טלפון</dt><dd dir="ltr" style="font-variant-numeric:tabular-nums;text-align:right">'],
  ['<dt>Office</dt>', '<dt>משרד</dt>'],
  ['aria-label="More faculty"><a href="#/faculty/${prev.slug}"><span>← Previous</span>', 'aria-label="עוד חברי סגל"><a href="#/faculty/${prev.slug}"><span>→ הקודם</span>'],
  ['<span>Next →</span>', '<span>הבא ←</span>'],
  ['<span class="label">On this page</span>', '<span class="label">בדף הזה</span>'],
  [`h1.textContent:'Page'`, `h1.textContent:'דף'`],
  ['document.title=`Faculty · ${SITE}`', 'document.title=`סגל אקדמי · ${SITE}`'],
  [`btn.textContent=o?'Close':'Menu'`, `btn.textContent=o?'סגירה':'תפריט'`],
  [`btn.textContent='Menu'`, `btn.textContent='תפריט'`],
], 'script');
if (/>[^<>{}]*\b(Home|People|Faculty|Research|Email|Phone|Office|Previous|Next)\b[^<>{}]*</.test(script)) throw new Error('script: English UI text left');

/* ---------- body ---------- */
const svg = lines.slice(iSvg, iSvgEnd + 1).join('\n');
const photo = lines[iPhoto];
let content = read('home.html') + '\n\n' + read('tpl-study.html') + '\n' + read('tpl-research.html') + '\n' + read('tpl-rest.html');
content = content.replace(/src="images\//g, 'src="../images/');
// Isolate Latin degree abbreviations in text so their periods don't flip to the wrong side in RTL.
content = content.replace(/>([^<]*)</g, (m, text) => '>' + text.replace(/(M\.Sc\.–Ph\.D\.|B\.Sc\.|M\.Sc\.|Ph\.D\.)/g, '<bdi>$1</bdi>') + '<');
const tplEn = [...en.matchAll(/<template id="([^"]+)"/g)].map(m => m[1]).sort().join();
const tplHe = [...content.matchAll(/<template id="([^"]+)"/g)].map(m => m[1]).sort().join();
if (tplEn !== tplHe) throw new Error(`template mismatch\n${tplEn}\n${tplHe}`);
const idsEn = [...en.matchAll(/ id="([^"]+)"/g)].map(m => m[1]).filter(i => i !== 'faculty-data').sort().join();
const idsHe = [...(content + script).matchAll(/ id="([^"]+)"/g)].map(m => m[1]).sort().join();
const svgIds = [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
const idsHeAll = [...idsHe.split(','), ...svgIds, 'photo-data'].sort().join();
if (idsEn !== idsHeAll) throw new Error(`id mismatch\n${idsEn}\n${idsHeAll}`);

const out = [head, rtlCss + '</style>', '</head>', '<body>', '', '', svg, content, '', `<script type="application/json" id="faculty-data">${json}</script>`, photo, script, '', '</body>', '</html>', ''].join('\n');
fs.mkdirSync(`${REPO}/he`, { recursive: true });
fs.writeFileSync(`${REPO}/he/index.html`, out);
console.log('wrote he/index.html', out.length, 'chars');
