// Vykresleni obrazovek. Texty vychazeji z data/screens/*.json (SCREENS_DATA), s upravami dle
// rozhodnuti ve spec kap.4 (zkraceni casu, vypusteni pravitka atd.) - upravy jsou okomentovane.
// Rozvrzeni odpovida originalu: levy panel = zadani, pravy panel = obrazek webove stranky,
// na kterem je umisteny interaktivni obsah.

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

function para(text) { return el("p", null, text); }

// Odstavec s pismenem ulohy (A. / B.) ve stylu originalu
function question(letter, text) {
  const p = el("p", "question-line");
  p.appendChild(el("span", "option-letter", letter + "."));
  p.appendChild(el("span", null, text));
  return p;
}

const TASK_CODES = ["M71A01", "M71A02", "M71A03", "M71A04", "M71A05", "M71A06", "M71A07"];
const DIR_CODES = ["G4_DIR_01", "G4_DIR_02", "G4_DIR_03", "G4_DIR_04", "G4_DIR_05", "G4_DIR_08"];
const TAB_LABELS = ["Obrázek", "Výška", "Hmotnost", "Počet", "Potrava", "Příspěvek"];
const TAB_CODES = ["M71A02", "M71A03", "M71A04", "M71A05", "M71A06", "M71A07"];

// ---------- Hlavni vykresleni ----------

