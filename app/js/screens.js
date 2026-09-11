// Vykresleni jednotlivych obrazovek. Texty vychazeji z data/screens/*.json (viz SCREENS_DATA),
// s upravami dle rozhodnuti ve spec kap.4 (zkraceni casu, vypusteni pravitka atd.) - tyto upravy
// jsou aplikovany primo zde a jsou vzdy okomentovany odkazem na puvodni hodnotu.

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function clearContainer(container) {
  container.innerHTML = "";
}

function renderScreen() {
  const def = currentScreenDef();
  const data = findScreenData(def.code);
  const container = document.getElementById("screen-container");
  clearContainer(container);
  document.getElementById("app-footer").classList.toggle("hidden", def.kind === "login" || def.kind === "logoff");
  document.getElementById("progress-bar").classList.toggle("hidden", def.kind === "login");

  logTrackEvent("SCREEN_LOADED", {
    loadedScreenSequence: AppState.screenIndex,
    loadedScreenId: def.code,
  });

  switch (def.kind) {
    case "login": renderLogin(container); break;
    case "password_gate": renderPasswordGate(container, data, def); break;
    case "directions": renderDirections(container, data); break;
    case "info": renderInfo(container, data, def); break;
    case "task_screen": renderTaskScreen(container, data); break;
    case "logoff": renderLogoff(container, data); break;
  }
  renderProgressBar();
  updateNavButtons();
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
  AppState.navHistory.push(AppState.screenIndex);
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
  if (idx >= 0) goToIndex(idx, "NAV_PROG");
}

function updateNavButtons() {
  const def = currentScreenDef();
  const backBtn = document.getElementById("nav-back");
  const nextBtn = document.getElementById("nav-next");
  const showNav = def.kind === "task_screen";
  backBtn.classList.toggle("hidden", !showNav || AppState.screenIndex === 0);
  nextBtn.classList.toggle("hidden", !showNav);
}

function renderProgressBar() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = "";
  SCREEN_ORDER.forEach(function (s, idx) {
    if (s.kind === "login") return;
    const chip = el("div", "progress-chip");
    if (idx === AppState.screenIndex) chip.classList.add("current");
    else if (idx < AppState.screenIndex) chip.classList.add("visited");
    bar.appendChild(chip);
  });
}

// ---------- 1) Login ----------

function renderLogin(container) {
  const box = el("div", "login-box");
  const logo = el("div", "login-logo");
  const logoImg = document.createElement("img");
  logoImg.src = imgPath("media/images/common/timss-logo-new.png");
  logo.appendChild(logoImg);
  box.appendChild(logo);

  const form = el("div", "login-form");
  const idRow = el("div", "login-row");
  idRow.appendChild(el("span", "login-icon", "\u{1F464}"));
  const idInput = document.createElement("input");
  idInput.type = "text";
  idInput.maxLength = 8;
  idInput.className = "login-input";
  idInput.id = "login-id";
  idRow.appendChild(idInput);
  form.appendChild(idRow);

  const pwRow = el("div", "login-row");
  pwRow.appendChild(el("span", "login-icon", "\u{1F512}"));
  const pwInput = document.createElement("input");
  pwInput.type = "password";
  pwInput.maxLength = 6;
  pwInput.className = "login-input";
  pwInput.id = "login-password";
  pwRow.appendChild(pwInput);
  form.appendChild(pwRow);

  const err = el("div", "login-error");
  err.id = "login-error";
  form.appendChild(err);

  const btn = el("button", "arrow-btn", "→");
  btn.addEventListener("click", function () {
    const idVal = idInput.value.trim();
    const pwVal = pwInput.value.trim();
    const idOk = /^\d{8}$/.test(idVal);
    const pwOk = /^[a-zA-Z0-9]{5}\*?$/.test(pwVal);
    if (!idOk || !pwOk) {
      err.textContent = "Neplatné ID nebo heslo.";
      return;
    }
    // Poznamka: skutecne overeni v databazi je soucasti kroku 6 (backend/uloziste) - zatim jen format.
    AppState.studentId = idVal;
    goToIndex(AppState.screenIndex + 1);
  });
  form.appendChild(btn);
  box.appendChild(form);
  container.appendChild(box);
}

// ---------- 2) Heslo od zadavatele (DIR_START_G4, PT2_START_G4) ----------

