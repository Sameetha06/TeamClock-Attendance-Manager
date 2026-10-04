window.onerror = (m, s, l) => { const e = document.getElementById("err"); e.style.display = "block"; e.textContent = "Error: " + m + " (line " + l + ")"; };

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LATE_AFTER = "09:30";
const COLORS = {Present:"var(--present)", Late:"var(--late)", Absent:"var(--absent)", Leave:"var(--leave)", "Not in":"var(--none)"};
const pad = n => String(n).padStart(2, "0");
const key = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const hhmm = d => pad(d.getHours()) + ":" + pad(d.getMinutes());
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
const initials = n => n.split(" ").map(w => w[0]).join("");
const toMin = t => { const p = t.split(":"); return +p[0] * 60 + +p[1]; };

function seed() {
  const emps = [["Aarav Mehta","Engineering"],["Diya Nair","Engineering"],["Rohan Iyer","Design"],["Sneha Rao","Design"],
    ["Kabir Shah","Sales"],["Meera Pillai","Sales"],["Vikram Joshi","HR"],["Ananya Das","Finance"]]
    .map((e, i) => ({id: i + 1, name: e[0], dept: e[1]}));
  const rec = {}; let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const f = t => pad(Math.floor(t / 60)) + ":" + pad(t % 60);
  for (let i = 1; i <= 45; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (isWeekend(d)) continue;
    rec[key(d)] = {};
    emps.forEach(e => {
      const x = rnd();
      if (x < .05) rec[key(d)][e.id] = {status: "Absent"};
      else if (x < .09) rec[key(d)][e.id] = {status: "Leave"};
      else {
        const late = x > .85;
        rec[key(d)][e.id] = {status: late ? "Late" : "Present", in: f(late ? 575 + Math.floor(rnd() * 45) : 520 + Math.floor(rnd() * 50)), out: f(1020 + Math.floor(rnd() * 70))};
      }
    });
  }
  return {emps: emps, rec: rec, next: 9};
}

let S;
try { S = JSON.parse(localStorage.getItem("teamclock")); } catch (e) { S = null; }
if (!S || !S.emps) S = seed();
let calDate = new Date(), editId = null;
const save = () => { try { localStorage.setItem("teamclock", JSON.stringify(S)); } catch (e) {} };

function todayRec() { const k = key(new Date()); if (!S.rec[k]) S.rec[k] = {}; return S.rec[k]; }
const statusOf = id => (todayRec()[id] || {status: "Not in"}).status;
function hours(r) {
  if (!r || !r.in || !r.out) return "–";
  const m = toMin(r.out) - toMin(r.in); return Math.floor(m / 60) + "h " + pad(m % 60) + "m";
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }

function checkIn(id) { const t = hhmm(new Date()); todayRec()[id] = {status: t > LATE_AFTER ? "Late" : "Present", in: t}; save(); render(); toast("Checked in at " + t); }
function checkOut(id) { const r = todayRec()[id]; r.out = hhmm(new Date()); save(); render(); toast("Checked out at " + r.out); }
function setStatus(id, s) { if (s) { todayRec()[id] = {status: s}; save(); render(); } }

function editRec(id) {
  editId = id; const r = todayRec()[id] || {status: "Present"}, e = S.emps.find(x => x.id === id);
  $("#dlgT").textContent = "Edit today · " + e.name;
  $("#eS").value = r.status === "Not in" ? "Present" : r.status; $("#eI").value = r.in || ""; $("#eO").value = r.out || "";
  $("#dlg").showModal();
}
$("#eC").onclick = () => $("#dlg").close();
$("#eV").onclick = () => {
  let s = $("#eS").value, i = $("#eI").value, o = $("#eO").value;
  if (s === "Absent" || s === "Leave") { i = o = ""; }
  else if (i) s = i > LATE_AFTER ? "Late" : "Present";
  const r = {status: s}; if (i) r.in = i; if (o) r.out = o;
  todayRec()[editId] = r; save(); $("#dlg").close(); render(); toast("Attendance updated");
};

$("#tabs").onclick = e => {
  const t = e.target.dataset.t; if (!t) return;
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  $$(".view").forEach(v => v.classList.toggle("on", v.id === t)); render();
};
function tick() {
  const n = new Date();
  $("#time").textContent = n.toLocaleTimeString("en-GB");
  $("#date").textContent = n.toLocaleDateString("en-IN", {weekday: "long", day: "numeric", month: "short"});
}
setInterval(tick, 1000); tick();
$("#theme").onclick = () => {
  const d = document.documentElement; d.dataset.theme = d.dataset.theme === "dark" ? "" : "dark";
  try { localStorage.setItem("tc-theme", d.dataset.theme); } catch (e) {} drawChart();
};
try { document.documentElement.dataset.theme = localStorage.getItem("tc-theme") || ""; } catch (e) {}

