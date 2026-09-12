// Vykresleni obrazovek. Texty vychazeji z data/screens/*.json (SCREENS_DATA), s upravami dle
// rozhodnuti ve spec kap.4 (zkraceni casu, vypusteni pravitka atd.) - upravy jsou okomentovane.
// Rozvrzeni odpovida originalu: levy panel = zadani, pravy panel = obrazek webove stranky,
// na kterem je umisteny interaktivni obsah.

// Mezera uvnitr cisla (1 100) se nahrazuje pevnou mezerou, aby se cislo nelamalo na konci radku
function fixNumbers(text) {
  return String(text).replace(/(\d) (?=\d)/g, "$1 ");
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = fixNumbers(text);
  return e;
}

function para(text) { return el("p", null, text); }

// Text s tucne zvyraznenymi slovy: richText(["bezny ", {b: "tucne"}, " dal"])
function richText(parts) {
  const frag = document.createDocumentFragment();
  (Array.isArray(parts) ? parts : [parts]).forEach(function (part) {
    frag.appendChild(typeof part === "string" ? document.createTextNode(fixNumbers(part)) : el("strong", null, part.b));
  });
  return frag;
}

// Odstavec s pismenem ulohy (A. / B.) ve stylu originalu
function question(letter, text) {
  const p = el("p", "question-line");
  p.appendChild(el("span", "option-letter", letter + "."));
  const body = el("span");
  body.appendChild(richText(text));
  p.appendChild(body);
  return p;
}

const TASK_CODES = ["M71A01", "M71A02", "M71A03", "M71A04", "M71A05", "M71A06", "M71A07"];
// Konec pokynu je soucasti ukazatele postupu Pokynu (posledni policko).
const DIR_CODES = ["G4_DIR_01", "G4_DIR_02", "G4_DIR_03", "G4_DIR_04", "G4_DIR_05", "G4_DIR_08", "DIR_END_G4"];
const TAB_LABELS = ["Obrázek", "Výška", "Hmotnost", "Počet", "Potrava", "Příspěvek"];
const TAB_CODES = ["M71A02", "M71A03", "M71A04", "M71A05", "M71A06", "M71A07"];

// ---------- Hlavni vykresleni ----------

function renderScreen() {
  const def = currentScreenDef();
  const data = findScreenData(def.code);
  const container = document.getElementById("screen-container");
  container.innerHTML = "";

  // Konec pokynu ma v originale ramec testu, konec testu a obrazovky s heslem ne.
  const framed = def.kind === "directions" || def.kind === "task_screen" || def.code === "DIR_END_G4";
  document.getElementById("test-frame").classList.toggle("plain", !framed);

  logTrackEvent("SCREEN_LOADED", {
    loadedScreenSequence: AppState.screenIndex,
    loadedScreenId: def.code,
  });
  AppState.visited[def.code] = true;

  switch (def.kind) {
    case "login": renderLogin(container); break;
    case "password_gate": renderPasswordGate(container, def); break;
    case "directions": renderDirections(container, data); break;
    case "info": renderInfo(container, data, def); break;
    case "task_screen": renderTaskScreen(container, data); break;
    case "logoff": renderLogoff(container); break;
  }

  updateFrame(def);
  runPendingInits();
}

// ---------- Ramec: cislo ulohy, kod obrazovky, navigacni policka, pocitadlo ----------

// Policka postupu v leve liste: behem Pokynu i behem ulohy (pocitadlo v paticce jen u ulohy).
function sectionFor(code) {
  if (TASK_CODES.indexOf(code) >= 0) return TASK_CODES;
  if (DIR_CODES.indexOf(code) >= 0) return DIR_CODES;
  return null;
}

// Zak se muze vratit na jakoukoli jiz zhlednutou obrazovku, ale vpred jen o jednu novou.
function canNavigateTo(code) {
  if (AppState.visited[code]) return true;
  const idx = SCREEN_ORDER.findIndex(function (s) { return s.code === code; });
  return idx === AppState.maxReachedIndex + 1;
}

function hasResponse(code) {
  const def = SCREEN_ORDER.find(function (s) { return s.code === code; });
  if (!def || !def.responses) return false;
  return def.responses.some(function (id) {
    const v = AppState.responses[id];
    return v !== undefined && v !== null && v !== "";
  });
}

function updateFrame(def) {
  const section = sectionFor(def.code);
  const itemId = document.getElementById("item-id");
  const numberHolder = document.getElementById("item-number-holder");
  const chips = document.getElementById("nav-chips");
  const footerText = document.getElementById("footer-text");

  chips.innerHTML = "";
  itemId.textContent = def.code === "LOGIN" ? "" : def.code;

  if (!section) {
    numberHolder.style.display = "none";
    document.getElementById("item-number").textContent = "";
    footerText.textContent = "";
    return;
  }

  // Behem Pokynu ma kolecko zustat prazdne a paticka bez pocitadla (jako v originale).
  const isTask = section === TASK_CODES;
  const position = section.indexOf(def.code);
  document.getElementById("item-number").textContent = isTask ? String(position + 1) : "";
  numberHolder.style.display = "flex";
  footerText.textContent = isTask ? (position + 1) + "/" + section.length : "";

  section.forEach(function (code, idx) {
    const chip = el("div", "chip", String(idx + 1));
    if (code === def.code) chip.classList.add("current");
    else if (AppState.visited[code]) chip.classList.add(hasResponse(code) ? "answered" : "unanswered");
    if (canNavigateTo(code)) chip.addEventListener("click", function () { goToScreenByCode(code); });
    else chip.classList.add("locked");
    chips.appendChild(chip);
  });
}