function renderPasswordGate(container, data, def) {
  const box = el("div", "password-box");
  const header = el("div", "password-header");
  // Text pro PT2_START_G4 upraven dle rozhodnuti spec kap.4/6.1: bez "Casti 2", 18 minut misto 36.
  if (def.code === "DIR_START_G4") {
    header.textContent = "POKYNY";
    box.appendChild(header);
    box.appendChild(el("div", "password-heading", "Ahoj"));
    box.appendChild(el("p", null, "Počkej prosím, až ti dá zadavatel testu heslo."));
  } else {
    header.textContent = "ZAČÁTEK TESTU";
    box.appendChild(header);
    box.appendChild(el("p", null, "Na vypracování testu Tučňáci nejmenší budeš mít 18 minut."));
    box.appendChild(el("p", null, "Každou otázku si pečlivě přečti a odpověz na ni, jak nejlépe umíš. Pokud si svou odpovědí nejsi jistý/jistá, napiš nebo vyber takovou odpověď, o které si myslíš, že je nejlepší, a přejdi k další otázce."));
    box.appendChild(el("p", null, "Prosím počkej, až ti dá zadavatel testu heslo."));
  }

  const pwRow = el("div", "password-input-row");
  pwRow.appendChild(el("span", null, "Heslo:"));
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 4;
  input.className = "password-input";
  pwRow.appendChild(input);
  box.appendChild(pwRow);

  const errDiv = el("div", "login-error");
  box.appendChild(errDiv);

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
      errDiv.textContent = "Heslo není správně, zkus to znovu.";
      logTrackEvent("POPUP_PW_INCORRECT_CLOSE");
    }
  });
  box.appendChild(startBtn);
  container.appendChild(box);
}

// ---------- 3) Pokyny (zuzene, spec kap.4) ----------