/* Dashboard */
function counts(date) {
  const c = {Present: 0, Late: 0, Absent: 0, Leave: 0, "Not in": 0};
  S.emps.forEach(e => c[((S.rec[date] || {})[e.id] || {status: "Not in"}).status]++);
  return c;
}
function countUp(el, to, suffix) {
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / 700, 1); el.textContent = Math.round(to * p) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
function streak(id) {
  let n = 0, d = new Date(), first = true;
  for (let i = 0; i < 60; i++, d.setDate(d.getDate() - 1)) {
    if (isWeekend(d)) continue;
    const r = (S.rec[key(d)] || {})[id];
    if (!r) { if (first) { first = false; continue; } break; }
    first = false;
    if (r.status === "Present") n++; else if (r.status === "Leave") continue; else break;
  }
  return n;
}
function renderDash() {
  const c = counts(key(new Date())), total = S.emps.length;
  const rate = total ? Math.round((c.Present + c.Late) / total * 100) : 0;
  const k = [["Attendance rate", rate, "%", "var(--acc)"], ["Present", c.Present, "", COLORS.Present], ["Late", c.Late, "", COLORS.Late],
    ["Absent", c.Absent, "", COLORS.Absent], ["On leave", c.Leave, "", COLORS.Leave], ["Not in yet", c["Not in"], "", "var(--mute)"]];
  $("#kpis").innerHTML = k.map(x => '<div class="kpi" style="--c:' + x[3] + '"><b data-to="' + x[1] + '" data-s="' + x[2] + '">0</b><span>' + x[0] + '</span></div>').join("");
  $$("#kpis b").forEach(b => countUp(b, +b.dataset.to, b.dataset.s));
  const depts = {};
  S.emps.forEach(e => { const d = depts[e.dept] || (depts[e.dept] = {n: 0, in: 0}); d.n++; if (statusOf(e.id) === "Present" || statusOf(e.id) === "Late") d.in++; });
  $("#depts").innerHTML = Object.keys(depts).map(n => { const d = depts[n];
    return '<div class="dept"><div><span>' + n + '</span><b>' + d.in + '/' + d.n + '</b></div><div class="meter"><i style="width:' + d.in / d.n * 100 + '%"></i></div></div>'; }).join("") || "No employees yet.";
  const st = S.emps.map(e => ({e: e, n: streak(e.id)})).sort((a, b) => b.n - a.n).slice(0, 6);
  $("#streaks").innerHTML = st.map((x, i) => '<div class="streak"><div class="av" style="--c:hsl(' + hue(x.e.name) + ' 55% 48%)">' + initials(x.e.name) + '</div><span>' + (i === 0 ? "🏆 " : "") + x.e.name + '</span><b>' + x.n + '</b></div>').join("");
  drawChart();
}
function drawChart() {
  const cv = $("#chart"), g = cv.getContext("2d"), W = cv.width, H = cv.height, css = getComputedStyle(document.documentElement);
  g.clearRect(0, 0, W, H);
  const days = []; for (let d = new Date(); days.length < 7; d.setDate(d.getDate() - 1)) if (!isWeekend(d)) days.unshift(new Date(d));
  const bw = W / days.length;
  days.forEach((d, i) => {
    const c = counts(key(d)), n = S.emps.length || 1; let y = H - 34;
    [["Present", c.Present], ["Late", c.Late]].forEach(a => {
      const h = a[1] / n * (H - 70); g.fillStyle = css.getPropertyValue("--" + a[0].toLowerCase()); g.fillRect(i * bw + bw * .22, y - h, bw * .56, h); y -= h;
    });
    g.fillStyle = css.getPropertyValue("--mute"); g.font = "13px sans-serif"; g.textAlign = "center";
    g.fillText(d.toLocaleDateString("en", {weekday: "short"}) + " " + d.getDate(), i * bw + bw / 2, H - 12);
    g.fillStyle = css.getPropertyValue("--ink"); g.fillText(c.Present + c.Late, i * bw + bw / 2, y - 6);
  });
}

/* Today board */
function renderToday() {
  const q = $("#q").value.toLowerCase(), f = $("#f").value;
  const rows = S.emps.filter(e => (e.name + e.dept).toLowerCase().includes(q) && (!f || statusOf(e.id) === f));
  $("#rows").innerHTML = rows.map(e => {
    const r = todayRec()[e.id] || {status: "Not in"}, s = r.status;
    const btn = !r.in ? '<button class="sm" onclick="checkIn(' + e.id + ')">Check in</button>'
      : !r.out ? '<button class="sm out" onclick="checkOut(' + e.id + ')">Check out</button>' : "";
    return '<tr><td><div class="who"><div class="av" style="--c:hsl(' + hue(e.name) + ' 55% 48%)">' + initials(e.name) + '</div><div>' + e.name + '<small>' + e.dept + '</small></div></div></td>' +
      '<td><span class="pill" style="--c:' + COLORS[s] + '">' + s + '</span></td><td>' + (r.in || "–") + '</td><td>' + (r.out || "–") + '</td><td>' + hours(r) + '</td>' +
      '<td><div class="acts">' + btn + '<button class="sm ghost" onclick="editRec(' + e.id + ')">Edit</button><select onchange="setStatus(' + e.id + ',this.value)"><option value="">Mark…</option><option>Leave</option><option>Absent</option></select></div></td></tr>';
  }).join("") || '<tr><td colspan="6">No matching employees.</td></tr>';
}
$("#q").oninput = renderToday; $("#f").onchange = renderToday;
$("#allIn").onclick = () => { S.emps.forEach(e => { if (statusOf(e.id) === "Not in") { const t = hhmm(new Date()); todayRec()[e.id] = {status: t > LATE_AFTER ? "Late" : "Present", in: t}; } }); save(); render(); toast("Everyone checked in"); };