// ---------- Navigace ----------

function goToIndex(newIndex, navTrackId) {
  const fromDef = currentScreenDef();
  const toDef = getScreenDef(newIndex);
  if (navTrackId) {
    logTrackEvent(navTrackId, {
      departureScreenSequence: AppState.screenIndex,
      destinationScreenSequence: newIndex,
      departureScreenId: fromDef.code,
      destinationScreenId: toDef.code,
    });
  }
  AppState.screenIndex = newIndex;
  AppState.maxReachedIndex = Math.max(AppState.maxReachedIndex, newIndex);
  renderScreen();
}

function goNext() {
  if (AppState.screenIndex >= SCREEN_ORDER.length - 1) return;
  goToIndex(AppState.screenIndex + 1, "NAV_NEXT");
}

function goBack() {
  if (AppState.screenIndex <= 0) return;
  goToIndex(AppState.screenIndex - 1, "NAV_BACK");
}

function goToScreenByCode(code) {
  const idx = SCREEN_ORDER.findIndex(function (s) { return s.code === code; });
  if (idx >= 0 && idx !== AppState.screenIndex && canNavigateTo(code)) goToIndex(idx, "NAV_PROG");
}

// ---------- 1) Prihlaseni (podle nahledu originalu: jen ikony, zadny text) ----------

function renderLogin(container) {
  const box = el("div", "login-box");
  const logo = el("div", "login-logo");
  const logoImg = document.createElement("img");
  logoImg.src = imgPath("media/images/ui/timss-logo-new.png");
  logo.appendChild(logoImg);
  box.appendChild(logo);

  const form = el("div", "login-form");
  const idRow = el("div", "login-row");
  idRow.appendChild(el("span", "login-icon", "\u{1F464}"));
  const idInput = document.createElement("input");
  idInput.type = "text";
  idInput.maxLength = 8;
  idInput.className = "login-input";
  idRow.appendChild(idInput);
  form.appendChild(idRow);

  const pwRow = el("div", "login-row");
  pwRow.appendChild(el("span", "login-icon", "\u{1F512}"));
  const pwInput = document.createElement("input");
  pwInput.type = "password";
  pwInput.maxLength = 6;
  pwInput.className = "login-input";
  pwRow.appendChild(pwInput);
  form.appendChild(pwRow);

  const err = el("div", "login-error");
  form.appendChild(err);

  const btn = el("button", "login-arrow");
  btn.addEventListener("click", function () {
    const idVal = idInput.value.trim();
    const pwVal = pwInput.value.trim();
    // Format podle originalu (login.js): 8 cislic + 5 alfanumerickych znaku, volitelne s *.
    // Skutecne overeni proti uloziste je krok 6 planu.
    if (!/^\d{8}$/.test(idVal) || !/^[a-zA-Z0-9]{5}\*?$/.test(pwVal)) {
      err.textContent = "Neplatné ID nebo heslo.";
      return;
    }
    AppState.studentId = idVal;
    goToIndex(AppState.screenIndex + 1);
  });
  form.appendChild(btn);
  box.appendChild(form);
  container.appendChild(box);
}

// ---------- 2) Heslo od zadavatele (DIR_START_G4, PT2_START_G4) ----------

function renderPasswordGate(container, def) {
  const box = el("div", "password-box");

  const logo = el("div", "password-logo");
  const logoImg = document.createElement("img");
  logoImg.src = imgPath("media/images/ui/timss-logo-new.png");
  logo.appendChild(logoImg);
  box.appendChild(logo);

  const intro = el("div", "intro-text");
  const content = el("div", "intro-content");
  content.appendChild(el("div", "intro-img"));
  const textContent = el("div", "intro-text-content");

  if (def.code === "DIR_START_G4") {
    intro.appendChild(el("div", "intro-header", "POKYNY"));
    textContent.appendChild(el("div", "header2", "Ahoj"));
    textContent.appendChild(para("Prosím počkej, až ti zadavatel testu dá heslo."));
  } else {
    // Uprava dle spec kap.6.1: bez "Casti 2", cas 18 minut misto 36.
    intro.appendChild(el("div", "intro-header", "ZAČÁTEK TESTU"));
    textContent.appendChild(para("Na vypracování úlohy Tučňáci nejmenší budeš mít 18 minut."));
    textContent.appendChild(para("Prosím počkej, až ti zadavatel testu dá heslo."));
  }

  content.appendChild(textContent);
  intro.appendChild(content);
  box.appendChild(intro);

  const pwContent = el("div", "password-content");
  pwContent.appendChild(el("div", "password-label", "Heslo:"));
  const row = el("div", "password-row");
  row.appendChild(el("span", "lock-icon", "\u{1F512}"));
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 4;
  input.className = "password-input";
  row.appendChild(input);
  pwContent.appendChild(row);

  const actions = el("div", "password-actions");
  const startBtn = el("button", "orange-btn", "Začít →");
  let incorrectAttempts = 0;
  startBtn.addEventListener("click", function () {
    if (input.value === GATE_PASSWORD) {
      logTrackEvent(def.passwordEvent, {
        "Booklet Part": def.bookletPart,
        "login success": true,
        "incorrect attempts": incorrectAttempts,
      });
      if (def.startsTimer) startTimer();
      goToIndex(AppState.screenIndex + 1);
    } else {
      incorrectAttempts++;
      logTrackEvent("POPUP_PW_INCORRECT_OPEN");
      showModal("Heslo není správně. Zkus to prosím znovu.", "OK", function () {
        logTrackEvent("POPUP_PW_INCORRECT_CLOSE");
      });
    }
  });
  actions.appendChild(startBtn);
  pwContent.appendChild(actions);
  box.appendChild(pwContent);
  container.appendChild(box);
}