function renderScreen() {
  const def = currentScreenDef();
  const data = findScreenData(def.code);
  const container = document.getElementById("screen-container");
  container.innerHTML = "";

  const framed = def.kind === "directions" || def.kind === "task_screen";
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

function sectionFor(code) {
  if (TASK_CODES.indexOf(code) >= 0) return TASK_CODES;
  if (DIR_CODES.indexOf(code) >= 0) return DIR_CODES;
  return null;
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
  if (!section) {
    itemId.textContent = "";
    footerText.textContent = "";
    return;
  }

  const position = section.indexOf(def.code);
  itemId.textContent = def.code;
  document.getElementById("item-number").textContent = String(position + 1);
  numberHolder.style.display = "flex";
  footerText.textContent = (position + 1) + "/" + section.length;

  section.forEach(function (code, idx) {
    const chip = el("div", "chip", String(idx + 1));
    if (code === def.code) chip.classList.add("current");
    else if (AppState.visited[code]) chip.classList.add(hasResponse(code) ? "answered" : "unanswered");
    chip.addEventListener("click", function () { goToScreenByCode(code); });
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
  if (idx >= 0 && idx !== AppState.screenIndex) goToIndex(idx, "NAV_PROG");
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

  const panel = el("div", "password-panel");
  if (def.code === "DIR_START_G4") {
    box.insertBefore(el("div", "password-header", "POKYNY"), panel);
    panel.appendChild(el("div", "password-heading", "Ahoj"));
    panel.appendChild(para("Počkej prosím, až ti dá zadavatel testu heslo."));
  } else {
    // Uprava dle spec kap.6.1: bez "Casti 2", cas 18 minut misto 36.
    box.insertBefore(el("div", "password-header", "ZAČÁTEK TESTU"), panel);
    panel.appendChild(para("Na vypracování testu Tučňáci nejmenší budeš mít 18 minut."));
    panel.appendChild(para("Každou otázku si pečlivě přečti a odpověz na ni, jak nejlépe umíš. Pokud si svou odpovědí nejsi jistý/jistá, napiš nebo vyber takovou odpověď, o které si myslíš, že je nejlepší, a přejdi k další otázce."));
    panel.appendChild(para("Prosím počkej, až ti dá zadavatel testu heslo."));
  }
  box.appendChild(panel);

  const row = el("div", "password-input-row");
  row.appendChild(el("span", null, "Heslo:"));
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 4;
  input.className = "password-input";
  row.appendChild(input);
  box.appendChild(row);

  const err = el("div", "login-error");
  err.style.textAlign = "center";
  err.style.color = "#c0392b";
  box.appendChild(err);

  const actions = el("div", "password-actions");
  const startBtn = el("button", "primary-btn", "Začít →");
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
  box.appendChild(actions);
  container.appendChild(box);
}

// ---------- 3) Pokyny (zuzene dle spec kap.4) ----------

function hintBox(texts, cream) {
  const box = el("div", "hint-box" + (cream ? " cream" : ""));
  texts.forEach(function (t) { box.appendChild(para(t)); });
  return box;
}

function renderDirections(container, data) {
  const box = el("div", "directions-box");
  const code = data.screen_code;

  if (code === "G4_DIR_01") {
    box.appendChild(hintBox([
      "Vítej v testu TIMSS!",
      // Uprava dle spec kap.4: text jen o matematice (puvodne i o prirodovede).
      "V testu budeš odpovídat na otázky z matematiky.",
      "Je důležité, aby ses snažil/a zodpovědět všechny otázky co nejlépe.",
    ]));
    box.appendChild(hintBox([
      "Mezi otázkami můžeš přecházet kliknutím na šipky dole na obrazovce.",
      "Kliknutím na zelenou šipku přejdeš na další obrazovku.",
    ], true));
  } else if (code === "G4_DIR_02") {
    box.appendChild(el("h2", null, "Hodiny a lišta procházení testem"));
    // Uprava dle spec kap.4: bez pravitka, cas 18 minut misto 36+36.
    box.appendChild(hintBox([
      "Na vypracování úlohy Tučňáci budeš mít 18 minut.",
      "Hodiny v levé horní části obrazovky ti budou ukazovat, kolik času ti zbývá.",
    ]));
    box.appendChild(hintBox([
      "Na levé straně obrazovky je lišta procházení testem s políčky pro všechny otázky.",
      "Dokud jsi na otázce, je její políčko zelené.",
      "Když na otázku odpovíš, políčko této otázky zmodrá.",
      "Pokud na otázku neodpovíš, políčko otázky zůstane šedé.",
    ], true));
  } else if (code === "G4_DIR_03") {
    box.appendChild(el("h2", null, "Vyber svou odpověď"));
    box.appendChild(para("Pokud si svou odpovědí nejsi jistý/jistá, vyber tu, o které si myslíš, že je nejlepší."));
    box.appendChild(hintBox(["U otázek jako je tato, klikni na kolečko vedle odpovědi, kterou vybereš."]));
    box.appendChild(el("p", "table-label", "Vyber jednu odpověď"));
    box.appendChild(para("Kolik minut má hodina?"));
    box.appendChild(createSingleChoice("PRACTICE_G4_DIR_03A", [
      { id: "1", label: "12" }, { id: "2", label: "24" }, { id: "3", label: "60" }, { id: "4", label: "120" },
    ]));
    // Uprava dle spec kap.4: cviceni s rozbalovaci nabidkou vypusteno (v uloze se nepouziva).
    box.appendChild(hintBox(["Zde potřebuješ vybrat více než jednu odpověď. Klikni na všechny odpovědi, které považuješ za správné."], true));
    box.appendChild(el("p", "table-label", "Vyber všechny správné odpovědi"));
    box.appendChild(para("Klikni na všechna zvířata, která mají čtyři nohy."));
    const img = document.createElement("img");
    img.src = imgPath("media/images/pokyny/27557/Snake_bird_camel_snail_deer_bluebox.png");
    img.className = "practice-hotspot-img";
    box.appendChild(img);
  } else if (code === "G4_DIR_04") {
    box.appendChild(el("h2", null, "Přetáhni svou odpověď"));
    box.appendChild(para("Někdy odpovíš tak, že přetáhneš slova, čísla nebo obrázky."));
    box.appendChild(hintBox([
      "Klikni na číslo a přidrž, přetáhni ho nad rámeček a pusť.",
      "Procvič si přetažení všech čísel do spodních rámečků.",
    ]));
    box.appendChild(createSortable("PRACTICE_G4_DIR_04", [
      { id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3" },
    ], ["D1", "D2", "D3"]));
  } else if (code === "G4_DIR_05") {
    box.appendChild(el("h2", null, "Číselná klávesnice"));
    box.appendChild(para("U otázek, kde odpověď tvoří číslo, budeš používat číselnou klávesnici."));
    box.appendChild(el("p", "table-label", "Použij číselnou klávesnici"));
    // Uprava dle spec kap.4: cviceni s celym cislem misto zlomku.
    box.appendChild(para("Napiš číslo 5."));
    const answerRow = el("p");
    answerRow.appendChild(document.createTextNode("Odpověď: "));
    answerRow.appendChild(createNumberField("PRACTICE_G4_DIR_05", ""));
    box.appendChild(answerRow);
    box.appendChild(hintBox(["Klikni do políčka pro odpověď a procvič si používání číselné klávesnice."], true));
  } else if (code === "G4_DIR_08") {
    box.appendChild(el("h2", null, "Tipy"));
    box.appendChild(para("Přidáváme dvě rady před tím, než začneš."));
    box.appendChild(hintBox(["Zedy", "V úlohách, kde se používají peníze, je speciální měna zed."]));
    box.appendChild(hintBox(["Rolování", "Nezapomeň, že možná budeš potřebovat odrolovat stránku, aby se ti zobrazila celá otázka."], true));
  }

  container.appendChild(box);
}

// ---------- 4) Info obrazovky ----------

function renderInfo(container, data, def) {
  const box = el("div", "info-box");
  if (data.screen_code === "DIR_END_G4") {
    box.appendChild(para("Dokončil/a jsi Pokyny."));
    box.appendChild(para("Pro pokračování klikni na tlačítko Další."));
  } else {
    // Uprava dle spec kap.6.1: bez "Casti 2" - projekt ma jen jednu ulohu.
    box.appendChild(para("Jsi na konci úlohy Tučňáci nejmenší."));
    box.appendChild(para("Můžeš se vrátit k libovolné otázce, na kterou jsi neodpověděl/a."));
    box.appendChild(para("Také si můžeš své odpovědi na otázky překontrolovat."));
    box.appendChild(para("Pokud chceš skončit, klikni na tlačítko Další."));
    if (def.stopsTimer) stopTimer();
  }
  const actions = el("div", "info-actions");
  const nextBtn = el("button", "primary-btn", "Další →");
  nextBtn.addEventListener("click", goNext);
  actions.appendChild(nextBtn);
  box.appendChild(actions);
  container.appendChild(box);
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

  // Sirky podle originalu (_littlePenguins.scss): 110 / 135 / 100 / 275 px
  const options = [
    { id: "MQ71A01__1", img: "Screen2_Selectable1.png", label: "6 cm × 4 cm", width: 110 },
    { id: "MQ71A01__2", img: "Screen2_Selectable2.png", label: "5 cm × 5 cm", width: 135 },
    { id: "MQ71A01__3", img: "Screen2_Selectable3.png", label: "7 cm × 3 cm", width: 100 },
    { id: "MQ71A01__4", img: "Screen2_Selectable4.png", label: "2 cm × 9 cm", width: 275 },
  ].map(function (o) {
    return { id: o.id, imgSrc: imgPath("media/images/littlepenguins/" + o.img), label: o.label, width: o.width };
  });

  const inner = el("div", "M71A02_imgResponse");
  const previews = {};
  options.forEach(function (o) {
    const holder = el("div", "imgResponse");
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
  left.appendChild(question("B", "O kolik vyšší je tučňák císařský než tučňák nejmenší?"));

  const inner = el("div", "m71a03-inner");
  const top = el("div", "height-row");

  const leftLabel = el("div", "height-label");
  leftLabel.appendChild(para("Výška tučňáka císařského:"));
  const l1 = el("div", "height-field");
  l1.appendChild(createNumberField("MQ71A02A_T", "cm"));
  leftLabel.appendChild(l1);
  top.appendChild(leftLabel);

  const diagram = document.createElement("img");
  diagram.src = imgPath("media/images/littlepenguins/Screen3_Height.png");
  diagram.className = "height-diagram";
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
  left.appendChild(el("div", "psi-title", "Hmotnost"));
  left.appendChild(para("Hmotnosti tučňáků nejsou na této webové stránce seřazeny podle velikosti."));
  left.appendChild(question("A", "Přetáhni tučňáky a seřaď je od nejtěžšího po nejlehčího."));
  left.appendChild(question("B", "Zdravý tučňák nejmenší váží více než 1 100 g. Kolik z těchto tučňáků je zdravých?"));

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

  inner.appendChild(para("Zdravý tučňák nejmenší váží více než 1 100 g."));
  const numRow = el("p", "numpad-row");
  numRow.appendChild(document.createTextNode("Počet zdravých tučňáků: "));
  numRow.appendChild(createNumberField("MQ71A03B_T", ""));
  inner.appendChild(numRow);

  wrap.appendChild(buildRightPanel("M71A04", "media/images/littlepenguins/Screen4_Webpage.jpg", inner));
}

function renderM71A05(left, wrap) {
  left.appendChild(el("div", "psi-title", "Počet tučňáků"));
  left.appendChild(para("Tučňáci, kteří nejsou zdraví, mohou být chyceni dravci."));
  left.appendChild(question("A", "Minulý rok žilo 4 900 tučňáků. Letos jich zůstalo jen 4 350, protože ostatní chytili dravci."));
  left.appendChild(para("Přetáhni ukazatele na správná místa na rybí číselné ose."));
  left.appendChild(question("B", "Kolik tučňáků chytili dravci od minulého roku?"));

  const inner = el("div", "m71a05-inner");
  inner.appendChild(el("div", "range-title", "Počet tučňáků nejmenších"));

  const sliders = el("div", "range-slider-wrapper");
  sliders.appendChild(createSlider("MQ71A04AA_T", 3950, 5050, 50, 4500, "minulý rok"));
  const scaleImg = el("div", "fish-scale");
  sliders.appendChild(scaleImg);
  sliders.appendChild(createSlider("MQ71A04AB_T", 3950, 5050, 50, 4500, "letos"));
  const scale = el("div", "range-scale");
  scale.appendChild(el("span", null, "4 000"));
  scale.appendChild(el("span", null, "5 000"));
  sliders.appendChild(scale);
  inner.appendChild(sliders);

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
  left.appendChild(para("Přetáhni symboly do tabulky a vytvoř tak obrázkový graf."));

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
  [["Kostnaté ryby (60 kg)", "kostnate"], ["Ostatní ryby (45 kg)", "ostatni"]].forEach(function (row) {
    const tr = document.createElement("tr");
    tr.appendChild(el("td", null, row[0]));
    const td = el("td", "drop-zone-cell");
    td.appendChild(createDropZone("MQ71A05B_T", row[1], dropState));
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tableRow = el("div", "table-with-tray");
  tableRow.appendChild(table);

  const trayCol = el("div", "tray-col");
  trayCol.appendChild(createDragTray([
    { id: "whole", label: "celá ryba", imgSrc: imgPath("media/images/littlepenguins/Screen6_WholeFish.png") },
    { id: "half", label: "půlka ryby", imgSrc: imgPath("media/images/littlepenguins/Screen6_HalfFish.png") },
  ]));
  const legend = el("div", "fish-legend");
  legend.appendChild(el("p", null, "= 10 kg ryb"));
  legend.appendChild(el("p", null, "= 5 kg ryb"));
  trayCol.appendChild(legend);
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