function renderDirections(container, data) {
  const box = el("div", "directions-box");
  const code = data.screen_code;

  function addHeading(t) { box.appendChild(el("h2", null, t)); }
  function addP(t) { box.appendChild(el("p", null, t)); }

  if (code === "G4_DIR_01") {
    addHeading("Vítej v testu TIMSS!");
    // Uprava dle rozhodnuti spec kap.4: text jen o matematice (puvodne "z matematiky a z prirodovedy").
    addP("V testu budeš odpovídat na otázky z matematiky.");
    addP("Je důležité, aby ses snažil/a zodpovědět všechny otázky co nejlépe.");
    addP("Mezi otázkami můžeš přecházet kliknutím na šipky dole na obrazovce.");
    const p = el("p");
    p.appendChild(document.createTextNode("Kliknutím na "));
    const btn = el("span", "inline-next-btn", "→");
    p.appendChild(btn);
    p.appendChild(document.createTextNode(" přejdeš na další obrazovku."));
    box.appendChild(p);
  } else if (code === "G4_DIR_02") {
    addHeading("Hodiny a lišta procházení testem");
    // Uprava dle rozhodnuti spec kap.4: bez pravitka; cas 18 minut misto puvodnich 36+36.
    addP("Na vypracování úlohy Tučňáci budeš mít 18 minut.");
    addP("Hodiny v levé horní části obrazovky ti budou ukazovat, kolik času ti zbývá.");
    addP("Dokud jsi na otázce, je její políčko zelené.");
    addP("Když na otázku odpovíš, políčko této otázky zmodrá.");
    addP("Pokud na otázku neodpovíš, políčko otázky zůstane šedé.");
    addP("Na levé straně obrazovky je lišta procházení testem s políčky pro všechny otázky.");
  } else if (code === "G4_DIR_03") {
    addHeading("Vyber svou odpověď");
    addP("Pokud si svou odpovědí nejsi jistý/jistá, vyber tu, o které si myslíš, že je nejlepší.");
    box.appendChild(el("p", "hint-text", "U otázek jako je tato, klikni na kolečko vedle odpovědi, kterou vybereš."));
    box.appendChild(el("p", "table-label", "Vyber jednu odpověď"));
    box.appendChild(createSingleChoice("PRACTICE_G4_DIR_03A", [
      { id: "1", label: "12" }, { id: "2", label: "24" }, { id: "3", label: "60" }, { id: "4", label: "120" },
    ]));
    box.appendChild(el("p", null, "Kolik minut má hodina?"));
    box.appendChild(el("p", "hint-text", "Zde potřebuješ vybrat více než jednu odpověď. Klikni na všechny odpovědi, které považuješ za správné."));
    box.appendChild(el("p", "table-label", "Vyber všechny správné odpovědi"));
    box.appendChild(el("p", null, "Klikni na všechna zvířata, která mají čtyři nohy."));
    const img = document.createElement("img");
    img.src = imgPath("media/images/pokyny/27557/Snake_bird_camel_snail_deer_bluebox.png");
    img.className = "practice-hotspot-img";
    box.appendChild(img);
  } else if (code === "G4_DIR_04") {
    addHeading("Přetáhni svou odpověď");
    addP("Někdy odpovíš tak, že přetáhneš slova, čísla nebo obrázky.");
    box.appendChild(el("p", "hint-text", "Klikni na číslo a přidrž, přetáhni ho nad rámeček a pusť. Procvič si přetažení všech čísel do spodních rámečků."));
    box.appendChild(createSortable("PRACTICE_G4_DIR_04", [
      { id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3" },
    ], ["D1", "D2", "D3"]));
  } else if (code === "G4_DIR_05") {
    addHeading("Číselná klávesnice");
    addP("U otázek, kde odpověď tvoří číslo, budeš používat číselnou klávesnici.");
    box.appendChild(el("p", "table-label", "Použij číselnou klávesnici"));
    // Uprava dle rozhodnuti spec kap.4: cviceni s celym cislem misto zlomku (puvodne "napis zlomek 1/2").
    const p = el("p");
    p.appendChild(document.createTextNode("Napiš číslo "));
    const b = el("strong", null, "5");
    p.appendChild(b);
    p.appendChild(document.createTextNode("."));
    box.appendChild(p);
    const answerRow = el("p");
    answerRow.appendChild(document.createTextNode("Odpověď: "));
    answerRow.appendChild(createNumberField("PRACTICE_G4_DIR_05", ""));
    box.appendChild(answerRow);
    box.appendChild(el("p", "hint-text", "Klikni do políčka pro odpověď a procvič si používání číselné klávesnice."));
  } else if (code === "G4_DIR_08") {
    addHeading("Tipy");
    addP("Přidáváme dvě rady před tím, než začneš.");
    box.appendChild(el("h3", null, "Zedy"));
    addP("V úlohách, kde se používají peníze, je speciální měna zed.");
    box.appendChild(el("h3", null, "Rolování"));
    addP("Nezapomeň, že možná budeš potřebovat odrolovat stránku, aby se ti zobrazila celá otázka.");
  }

  const nextBtn = el("button", "primary-btn", "Další →");
  nextBtn.addEventListener("click", function () { goNext(); });
  box.appendChild(nextBtn);
  container.appendChild(box);
}

// ---------- 4) Info obrazovky (konec pokynu, konec testu) ----------

function renderInfo(container, data, def) {
  const box = el("div", "info-box");
  if (data.screen_code === "DIR_END_G4") {
    box.appendChild(el("p", null, "Dokončil/a jsi Pokyny."));
    box.appendChild(el("p", null, "Pro pokračování klikni na tlačítko Další."));
  } else if (data.screen_code === "PT2_END_G4") {
    // Uprava dle rozhodnuti spec kap.6.1: text "Casti 2" prepsan, protoze projekt ma jen jednu cast (Tucnaci).
    box.appendChild(el("p", null, "Jsi na konci úlohy Tučňáci nejmenší."));
    box.appendChild(el("p", null, "Můžeš se vrátit k libovolné otázce, na kterou jsi neodpověděl/a."));
    box.appendChild(el("p", null, "Také si můžeš své odpovědi na otázky překontrolovat."));
    box.appendChild(el("p", null, "Pokud chceš skončit, klikni na tlačítko Další."));
    if (def.stopsTimer) stopTimer();
  }
  const nextBtn = el("button", "primary-btn", "Další →");
  nextBtn.addEventListener("click", function () { goNext(); });
  box.appendChild(nextBtn);
  container.appendChild(box);
}

// ---------- 5) Zaverecna obrazovka (vlastni navrh, viz data/screens/19_logoff.json) ----------

function renderLogoff(container) {
  const box = el("div", "logoff-box");
  box.appendChild(el("h2", null, "Děkujeme!"));
  box.appendChild(el("p", null, "Dokončil/a jsi test Tučňáci nejmenší."));
  box.appendChild(el("p", null, "Tvoje odpovědi jsme v pořádku uložili."));
  box.appendChild(el("p", null, "Teď si prosím počkej na pokyny od zadavatele testu."));
  container.appendChild(box);
}

// ---------- 6) Ukolove obrazovky M71A01-M71A07 ----------

const TAB_LABELS = ["Obrázek", "Výška", "Hmotnost", "Počet", "Potrava", "Příspěvek"];
const TAB_CODES = ["M71A02", "M71A03", "M71A04", "M71A05", "M71A06", "M71A07"];

function buildRightPanel(activeCode, bgImage, innerContentEl) {
  const panel = el("div", "right-panel");
  const urlBar = el("div", "url-bar", "https://www.IEA.eTIMSS.com/tucnaci");
  panel.appendChild(urlBar);
  const mock = el("div", "webpage-mock");
  mock.style.backgroundImage = "url('" + imgPath(bgImage) + "')";
  const title = el("div", "webpage-title", "Tučňák nejmenší");
  mock.appendChild(title);
  const tabs = el("div", "webpage-tabs");
  TAB_LABELS.forEach(function (label, i) {
    const tab = el("div", "webpage-tab", label);
    if (TAB_CODES[i] === activeCode) tab.classList.add("active");
    tab.addEventListener("click", function () { goToScreenByCode(TAB_CODES[i]); });
    tabs.appendChild(tab);
  });
  mock.appendChild(tabs);
  const inner = el("div", "webpage-inner");
  inner.appendChild(innerContentEl);
  mock.appendChild(inner);
  panel.appendChild(mock);
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

function renderM71A01(left) {
  left.appendChild(el("h2", "psi-title", "Tučňák nejmenší"));
  left.appendChild(el("p", null, "Tučňák nejmenší je nejmenší druh tučňáka."));
  left.appendChild(el("p", null, "Tučňáci nejmenší žijí na ostrově blízko Austrálie."));
  left.appendChild(el("p", null, "Budeš doplňovat informace o tučňácích nejmenších na webové stránky."));
  const img = document.createElement("img");
  img.src = imgPath("media/images/littlepenguins/screen1_penguin.png");
  img.className = "m71a01-image";
  left.appendChild(img);
  const p = el("p", "next-line");
  p.appendChild(document.createTextNode("Klikni na "));
  const startBtn = el("button", "arrow-btn small", "→");
  startBtn.addEventListener("click", function () {
    logTrackEvent("M71A01_NEXT");
    goNext();
  });
  p.appendChild(startBtn);
  p.appendChild(document.createTextNode(" a začni."));
  left.appendChild(p);
}

function renderM71A02(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Obrázky"));
  left.appendChild(el("p", null, "Zde je několik obrázků tučňáka nejmenšího."));
  left.appendChild(el("p", null, "Který obrázek má největší obsah?"));
  left.appendChild(el("p", null, "(Označ obrázek.)"));

  const options = [
    { id: "MQ71A01__1", img: "Screen2_Selectable1.png", label: "6 cm × 4 cm" },
    { id: "MQ71A01__2", img: "Screen2_Selectable2.png", label: "5 cm × 5 cm" },
    { id: "MQ71A01__3", img: "Screen2_Selectable3.png", label: "7 cm × 3 cm" },
    { id: "MQ71A01__4", img: "Screen2_Selectable4.png", label: "2 cm × 9 cm" },
  ].map(function (o) { return { id: o.id, imgSrc: imgPath("media/images/littlepenguins/" + o.img), label: o.label }; });

  let previewImg;
  const hottext = createHottext("MQ71A01_T", options, function (selectedId) {
    if (selectedId) {
      const opt = options.find(function (o) { return o.id === selectedId; });
      previewImg.src = opt.imgSrc;
      previewImg.classList.remove("hidden");
    } else {
      previewImg.classList.add("hidden");
    }
  });
  left.appendChild(hottext);

  const inner = el("div", "tab-inner-content");
  previewImg = document.createElement("img");
  previewImg.className = "webpage-preview-img hidden";
  inner.appendChild(previewImg);
  wrap.appendChild(buildRightPanel("M71A02", "media/images/littlepenguins/Screen2_Webpage.jpg", inner));
}

function renderM71A03(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Výška"));
  left.appendChild(el("p", null, "Tučňáci nejmenší jsou nejmenším druhem tučňáků."));
  left.appendChild(el("p", null, "Tučňáci císařští jsou největším druhem tučňáků."));
  left.appendChild(el("p", null, "A. Kolik měří každý tučňák?"));
  left.appendChild(el("p", null, "B. O kolik vyšší je tučňák císařský než tučňák nejmenší?"));

  const inner = el("div", "tab-inner-content m71a03-inner");
  const heightImg = document.createElement("img");
  heightImg.src = imgPath("media/images/littlepenguins/Screen3_Height.png");
  heightImg.className = "height-diagram";
  inner.appendChild(heightImg);

  const row1 = el("p");
  row1.appendChild(document.createTextNode("Výška tučňáka císařského: "));
  row1.appendChild(createNumberField("MQ71A02A_T", "cm"));
  inner.appendChild(row1);

  const row2 = el("p");
  row2.appendChild(document.createTextNode("Výška tučňáka nejmenšího: "));
  row2.appendChild(createNumberField("MQ71A02B_T", "cm"));
  inner.appendChild(row2);

  const row3 = el("p");
  row3.appendChild(document.createTextNode("Tučňák císařský je o "));
  row3.appendChild(createNumberField("MQ71A02C_T", "cm vyšší než tučňák nejmenší."));
  inner.appendChild(row3);

  wrap.appendChild(buildRightPanel("M71A03", "media/images/littlepenguins/Screen3_Webpage.jpg", inner));
}

function renderM71A04(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Hmotnost"));
  left.appendChild(el("p", null, "Hmotnosti tučňáků nejsou na této webové stránce seřazeny podle velikosti."));
  left.appendChild(el("p", null, "A. Přetáhni tučňáky a seřaď je od nejtěžšího po nejlehčího."));
  left.appendChild(el("p", null, "B. Zdravý tučňák nejmenší váží více než 1 100 g. Kolik z těchto tučňáků je zdravých?"));

  const header = el("div", "sort-header");
  header.appendChild(el("span", null, "nejtěžší"));
  header.appendChild(el("span", null, "nejlehčí"));
  left.appendChild(header);

  left.appendChild(createSortable("MQ71A03A_T", [
    { id: "__1", label: "1 120 g" },
    { id: "__2", label: "1 308 g" },
    { id: "__3", label: "1 065 g" },
    { id: "__4", label: "987 g" },
    { id: "__5", label: "1 132 g" },
  ], ["MQ71A03AA", "MQ71A03AB", "MQ71A03AC", "MQ71A03AD", "MQ71A03AE"]));

  const numRow = el("p");
  numRow.appendChild(document.createTextNode("Počet zdravých tučňáků: "));
  numRow.appendChild(createNumberField("MQ71A03B_T", ""));
  left.appendChild(numRow);

  const inner = el("div", "tab-inner-content");
  wrap.appendChild(buildRightPanel("M71A04", "media/images/littlepenguins/Screen4_Webpage.jpg", inner));
}

function renderM71A05(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Počet tučňáků"));
  left.appendChild(el("p", null, "Tučňáci, kteří nejsou zdraví, mohou být chyceni dravci."));
  left.appendChild(el("p", null, "A. Minulý rok žilo 4 900 tučňáků. Letos jich zůstalo jen 4 350, protože ostatní chytili dravci."));
  left.appendChild(el("p", null, "Přetáhni ukazatele na správná místa na rybí číselné ose."));
  left.appendChild(el("p", null, "B. Kolik tučňáků chytili dravci od minulého roku?"));

  const numRow = el("p");
  numRow.appendChild(document.createTextNode("Počet tučňáků, které chytili dravci: "));
  numRow.appendChild(createNumberField("MQ71A04B_T", ""));
  left.appendChild(numRow);

  const inner = el("div", "tab-inner-content m71a05-inner");
  inner.appendChild(el("div", "range-title", "Počet tučňáků nejmenších"));
  const row1 = el("div", "slider-row");
  row1.appendChild(el("span", "slider-tag", "minulý rok"));
  row1.appendChild(createSlider("MQ71A04AA_T", 3950, 5050, 50, 4500));
  inner.appendChild(row1);
  const row2 = el("div", "slider-row");
  row2.appendChild(el("span", "slider-tag", "letos"));
  row2.appendChild(createSlider("MQ71A04AB_T", 3950, 5050, 50, 4500));
  inner.appendChild(row2);
  const scale = el("div", "range-scale");
  scale.appendChild(el("span", null, "4 000"));
  scale.appendChild(el("span", null, "5 000"));
  inner.appendChild(scale);
  const sharkImg = document.createElement("img");
  sharkImg.src = imgPath("media/images/littlepenguins/Screen5_Shark.png");
  sharkImg.className = "shark-img";
  inner.appendChild(sharkImg);
  inner.appendChild(el("div", "healthy-caption", "Zdraví tučňáci přežijí!"));

  wrap.appendChild(buildRightPanel("M71A05", "media/images/littlepenguins/Screen5_Webpage.jpg", inner));
}

function renderM71A06(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Potrava"));
  left.appendChild(el("p", null, "Zdravý tučňák sežere za rok: 60 kg kostnatých ryb, 45 kg ostatních ryb."));
  left.appendChild(el("p", null, "A. Který zápis vyjadřuje, kolik kg ryb sežere 4 350 zdravých tučňáků za jeden rok?"));

  left.appendChild(createSingleChoice("MQ71A05A_T", [
    { id: "MQ71A05A__1", label: "4 350 + 60 + 45" },
    { id: "MQ71A05A__2", label: "4 350 · 60 · 45" },
    { id: "MQ71A05A__3", label: "4 350 · (60 + 45)" },
    { id: "MQ71A05A__4", label: "4 350 + (60 · 45)" },
  ]));

  left.appendChild(el("p", null, "B. Doplň obrázky do tabulky tak, aby ukazovala množství ryb, které jeden zdravý tučňák sežere za jeden rok."));
  left.appendChild(el("p", null, "Přetáhni symboly do tabulky a vytvoř tak obrázkový graf (1 celá ryba = 10 kg, 1 půlka ryby = 5 kg)."));

  left.appendChild(createDragDropTable("MQ71A05B_T", [
    { id: "whole", label: "celá ryba (10 kg)", imgSrc: imgPath("media/images/littlepenguins/Screen6_WholeFish.png") },
    { id: "half", label: "půlka ryby (5 kg)", imgSrc: imgPath("media/images/littlepenguins/Screen6_HalfFish.png") },
  ], [
    { id: "kostnate", label: "Kostnaté ryby (60 kg)" },
    { id: "ostatni", label: "Ostatní ryby (45 kg)" },
  ], 12));

  const inner = el("div", "tab-inner-content");
  wrap.appendChild(buildRightPanel("M71A06", "media/images/littlepenguins/Screen6_Webpage.jpg", inner));
}

function renderM71A07(left, wrap) {
  left.appendChild(el("h2", "psi-title", "Příspěvek"));
  left.appendChild(el("p", null, "Za příspěvek 8 zedů se nakoupí dostatek ryb na krmení jednoho tučňáka po celý měsíc."));
  left.appendChild(el("p", null, "A. Kolik stojí krmení pro 5 tučňáků za měsíc?"));
  left.appendChild(el("p", null, "B. Kolik tučňáků můžeš krmit celý měsíc za 200 zedů?"));

  const inner = el("div", "tab-inner-content m71a07-inner");
  inner.appendChild(el("div", "inner-title", "Přispěj ještě dnes!"));
  const row1 = el("p");
  row1.appendChild(document.createTextNode("Krmení pro 5 tučňáků stojí "));
  row1.appendChild(createNumberField("MQ71A06A_T", "zedů."));
  inner.appendChild(row1);
  const row2 = el("p");
  row2.appendChild(document.createTextNode("Nakrmím "));
  row2.appendChild(createNumberField("MQ71A06B_T", "tučňáků za 200 zedů."));
  inner.appendChild(row2);
  const penguinImg = document.createElement("img");
  penguinImg.src = imgPath("media/images/littlepenguins/screen7-penguin.png");
  penguinImg.className = "m71a07-penguin";
  inner.appendChild(penguinImg);
  inner.appendChild(el("div", "speech-bubble", "Ryby, ryby, ryby!"));

  wrap.appendChild(buildRightPanel("M71A07", "media/images/littlepenguins/Screen7_Webpage.jpg", inner));
}