// ---------- 3) Pokyny (zuzene dle spec kap.4) ----------

// Postavicky z originalu (Media/images/27557) - provazeji zaka Pokyny.
const MASCOTS = {
  wave: "media/images/pokyny/27557/Wave-200px-right.png",
  kneelRight: "media/images/pokyny/27557/Kneeling-100px-right.png",
  kneelLeft: "media/images/pokyny/27557/Kneeling-100px-left.png",
  pointLeft: "media/images/pokyny/27557/Pointing100px-left.png",
  pointRight: "media/images/pokyny/27557/Pointing-100px-right.png",
  think: "media/images/pokyny/27557/To-Be-or...-100px-left.png",
  walk: "media/images/pokyny/27557/Disco-100px-left_Disco 100px right.png",
  happy: "media/images/pokyny/27557/Happy-fella-100px-left.png",
};

function mascot(key, height) {
  const holder = el("div", "mascot");
  const img = document.createElement("img");
  img.src = imgPath(MASCOTS[key]);
  if (height) img.style.height = height + "px";
  holder.appendChild(img);
  return holder;
}

function arrowImg() {
  const img = document.createElement("img");
  img.src = imgPath("media/images/ui/next-arrow.png");
  img.className = "inline-arrow";
  img.alt = "šipka vpřed";
  return img;
}

// Odstavec s vlozenym obrazkem sipky: "Kliknutim na [sipka] prejdes dal."
function lineWithArrow(before, after) {
  const p = el("p");
  p.appendChild(document.createTextNode(before));
  p.appendChild(arrowImg());
  p.appendChild(document.createTextNode(after));
  return p;
}

function hintRow(mascotKey, lines, opts) {
  opts = opts || {};
  const row = el("div", "hint-row" + (opts.align ? " " + opts.align : ""));
  if (mascotKey && !opts.mascotRight) row.appendChild(mascot(mascotKey, opts.mascotHeight));
  const box = el("div", "hint-box" + (opts.cream ? " cream" : ""));
  lines.forEach(function (line) {
    box.appendChild(typeof line === "string" ? para(line) : line);
  });
  row.appendChild(box);
  if (mascotKey && opts.mascotRight) row.appendChild(mascot(mascotKey, opts.mascotHeight));
  return row;
}

function sectionTitle(text) {
  return el("div", "dir-section-title", text);
}

// Cviceni vlevo + radu s postavickou vpravo (rozvrzeni jako v originale)
function practiceRow(leftContent, hintRowEl) {
  const row = el("div", "practice-row");
  const leftCol = el("div", "practice-left");
  leftContent.forEach(function (node) { leftCol.appendChild(node); });
  row.appendChild(leftCol);
  row.appendChild(hintRowEl);
  return row;
}