/* Calendar */
function renderCal() {
  const sel = $("#who"), keep = sel.value;
  sel.innerHTML = S.emps.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join(""); if (keep) sel.value = keep;
  const id = sel.value, y = calDate.getFullYear(), m = calDate.getMonth();
  $("#month").textContent = calDate.toLocaleDateString("en", {month: "long", year: "numeric"});
  let html = ["M", "T", "W", "T", "F", "S", "S"].map(d => "<i>" + d + "</i>").join("");
  const first = (new Date(y, m, 1).getDay() + 6) % 7; for (let i = 0; i < first; i++) html += "<span></span>";
  const tally = {Present: 0, Late: 0, Absent: 0, Leave: 0}; let mins = 0, worked = 0;
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const dt = new Date(y, m, d), r = (S.rec[key(dt)] || {})[id], off = isWeekend(dt);
    if (r) { tally[r.status]++; if (r.in && r.out) { mins += toMin(r.out) - toMin(r.in); worked++; } }
    html += '<div class="cell ' + (off ? "off" : "") + ' ' + (key(dt) === key(new Date()) ? "today" : "") + '" ' + (r && !off ? 'style="--c:' + COLORS[r.status] + '" title="' + r.status + '"' : "") + '>' + d + (r && r.in ? "<em>" + r.in + "</em>" : "") + "</div>";
  }
  $("#grid").innerHTML = html;
  const done = tally.Present + tally.Late, avg = worked ? mins / worked : 0;
  $("#sum").innerHTML = Object.keys(tally).map(k => '<div class="row"><span>' + k + '</span><b>' + tally[k] + '</b></div>').join("") +
    '<div class="row"><span>Punctuality</span><b>' + (done ? Math.round(tally.Present / done * 100) : 0) + '%</b></div>' +
    '<div class="row"><span>Avg. daily hours</span><b>' + Math.floor(avg / 60) + 'h ' + pad(Math.round(avg % 60)) + 'm</b></div>';
  $("#legend").innerHTML = Object.keys(tally).map(k => '<span style="--c:' + COLORS[k] + '">' + k + '</span>').join("");
}
$("#who").onchange = renderCal;
$("#prev").onclick = () => { calDate.setMonth(calDate.getMonth() - 1); renderCal(); };
$("#next").onclick = () => { calDate.setMonth(calDate.getMonth() + 1); renderCal(); };

/* Team */
function rate30(id) {
  let p = 0, n = 0, d = new Date();
  for (let i = 0; i < 30; i++, d.setDate(d.getDate() - 1)) {
    const r = (S.rec[key(d)] || {})[id]; if (!r || r.status === "Leave") continue;
    n++; if (r.status === "Present" || r.status === "Late") p++;
  }
  return n ? Math.round(p / n * 100) : 0;
}
function renderTeam() {
  $("#dl").innerHTML = [...new Set(S.emps.map(e => e.dept))].map(d => '<option value="' + d + '">').join("");
  $("#people").innerHTML = S.emps.map(e => { const r = rate30(e.id);
    return '<div class="person"><div class="top"><div class="who"><div class="av" style="--c:hsl(' + hue(e.name) + ' 55% 48%)">' + initials(e.name) + '</div><div>' + e.name + '<small>' + e.dept + '</small></div></div>' +
      '<button class="sm del" onclick="removeEmp(' + e.id + ')">Remove</button></div>' +
      '<div class="dept"><div><span>30-day attendance</span><b>' + r + '%</b></div><div class="meter"><i style="width:' + r + '%"></i></div></div></div>'; }).join("");
}
$("#add").onclick = () => {
  const n = $("#nm").value.trim(), d = $("#dp").value.trim();
  if (!n || !d) return toast("Enter both a name and a department");
  S.emps.push({id: S.next++, name: n, dept: d}); $("#nm").value = ""; $("#dp").value = ""; save(); render(); toast(n + " added");
};
function removeEmp(id) { if (confirm("Remove this employee?")) { S.emps = S.emps.filter(e => e.id !== id); save(); render(); } }

/* Export */
$("#export").onclick = () => {
  const lines = ["Date,Employee,Department,Status,Check in,Check out,Hours"];
  Object.keys(S.rec).sort().forEach(d => S.emps.forEach(e => {
    const r = S.rec[d][e.id]; if (r) lines.push([d, e.name, e.dept, r.status, r.in || "", r.out || "", hours(r).replace("–", "")].join(","));
  }));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], {type: "text/csv"}));
  a.download = "attendance.csv"; a.click(); toast("CSV downloaded");
};

function render() { renderDash(); renderToday(); renderCal(); renderTeam(); }
render();