function renderDirections(container, data) {
  const box = el("div", "directions-box");
  const code = data.screen_code;

  if (code === "G4_DIR_01") {
    const welcome = el("div", "hint-title", "Vítej v testu TIMSS!");
    box.appendChild(hintRow("wave", [
      welcome,
      // Uprava dle spec kap.4: text jen o matematice (puvodne i o prirodovede).
      para("V testu budeš odpovídat na otázky z matematiky."),
      el("p", "bold-line", "Je důležité, aby ses snažil/a zodpovědět všechny otázky co nejlépe."),
    ], { mascotHeight: 170 }));
    box.appendChild(hintRow("kneelRight", [
      para("Mezi otázkami můžeš přecházet kliknutím na šipky dole na obrazovce."),
      lineWithArrow("Kliknutím na ", " přejdeš na další obrazovku."),
    ], { cream: true, align: "right" }));
  } else if (code === "G4_DIR_02") {
    // Uprava dle spec kap.4: bez pravitka, cas 18 minut misto 36+36.
    box.appendChild(el("h2", null, "Hodiny a ukazatel postupu"));
    const clockSample = el("p");
    clockSample.appendChild(document.createTextNode("Hodiny v levé horní části obrazovky ti budou ukazovat, kolik času ti zbývá, jako tyto:"));
    const clock = el("div", "g-timer clock-sample", "17:56");
    box.appendChild(hintRow("pointLeft", [
      para("Na vypracování úlohy Tučňáci budeš mít 18 minut."),
      clockSample,
      clock,
    ]));

    const swatchLine = function (text, cls) {
      const p = el("p", "swatch-line");
      p.appendChild(el("span", null, text));
      p.appendChild(el("span", "chip-swatch " + cls));
      return p;
    };
    box.appendChild(hintRow("pointLeft", [
      para("Na levé straně obrazovky je ukazatel postupu s políčky pro všechny otázky."),
      swatchLine("Dokud jsi na otázce, je její políčko zelené.", "current"),
      swatchLine("Když na otázku odpovíš, políčko této otázky zmodrá.", "answered"),
      swatchLine("Pokud na otázku neodpovíš, políčko otázky zůstane šedé.", "unanswered"),
    ]));
  } else if (code === "G4_DIR_03") {
    box.appendChild(el("h2", null, "Vyber svou odpověď"));
    box.appendChild(el("p", "dir-intro", "Pokud si svou odpovědí nejsi jistý/jistá, vyber tu, o které si myslíš, že je nejlepší."));

    box.appendChild(sectionTitle("Vyber jednu odpověď"));
    box.appendChild(practiceRow([
      para("Kolik minut má hodina?"),
      createSingleChoice("G4_DIR_03A", [
        { id: "G4_DIR_03A__1", label: "12" },
        { id: "G4_DIR_03A__2", label: "24" },
        { id: "G4_DIR_03A__3", label: "60" },
        { id: "G4_DIR_03A__4", label: "120" },
      ]),
    ], hintRow("think", ["U otázek jako tato klikni na kolečko vedle odpovědi, kterou považuješ za správnou."])));

    // Uprava dle spec kap.4: cviceni s rozbalovaci nabidkou vypusteno (v uloze se nepouziva).
    box.appendChild(sectionTitle("Vyber všechny správné odpovědi"));
    const animalsQuestion = el("p");
    animalsQuestion.appendChild(document.createTextNode("Klikni na "));
    animalsQuestion.appendChild(el("strong", null, "všechna"));
    animalsQuestion.appendChild(document.createTextNode(" zvířata, která mají čtyři nohy."));
    box.appendChild(practiceRow([
      animalsQuestion,
      // Souradnice oblasti prevzaty z mapy v originalnim HTML (obrazek 480x67).
      createHotspotMultiSelect("G4_DIR_03C",
        imgPath("media/images/pokyny/27557/Snake_bird_camel_snail_deer_bluebox.png"), [
          { id: "G4_DIR_03C__1", coords: [7, 7, 85, 61] },
          { id: "G4_DIR_03C__2", coords: [104, 7, 182, 61] },
          { id: "G4_DIR_03C__3", coords: [201, 7, 279, 61] },
          { id: "G4_DIR_03C__4", coords: [299, 7, 377, 61] },
          { id: "G4_DIR_03C__5", coords: [397, 7, 475, 61] },
        ]),
    ], hintRow("think", [
      para("Zde potřebuješ vybrat více než jednu odpověď."),
      para("Procvič si výběr kliknutím na všechny odpovědi, které považuješ za správné."),
    ])));
  } else if (code === "G4_DIR_04") {
    box.appendChild(el("h2", null, "Přetáhni svou odpověď"));
    box.appendChild(el("p", "dir-intro", "Někdy odpovíš tak, že slova, čísla nebo obrázky přetáhneš."));
    box.appendChild(practiceRow([
      createDragToBoxes("G4_DIR_04",
        [{ id: "_1", label: "1" }, { id: "_2", label: "2" }, { id: "_3", label: "3" }],
        [{ id: "G4_DIR_04A" }, { id: "G4_DIR_04B" }, { id: "G4_DIR_04C" }]),
    ], hintRow("think", [
      para("Klikni na číslo, přidrž ho, přetáhni do rámečku a pusť."),
      para("Procvič si přetažení všech čísel do spodních rámečků."),
    ])));
  } else if (code === "G4_DIR_05") {
    box.appendChild(el("h2", null, "Číselná klávesnice"));
    box.appendChild(el("p", "dir-intro", "U otázek, kde odpověď tvoří číslo, budeš používat číselnou klávesnici."));
    // Postavicka vlevo, ukazka klavesnice s popisky u klaves vpravo (jako v originale)
    const demoRow = el("div", "keypad-demo-row");
    demoRow.appendChild(mascot("happy", 120));
    demoRow.appendChild(buildKeypadIllustration());
    box.appendChild(demoRow);

    box.appendChild(sectionTitle("Použij číselnou klávesnici"));
    // Uprava dle spec kap.4: cviceni s celym cislem misto zlomku.
    const answerRow = el("p", "answer-row");
    answerRow.appendChild(document.createTextNode("Odpověď: "));
    answerRow.appendChild(createNumberField("G4_DIR_05", ""));
    box.appendChild(practiceRow([
      para("Napiš číslo 5."),
      answerRow,
      el("div", "section-end-line"),
    ], hintRow("think", [
      para("Klikni do políčka pro odpověď a procvič si používání číselné klávesnice."),
      para("Číselnou klávesnici můžeš libovolně přesouvat po obrazovce tak, že klikneš na její horní lištu a přetáhneš ji."),
    ])));
  } else if (code === "G4_DIR_08") {
    box.appendChild(el("h2", null, "Tipy"));
    box.appendChild(el("p", "dir-intro", "Na začátek se ti mohou hodit dvě rady."));
    box.appendChild(hintRow("happy", [
      el("div", "hint-title", "Zedy"),
      para("V úlohách, kde se používají peníze, je speciální měna zed."),
    ]));
    box.appendChild(hintRow("walk", [
      el("div", "hint-title", "Posouvání obrazovky"),
      para("Nezapomeň, že možná budeš potřebovat posunout obrazovku, aby se ti zobrazila celá otázka."),
    ], { align: "right", mascotRight: true }));
    box.appendChild(hintRow("kneelRight", [
      lineWithArrow("Klikni na ", " a přejdi na další stránku."),
    ], { align: "center" }));
  }

  container.appendChild(box);
}

// ---------- 4) Info obrazovky ----------

// Odstavec s tucne zvyraznenou casti (v originale je zvyraznene slovo cerne, zbytek oranzovy)
function textWithBold(before, boldText, after) {
  const p = el("p");
  if (before) p.appendChild(document.createTextNode(before));
  p.appendChild(el("strong", null, boldText));
  if (after) p.appendChild(document.createTextNode(after));
  return p;
}

function renderInfo(container, data, def) {
  const wrap = el("div", "info-wrap");
  const box = el("div", "info-box");
  if (data.screen_code === "DIR_END_G4") {
    box.appendChild(textWithBold("Dokončil/a jsi ", "Pokyny.", ""));
    box.appendChild(textWithBold("Pro pokračování klikni na tlačítko ", "Další", "."));
  } else {
    // Uprava dle spec kap.6.1: bez "Casti 2" - projekt ma jen jednu ulohu.
    box.appendChild(textWithBold("Jsi na konci úlohy ", "Tučňáci nejmenší", "."));
    box.appendChild(para("Můžeš se vrátit k libovolné otázce, na kterou jsi neodpověděl/a."));
    box.appendChild(para("Také si můžeš své odpovědi na otázky překontrolovat."));
    box.appendChild(textWithBold("Pokud chceš skončit, klikni na tlačítko ", "Další", "."));
    if (def.stopsTimer) stopTimer();
  }
  wrap.appendChild(box);

  const actions = el("div", "info-actions");
  const nextBtn = el("button", "orange-btn", "Další →");
  nextBtn.addEventListener("click", goNext);
  actions.appendChild(nextBtn);
  wrap.appendChild(actions);
  container.appendChild(wrap);
}

// ---------- 5) Zaverecna obrazovka (vlastni navrh, viz 19_logoff.json) ----------

function renderLogoff(container) {
  const box = el("div", "logoff-box");
  box.appendChild(el("h2", null, "Děkujeme!"));
  box.appendChild(para("Dokončil/a jsi test Tučňáci nejmenší."));
  box.appendChild(para("Tvoje odpovědi jsme v pořádku uložili."));
  box.appendChild(para("Teď si prosím počkej na pokyny od zadavatele testu."));
  container.appendChild(box);
}

// ---------- 6) Ukolove obrazovky M71A01-M71A07 ----------

// Pravy panel = obrazek webove stranky z originalu (obsahuje prohlizec i barevne zalozky),
// texty a interakce se na nej pozicuji. Zalozky nejsou klikaci - stejne jako v originale.
function buildRightPanel(activeCode, bgImage, innerContent) {
  const panel = el("div", "right-panel");
  const side = el("div", "right-side");
  side.style.backgroundImage = "url('" + imgPath(bgImage) + "')";

  const url = el("div", "url");
  url.appendChild(para("https://www.IEA.eTIMSS.com/tucnaci"));
  side.appendChild(url);

  const title = el("div", "tab-main-title");
  const titleP = el("p");
  titleP.appendChild(el("strong", null, "Tučňák nejmenší"));
  title.appendChild(titleP);
  side.appendChild(title);

  const tabs = el("div", "tabs");
  TAB_LABELS.forEach(function (label, i) {
    const tab = el("div", "inner-tabs");
    if (TAB_CODES[i] === activeCode) tab.classList.add("active");
    tab.appendChild(el("p", null, label));
    tabs.appendChild(tab);
  });
  side.appendChild(tabs);

  const inner = el("div", "tab-inner-section");
  inner.appendChild(innerContent);
  side.appendChild(inner);

  panel.appendChild(side);
  return panel;
}

function renderTaskScreen(container, data) {
  const wrap = el("div", "task-screen");
  const left = el("div", "left-panel");
  wrap.appendChild(left);

  switch (data.screen_code) {
    case "M71A01": renderM71A01(left, wrap); break;
    case "M71A02": renderM71A02(left, wrap); break;
    case "M71A03": renderM71A03(left, wrap); break;
    case "M71A04": renderM71A04(left, wrap); break;
    case "M71A05": renderM71A05(left, wrap); break;
    case "M71A06": renderM71A06(left, wrap); break;
    case "M71A07": renderM71A07(left, wrap); break;
  }
  container.appendChild(wrap);
}

function renderM71A01(left, wrap) {
  left.appendChild(el("div", "psi-title", "Tučňák nejmenší"));
  left.appendChild(para("Tučňák nejmenší je nejmenší druh tučňáka."));
  left.appendChild(para("Tučňáci nejmenší žijí na ostrově blízko Austrálie."));
  left.appendChild(para("Budeš doplňovat informace o tučňácích nejmenších na webové stránky."));

  const p = el("p");
  p.appendChild(document.createTextNode("Klikni na "));
  const startBtn = el("button", "next-button-inline");
  startBtn.addEventListener("click", function () {
    logTrackEvent("M71A01_NEXT");
    goNext();
  });
  p.appendChild(startBtn);
  p.appendChild(document.createTextNode(" a začni."));
  left.appendChild(p);

  const right = el("div", "right-panel");
  const img = el("div", "m71a01-image");
  img.style.backgroundImage = "url('" + imgPath("media/images/littlepenguins/screen1_penguin.png") + "')";
  right.appendChild(img);
  wrap.appendChild(right);
}

function renderM71A02(left, wrap) {
  left.appendChild(el("div", "psi-title", "Obrázky"));
  left.appendChild(para("Zde je několik obrázků tučňáka nejmenšího."));
  left.appendChild(para("Který obrázek má největší obsah?"));
  left.appendChild(para("(Označ obrázek.)"));

  // Sirky obrazku podle originalu: v _littlePenguins.scss ma cela polozka 110/135/100/275 px
  // vcetne odsazeni pro popisky (18+19 px), samotna fotka je tedy o 37 px uzsi.
  const options = [
    { id: "MQ71A01__1", img: "Screen2_Selectable1.png", labelY: "6 cm", labelX: "4 cm", width: 73 },
    { id: "MQ71A01__2", img: "Screen2_Selectable2.png", labelY: "5 cm", labelX: "5 cm", width: 98 },
    { id: "MQ71A01__3", img: "Screen2_Selectable3.png", labelY: "7 cm", labelX: "3 cm", width: 63 },
    { id: "MQ71A01__4", img: "Screen2_Selectable4.png", labelY: "2 cm", labelX: "9 cm", width: 238 },
  ].map(function (o) {
    return {
      id: o.id,
      imgSrc: imgPath("media/images/littlepenguins/" + o.img),
      labelY: o.labelY, labelX: o.labelX, width: o.width,
    };
  });

  // Sirka nahledu na webove strance podle originalu (_littlePenguins.scss)
  const previewWidths = { MQ71A01__1: 125, MQ71A01__2: 125, MQ71A01__3: 90, MQ71A01__4: 285 };
  const inner = el("div", "M71A02_imgResponse");
  const previews = {};
  options.forEach(function (o) {
    const holder = el("div", "imgResponse");
    holder.style.width = previewWidths[o.id] + "px";
    const img = document.createElement("img");
    img.src = o.imgSrc;
    holder.appendChild(img);
    previews[o.id] = holder;
    inner.appendChild(holder);
  });

  left.appendChild(createHottext("MQ71A01_T", options, function (selectedId) {
    Object.keys(previews).forEach(function (id) {
      previews[id].classList.toggle("active", id === selectedId);
    });
  }));

  wrap.appendChild(buildRightPanel("M71A02", "media/images/littlepenguins/Screen2_Webpage.jpg", inner));
}

function renderM71A03(left, wrap) {
  left.appendChild(el("div", "psi-title", "Výška"));
  left.appendChild(para("Tučňáci nejmenší jsou nejmenším druhem tučňáků."));
  left.appendChild(para("Tučňáci císařští jsou největším druhem tučňáků."));
  left.appendChild(question("A", "Kolik měří každý tučňák?"));
  left.appendChild(question("B", ["O kolik ", { b: "vyšší" }, " je tučňák císařský než tučňák nejmenší?"]));

  const inner = el("div", "m71a03-inner");
  const top = el("div", "height-row");

  const leftLabel = el("div", "height-label");
  leftLabel.appendChild(para("Výška tučňáka císařského:"));
  const l1 = el("div", "height-field");
  l1.appendChild(createNumberField("MQ71A02A_T", "cm"));
  leftLabel.appendChild(l1);
  top.appendChild(leftLabel);

  // Cisla na pravitku jsou v originale samostatne texty nad obrazkem. Pozice odpovidaji
  // ryskam zmerenym primo v Screen3_Height.png (0 cm = 94,3 %, 50 = 64,7 %, 100 = 35 %,
  // 150 = 5,3 % vysky obrazku; pravitko je vodorovne na 59,8 %).
  const diagram = el("div", "height-img");
  [
    { text: "150", top: 5.3 }, { text: "cm", top: 11 },
    { text: "100", top: 35 }, { text: "50", top: 64.7 },
    { text: "cm", top: 88.5 }, { text: "0", top: 94.3 },
  ].forEach(function (mark) {
    const label = el("span", "ruler-label", mark.text);
    label.style.top = mark.top + "%";
    diagram.appendChild(label);
  });
  top.appendChild(diagram);

  const rightLabel = el("div", "height-label");
  rightLabel.appendChild(para("Výška tučňáka nejmenšího:"));
  const l2 = el("div", "height-field");
  l2.appendChild(createNumberField("MQ71A02B_T", "cm"));
  rightLabel.appendChild(l2);
  top.appendChild(rightLabel);

  inner.appendChild(top);

  const bottom = el("p", "height-sentence");
  bottom.appendChild(document.createTextNode("Tučňák císařský je o "));
  bottom.appendChild(createNumberField("MQ71A02C_T", ""));
  bottom.appendChild(document.createTextNode(" cm vyšší než tučňák nejmenší."));
  inner.appendChild(bottom);

  wrap.appendChild(buildRightPanel("M71A03", "media/images/littlepenguins/Screen3_Webpage.jpg", inner));
}

function renderM71A04(left, wrap) {
  // Sirky textu podle originalu (_littlePenguins.scss): uvod a otazka A 370 px, otazka B 332 px
  left.classList.add("m71a04-left");
  left.appendChild(el("div", "psi-title", "Hmotnost"));
  // Tucna slova podle originalniho HTML (nejsou / nejtezsiho / nejlehciho)
  const intro = el("p", "psi-text1");
  intro.appendChild(richText(["Hmotnosti tučňáků ", { b: "nejsou" }, " na této webové stránce seřazeny podle velikosti."]));
  left.appendChild(intro);

  const questionA = question("A", ["Přetáhni tučňáky a seřaď je od ", { b: "nejtěžšího" }, " po ", { b: "nejlehčího" }, "."]);
  questionA.classList.add("text-a");
  left.appendChild(questionA);

  const questionB = question("B", "Zdravý tučňák nejmenší váží více než 1 100 g. Kolik z těchto tučňáků je zdravých?");
  questionB.classList.add("text-b");
  left.appendChild(questionB);

  const inner = el("div", "m71a04-inner");
  const header = el("div", "sort-header");
  header.appendChild(el("span", null, "nejtěžší"));
  header.appendChild(el("span", null, "nejlehčí"));
  inner.appendChild(header);

  inner.appendChild(createSortable("MQ71A03A_T", [
    { id: "__1", label: "1 120 g" },
    { id: "__2", label: "1 308 g" },
    { id: "__3", label: "1 065 g" },
    { id: "__4", label: "987 g" },
    { id: "__5", label: "1 132 g" },
  ], ["MQ71A03AA", "MQ71A03AB", "MQ71A03AC", "MQ71A03AD", "MQ71A03AE"]));

  inner.appendChild(el("p", "healthy-note", "Zdravý tučňák nejmenší váží více než 1 100 g."));
  const numRow = el("p", "numpad-row");
  numRow.appendChild(document.createTextNode("Počet zdravých tučňáků: "));
  numRow.appendChild(createNumberField("MQ71A03B_T", ""));
  inner.appendChild(numRow);

  wrap.appendChild(buildRightPanel("M71A04", "media/images/littlepenguins/Screen4_Webpage.jpg", inner));
}

function renderM71A05(left, wrap) {
  left.classList.add("m71a05-left");
  left.appendChild(el("div", "psi-title", "Počet tučňáků"));
  left.appendChild(para("Tučňáci, kteří nejsou zdraví, mohou být chyceni dravci."));
  left.appendChild(question("A", "Minulý rok žilo 4 900 tučňáků. Letos jich zůstalo jen 4 350, protože ostatní chytili dravci."));

  // Pokyn k pretahovani je odsazeny pod otazkou A a obsahuje ikonu ukazatele (jako v originale)
  const dragLine = el("p", "drag-line");
  dragLine.appendChild(document.createTextNode("Přetáhni ukazatele "));
  const dragIcon = document.createElement("img");
  dragIcon.src = imgPath("media/images/littlepenguins/drag_icon.png");
  dragIcon.className = "drag-icon";
  dragIcon.alt = "ukazatel";
  dragLine.appendChild(dragIcon);
  dragLine.appendChild(document.createTextNode(" na správná místa na rybí číselné ose."));
  left.appendChild(dragLine);

  left.appendChild(question("B", "Kolik tučňáků chytili dravci od minulého roku?"));

  const inner = el("div", "m71a05-inner");
  inner.appendChild(el("div", "range-title", "Počet tučňáků nejmenších"));

  // Rybi osa je hotovy obrazek; hodnota 4 000 lezi na 9,25 % a 5 000 na 89,25 % jeho sirky
  // (zmereno podle dlouhych rysek v Screen5_Fish_Scale.png), rozsah posuvniku je 3950-5050.
  const axis = el("div", "fish-axis");
  axis.appendChild(createAxisSlider("MQ71A04AA_T", "top", ["4 900", "minulý rok"]));
  axis.appendChild(createAxisSlider("MQ71A04AB_T", "bottom", ["4 350", "letos"]));
  axis.appendChild(el("span", "scale-start", "4 000"));
  axis.appendChild(el("span", "scale-end", "5 000"));
  inner.appendChild(axis);

  const bottom = el("div", "m71a05-bottom");
  const answer = el("div", "m71a05-answer");
  answer.appendChild(para("Počet tučňáků, které chytili dravci:"));
  const numRow = el("p");
  numRow.appendChild(createNumberField("MQ71A04B_T", ""));
  answer.appendChild(numRow);
  bottom.appendChild(answer);

  const shark = document.createElement("img");
  shark.src = imgPath("media/images/littlepenguins/Screen5_Shark.png");
  shark.className = "shark-img";
  bottom.appendChild(shark);
  inner.appendChild(bottom);
  inner.appendChild(el("div", "healthy-caption", "Zdraví tučňáci přežijí!"));

  wrap.appendChild(buildRightPanel("M71A05", "media/images/littlepenguins/Screen5_Webpage.jpg", inner));
}

function renderM71A06(left, wrap) {
  left.classList.add("m71a06-left");   // sirka 370 px podle originalu
  left.appendChild(el("div", "psi-title", "Potrava"));
  left.appendChild(para("Zdravý tučňák sežere za rok:"));
  const list = el("ul", "psi-list");
  list.appendChild(el("li", null, "60 kg kostnatých ryb"));
  list.appendChild(el("li", null, "45 kg ostatních ryb"));
  left.appendChild(list);

  left.appendChild(question("A", "Který zápis vyjadřuje, kolik kg ryb sežere 4 350 zdravých tučňáků za jeden rok?"));
  left.appendChild(createSingleChoice("MQ71A05A_T", [
    { id: "MQ71A05A__1", label: "4 350 + 60 + 45" },
    { id: "MQ71A05A__2", label: "4 350 · 60 · 45" },
    { id: "MQ71A05A__3", label: "4 350 · (60 + 45)" },
    { id: "MQ71A05A__4", label: "4 350 + (60 · 45)" },
  ]));
  left.appendChild(question("B", "Doplň obrázky do tabulky tak, aby ukazovala množství ryb, které jeden zdravý tučňák sežere za jeden rok."));

  // Pokyn s ikonou symbolu ryb (jako v originale)
  const symbolLine = el("p", "symbol-line");
  symbolLine.appendChild(document.createTextNode("Přetáhni symboly "));
  const symbolIcon = document.createElement("img");
  symbolIcon.src = imgPath("media/images/littlepenguins/Screen6_Icon_in_sentence.png");
  symbolIcon.className = "symbol-icon";
  symbolIcon.alt = "symboly ryb";
  symbolLine.appendChild(symbolIcon);
  symbolLine.appendChild(document.createTextNode(" do tabulky a vytvoř tak obrázkový graf."));
  left.appendChild(symbolLine);

  const inner = el("div", "m71a06-inner");
  inner.appendChild(el("div", "psi-title", "Potrava, kterou sežere zdravý tučňák nejmenší"));

  const dropState = {};
  const table = el("table", "psi-table");
  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");
  hrow.appendChild(el("th", null, "Druh ryby"));
  hrow.appendChild(el("th", null, "Potrava na jeden rok"));
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  [["Kostnaté ryby", "(60 kg)", "kostnate"], ["Ostatní ryby", "(45 kg)", "ostatni"]].forEach(function (row) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.appendChild(el("div", null, row[0]));
    nameCell.appendChild(el("div", null, row[1]));
    tr.appendChild(nameCell);
    const td = el("td", "drop-cell");
    td.appendChild(createDropZone("MQ71A05B_T", row[2], dropState));
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tableRow = el("div", "table-with-tray");
  tableRow.appendChild(table);

  // Zdroj pretahovani je legenda vpravo od tabulky - preruseny ramecek se symbolem
  // a popiskem hodnoty, stejne jako v originale.
  const trayCol = el("div", "tray-col");
  [
    { id: "whole", img: "Screen6_WholeFish.png", label: "= 10 kg ryb" },
    { id: "half", img: "Screen6_HalfFish.png", label: "= 5 kg ryb" },
  ].forEach(function (item) {
    const row = el("div", "legend-item");
    row.appendChild(createDragSource(item.id, imgPath("media/images/littlepenguins/" + item.img)));
    row.appendChild(el("span", "legend-label", item.label));
    trayCol.appendChild(row);
  });
  tableRow.appendChild(trayCol);

  inner.appendChild(tableRow);
  wrap.appendChild(buildRightPanel("M71A06", "media/images/littlepenguins/Screen6_Webpage.jpg", inner));
}

function renderM71A07(left, wrap) {
  left.appendChild(el("div", "psi-title", "Příspěvek"));
  left.appendChild(para("Za příspěvek 8 zedů se nakoupí dostatek ryb na krmení jednoho tučňáka po celý měsíc."));
  left.appendChild(question("A", "Kolik stojí krmení pro 5 tučňáků za měsíc?"));
  left.appendChild(question("B", "Kolik tučňáků můžeš krmit celý měsíc za 200 zedů?"));

  const inner = el("div", "m71a07-inner");
  inner.appendChild(el("div", "psi-title", "Přispěj ještě dnes!"));

  const row1 = el("p", "feed");
  row1.appendChild(document.createTextNode("Krmení pro 5 tučňáků stojí "));
  row1.appendChild(createNumberField("MQ71A06A_T", ""));
  row1.appendChild(document.createTextNode(" zedů."));
  inner.appendChild(row1);

  const row2 = el("p", "feed");
  row2.appendChild(document.createTextNode("Nakrmím "));
  row2.appendChild(createNumberField("MQ71A06B_T", ""));
  row2.appendChild(document.createTextNode(" tučňáků za 200 zedů."));
  inner.appendChild(row2);

  const penguin = el("div", "penguins-img");
  penguin.style.backgroundImage = "url('" + imgPath("media/images/littlepenguins/screen7-penguin.png") + "')";
  penguin.appendChild(el("div", "penguins-img-text", "Ryby, ryby, ryby!"));
  inner.appendChild(penguin);

  wrap.appendChild(buildRightPanel("M71A07", "media/images/littlepenguins/Screen7_Webpage.jpg", inner));
}
