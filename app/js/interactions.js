// Sest typu interakci. Pouzivame stejne open-source knihovny jako original (jQuery UI 1.10.3
// pro razeni, pretahovani a posuvniky, MathQuill 0.10.1 pro cislene pole), aby bylo ovladani
// pro zaka co nejpodobnejsi. Logika a zaznam udalosti jsou vlastni - dle katalogu v kap.7 spec.

const MQ = MathQuill.getInterface(2);

// Inicializace, ktere musi probehnout az kdyz je prvek v DOM (jQuery UI widgety).
const pendingInits = [];
function runPendingInits() {
  while (pendingInits.length) pendingInits.shift()();
}

// ---------- Virtualni klavesnice math_min + cislene pole (MathQuill) ----------

let activeField = null; // { fieldId, mathField }

function typeKey(ch) {
  return function (mf) { mf.typedText(ch); };
}

const KEYPAD_LAYOUT = [
  { label: "7", action: typeKey("7") },
  { label: "8", action: typeKey("8") },
  { label: "9", action: typeKey("9") },
  { label: "-", action: typeKey("-") },
  { label: "4", action: typeKey("4") },
  { label: "5", action: typeKey("5") },
  { label: "6", action: typeKey("6") },
  { fraction: true, action: function (mf) { mf.cmd("\\frac"); } },
  { label: "1", action: typeKey("1") },
  { label: "2", action: typeKey("2") },
  { label: "3", action: typeKey("3") },
  { backspace: true, cls: "keypad-back", action: function (mf) { mf.keystroke("Backspace"); } },
  { label: "0", action: typeKey("0") },
  { label: ",", action: typeKey(",") },
  { label: "OK", cls: "keypad-ok", action: null },
];

// Ikona zlomku: dva sede obdelnicky oddelene carou (jako v originale)
function fractionIcon() {
  const icon = el("span", "keypad-frac-icon");
  icon.appendChild(el("span", "box"));
  icon.appendChild(el("span", "bar"));
  icon.appendChild(el("span", "box"));
  return icon;
}

// Ikona mazani: bily petiuhelnik se sipkou vlevo a krizkem uvnitr (jako v originale)
const SVG_NS = "http://www.w3.org/2000/svg";

function backspaceIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 30 20");
  svg.setAttribute("width", "30");
  svg.setAttribute("height", "20");

  const shape = document.createElementNS(SVG_NS, "path");
  shape.setAttribute("d", "M10 1 H28 A1 1 0 0 1 29 2 V18 A1 1 0 0 1 28 19 H10 L1 10 Z");
  shape.setAttribute("fill", "#fff");
  svg.appendChild(shape);

  [[14, 6, 22, 14], [22, 6, 14, 14]].forEach(function (c) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", c[0]); line.setAttribute("y1", c[1]);
    line.setAttribute("x2", c[2]); line.setAttribute("y2", c[3]);
    line.setAttribute("stroke", "#1f4e79");
    line.setAttribute("stroke-width", "2.5");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);
  });
  return svg;
}

function ensureKeypad() {
  let kb = document.getElementById("math-keypad");
  if (kb) return kb;
  kb = document.createElement("div");
  kb.id = "math-keypad";
  kb.className = "math-keypad hidden";

  const header = el("div", "keypad-header", "✥");
  kb.appendChild(header);

  KEYPAD_LAYOUT.forEach(function (key) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "keypad-btn" + (key.cls ? " " + key.cls : "");
    if (key.fraction) btn.appendChild(fractionIcon());
    else if (key.backspace) btn.appendChild(backspaceIcon());
    else btn.textContent = key.label;
    // Nesmi sebrat fokus poli - jinak by se klavesnice hned zavrela.
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    btn.addEventListener("click", function () {
      if (!activeField) return;
      if (key.action) key.action(activeField.mathField);
      else closeKeypad();
    });
    kb.appendChild(btn);
  });

  document.body.appendChild(kb);
  // Klavesnici lze presouvat za horni listu, stejne jako v originale.
  $(kb).draggable({ handle: ".keypad-header" });
  return kb;
}

// Staticka ukazka klavesnice s popisky u prislusnych klaves (jen ilustrace, needituje).
function buildKeypadIllustration() {
  const demo = el("div", "keypad-demo");

  const kb = el("div", "math-keypad keypad-illustration");
  kb.appendChild(el("div", "keypad-header", "✥"));
  KEYPAD_LAYOUT.forEach(function (key) {
    const btn = el("div", "keypad-btn" + (key.cls ? " " + key.cls : ""));
    if (key.fraction) btn.appendChild(fractionIcon());
    else if (key.backspace) btn.appendChild(backspaceIcon());
    else btn.textContent = key.label;
    kb.appendChild(btn);
  });
  demo.appendChild(kb);

  // Popisky sedi na radky klavesnice: minus, zlomek, mazani, OK
  const callouts = el("div", "keypad-callouts");
  [
    "Zadání znaménka mínus (klikni před číslem)",
    "Zadání zlomku",
    "Vymazání",
    "Zavření číselné klávesnice",
  ].forEach(function (text) {
    const row = el("div", "callout");
    row.appendChild(el("span", "callout-arrow"));
    row.appendChild(el("div", "callout-box", text));
    callouts.appendChild(row);
  });
  demo.appendChild(callouts);

  const wrap = el("div", "keypad-demo-wrap");
  wrap.appendChild(demo);

  const below = el("div", "callout-below");
  below.appendChild(el("span", "callout-arrow up"));
  below.appendChild(el("div", "callout-box", "Zadání desetinné čárky"));
  wrap.appendChild(below);

  return wrap;
}

function openKeypad(anchorEl) {
  const kb = ensureKeypad();
  kb.classList.remove("hidden");
  const rect = anchorEl.getBoundingClientRect();
  kb.style.top = (window.scrollY + rect.bottom + 8) + "px";
  kb.style.left = (window.scrollX + Math.min(rect.left, window.innerWidth - 250)) + "px";
}

function closeKeypad() {
  const kb = document.getElementById("math-keypad");
  if (kb) kb.classList.add("hidden");
  if (activeField) activeField.mathField.blur();
}

// Aktivace pole je idempotentni - spousti se jak z fokusu, tak z kliknuti do policka.
function activateField(fieldId, mathField, host) {
  if (activeField && activeField.fieldId === fieldId) {
    openKeypad(host);
    return;
  }
  activeField = { fieldId: fieldId, mathField: mathField };
  logComponentEvent(fieldId, { type: "focus" });
  logTrackEvent("NUMBERPAD_OPEN");
  openKeypad(host);
}

function createNumberField(fieldId, unit) {
  const wrap = el("span", "number-field-wrap");
  const host = el("span", "number-field");
  wrap.appendChild(host);
  if (unit) wrap.appendChild(el("span", "number-field-unit", unit));

  pendingInits.push(function () {
    const mathField = MQ.MathField(host, {
      handlers: {
        edit: function () { AppState.responses[fieldId] = mathField.latex(); },
      },
    });
    if (AppState.responses[fieldId]) mathField.latex(AppState.responses[fieldId]);

    host.addEventListener("click", function () {
      mathField.focus();
      activateField(fieldId, mathField, host);
    });

    const textarea = host.querySelector("textarea");
    $(textarea).on("focus", function () {
      activateField(fieldId, mathField, host);
    });
    $(textarea).on("blur", function () {
      const response = mathField.latex();
      AppState.responses[fieldId] = response;
      logComponentEvent(fieldId, { type: "blur", response: response });
      const kb = document.getElementById("math-keypad");
      if (kb) kb.classList.add("hidden");
      if (activeField && activeField.fieldId === fieldId) activeField = null;
    });
  });

  return wrap;
}

// ---------- 1) Hottext - vyber obrazku klikem (M71A02) ----------

function createHottext(fieldId, options, onChange) {
  const wrap = el("div", "hottext-group");
  let selected = null;
  options.forEach(function (opt) {
    const item = el("div", "hottext-option");

    // Rozmery jako v originale: vyska svisle vlevo, sirka vodorovne pod obrazkem
    const row = el("div", "opt-row");
    if (opt.labelY) row.appendChild(el("span", "y-label", opt.labelY));
    const img = document.createElement("img");
    img.src = opt.imgSrc;
    img.alt = "";
    if (opt.width) img.style.width = opt.width + "px";
    row.appendChild(img);
    item.appendChild(row);
    if (opt.labelX) item.appendChild(el("div", "x-label", opt.labelX));
    item.addEventListener("click", function () {
      const trackId = fieldId + "_" + opt.id;
      if (selected === opt.id) {
        selected = null;
        item.classList.remove("selected");
        AppState.responses[fieldId] = "";
        logComponentEvent(trackId, { cleared: true, response: "" });
      } else {
        wrap.querySelectorAll(".hottext-option.selected").forEach(function (n) { n.classList.remove("selected"); });
        selected = opt.id;
        item.classList.add("selected");
        AppState.responses[fieldId] = opt.id;
        logComponentEvent(trackId, { response: opt.id });
      }
      if (onChange) onChange(selected);
    });
    wrap.appendChild(item);
  });
  return wrap;
}

// ---------- 2) Vyber jedne moznosti (M71A06 A, Pokyny) ----------

function createSingleChoice(fieldId, choices) {
  const wrap = el("div", "choice-group");
  let selected = null;
  choices.forEach(function (choice, index) {
    const row = el("div", "choice-row");
    row.appendChild(el("span", "choice-radio", String.fromCharCode(65 + index)));
    row.appendChild(el("span", null, choice.label));
    row.addEventListener("click", function () {
      const trackId = fieldId + "_" + choice.id;
      if (selected === choice.id) {
        selected = null;
        row.classList.remove("selected");
        AppState.responses[fieldId] = "";
        logComponentEvent(trackId, { cleared: true, response: "" });
      } else {
        wrap.querySelectorAll(".choice-row.selected").forEach(function (n) { n.classList.remove("selected"); });
        selected = choice.id;
        row.classList.add("selected");
        AppState.responses[fieldId] = choice.id;
        logComponentEvent(trackId, { response: choice.id });
      }
    });
    wrap.appendChild(row);
  });
  return wrap;
}

// ---------- 2b) Vyber vice odpovedi klikanim do obrazku (Pokyny) ----------
// Souradnice oblasti odpovidaji mape v originalnim HTML (obrazek 480x67).

function createHotspotMultiSelect(fieldId, imgSrc, areas) {
  const wrap = el("div", "hotspot-wrap");
  const img = document.createElement("img");
  img.src = imgSrc;
  wrap.appendChild(img);

  const selected = [];
  areas.forEach(function (area) {
    const hit = el("div", "hotspot-area");
    hit.style.left = area.coords[0] + "px";
    hit.style.top = area.coords[1] + "px";
    hit.style.width = (area.coords[2] - area.coords[0]) + "px";
    hit.style.height = (area.coords[3] - area.coords[1]) + "px";
    hit.addEventListener("click", function () {
      const trackId = fieldId + "_" + area.id;
      const pos = selected.indexOf(area.id);
      if (pos >= 0) {
        selected.splice(pos, 1);
        hit.classList.remove("selected");
        AppState.responses[fieldId] = selected.toString();
        logComponentEvent(trackId, { cleared: true, response: selected.toString() });
      } else {
        selected.push(area.id);
        hit.classList.add("selected");
        AppState.responses[fieldId] = selected.toString();
        logComponentEvent(trackId, { response: selected.toString() });
      }
    });
    wrap.appendChild(hit);
  });
  return wrap;
}

// ---------- 2c) Pretazeni cisel do ramecku (Pokyny) ----------

function createDragToBoxes(fieldId, items, targets) {
  const grid = el("div", "drag-practice-grid");
  const sourceRow = el("div", "drag-row");
  const targetRow = el("div", "drag-row");
  const placed = {};

  items.forEach(function (item) {
    const src = el("div", "drag-source", item.label);
    src.dataset.itemId = item.id;
    sourceRow.appendChild(src);
    pendingInits.push(function () {
      $(src).draggable({
        helper: "clone",
        revert: "invalid",
        appendTo: "body",
        zIndex: 900,
        start: function (event, ui) { return !src.classList.contains("used"); },
      });
    });
  });

  function currentResponse() {
    return Object.keys(placed).sort().map(function (z) { return z + ":" + placed[z]; }).join(",");
  }

  function sourceFor(itemId) {
    return sourceRow.querySelector('[data-item-id="' + itemId + '"]');
  }

  targets.forEach(function (target) {
    const zone = el("div", "drag-target");
    zone.dataset.zoneId = target.id;
    targetRow.appendChild(zone);
    pendingInits.push(function () {
      $(zone).droppable({
        accept: ".drag-source",
        drop: function (event, ui) {
          const src = ui.draggable[0];
          if (src.classList.contains("used") || zone.classList.contains("filled")) return;

          // Vlozene cislo lze pretazenim vratit zpet nahoru na puvodni misto.
          const token = el("div", "drag-token", src.textContent);
          token.dataset.itemId = src.dataset.itemId;
          zone.appendChild(token);
          zone.classList.add("filled");
          src.classList.add("used");
          placed[target.id] = src.dataset.itemId;
          AppState.responses[fieldId] = currentResponse();
          logComponentEvent(fieldId, {
            dragged: src.dataset.itemId,
            dropped: target.id,
            endTime: nowMs(),
            response: AppState.responses[fieldId],
          });
          // Pri vraceni zpet se taha cely ctverecek s cislem, ne jen samotna cislice.
          $(token).draggable({
            helper: function () { return el("div", "drag-source drag-ghost", token.textContent); },
            revert: "invalid",
            appendTo: "body",
            zIndex: 900,
          });
        },
      });
    });
  });

  // Horni rada slouzi zaroven jako misto, kam lze cislo vratit.
  pendingInits.push(function () {
    $(sourceRow).droppable({
      accept: ".drag-token",
      drop: function (event, ui) {
        const token = ui.draggable[0];
        const zone = token.parentElement;
        const itemId = token.dataset.itemId;
        zone.removeChild(token);
        zone.classList.remove("filled");
        delete placed[zone.dataset.zoneId];
        const src = sourceFor(itemId);
        if (src) src.classList.remove("used");
        AppState.responses[fieldId] = currentResponse();
        logComponentEvent(fieldId, {
          dragged: itemId,
          dropped: "source",
          endTime: nowMs(),
          response: AppState.responses[fieldId],
        });
      },
    });
  });

  grid.appendChild(sourceRow);
  grid.appendChild(targetRow);
  return grid;
}

// ---------- 3) Razeni pretahovanim - jQuery UI sortable (M71A04) ----------

function createSortable(fieldId, items, dropPositions) {
  const list = el("ul", "sortable-list");
  items.forEach(function (item) {
    const li = el("li", "sortable-item");
    li.dataset.itemId = item.id;
    li.appendChild(el("div", "weight", item.label));
    list.appendChild(li);
  });

  function currentOrder() {
    return Array.prototype.map.call(list.children, function (li, idx) {
      return dropPositions[idx] + ":" + li.dataset.itemId;
    }).join(",");
  }

  pendingInits.push(function () {
    $(list).sortable({
      items: "> li",
      placeholder: "sort-placeholder",
      tolerance: "pointer",
      stop: function (event, ui) {
        const droppedIndex = $(ui.item).index();
        AppState.responses[fieldId] = currentOrder();
        logComponentEvent(fieldId, {
          dragged: ui.item[0].dataset.itemId,
          dropped: dropPositions[droppedIndex],
          endTime: nowMs(),
          response: AppState.responses[fieldId],
        });
      },
    });
  });

  return list;
}

// ---------- 4) Posuvnik na rybi ose - jQuery UI slider (M71A05) ----------

// Ukazatel na rybi ose: oranzovy stitek s pevnym popiskem spojeny carou s bodem na ose.
// Zak jim posouva po ose (3950-5050, krok 50), text stitku se nemeni - jako v originale.
function createAxisSlider(fieldId, position, labelLines) {
  const holder = el("div", "axis-slider slider-" + position);
  const handle = el("span", "ui-slider-handle axis-handle");
  const marker = el("div", "axis-marker");
  labelLines.forEach(function (line) { marker.appendChild(el("div", null, line)); });
  handle.appendChild(marker);
  holder.appendChild(handle);

  pendingInits.push(function () {
    $(holder).slider({
      min: 3950, max: 5050, step: 50, value: 4500,
      stop: function (event, ui) {
        AppState.responses[fieldId] = String(ui.value);
        logComponentEvent(fieldId, { response: String(ui.value) });
      },
    });
  });

  return holder;
}

// ---------- 5) Drag&drop obrazku do tabulky - jQuery UI draggable/droppable (M71A06 B) ----------

// Zdroj pretahovani: symbol v preruseném ramecku (v originale soucast legendy vpravo)
function createDragSource(itemId, imgSrc) {
  const slot = el("div", "drag-slot");
  const img = document.createElement("img");
  img.src = imgSrc;
  img.className = "dragdrop-item";
  img.dataset.itemId = itemId;
  slot.appendChild(img);
  pendingInits.push(function () {
    $(img).draggable({
      // Taha se cely preruseny ramecek se symbolem, jako v originale
      helper: function () {
        const ghost = el("div", "drag-slot drag-slot-ghost");
        const copy = document.createElement("img");
        copy.src = imgSrc;
        copy.className = "dragdrop-item";
        ghost.appendChild(copy);
        return ghost;
      },
      revert: "invalid",
      appendTo: "body",
      zIndex: 900,
    });
  });
  return slot;
}

const DROP_COLS = 6;
const DROP_ROWS = 2;

function createDropZone(fieldId, zoneId, dropState) {
  const zone = el("div", "drop-zone");
  zone.dataset.zoneId = zoneId;
  dropState[zoneId] = [];
  const takenSlots = {};

  // Policko pod mistem pusteni; pokud je obsazene, vezme se nejblizsi volne
  function slotFor(helperEl) {
    const rect = zone.getBoundingClientRect();
    const h = helperEl.getBoundingClientRect();
    const col = Math.min(DROP_COLS - 1, Math.max(0, Math.floor((h.left + h.width / 2 - rect.left) / 40)));
    const row = Math.min(DROP_ROWS - 1, Math.max(0, Math.floor((h.top + h.height / 2 - rect.top) / 65)));
    const total = DROP_COLS * DROP_ROWS;
    for (let i = 0; i < total; i++) {
      const slot = (row * DROP_COLS + col + i) % total;
      if (!takenSlots[slot]) return slot;
    }
    return null;
  }

  pendingInits.push(function () {
    $(zone).droppable({
      accept: ".dragdrop-item",
      tolerance: "pointer",
      drop: function (event, ui) {
        const itemId = ui.draggable[0].dataset.itemId;
        const slot = slotFor(ui.helper[0]);
        if (slot === null) return;
        takenSlots[slot] = true;
        dropState[zoneId].push(itemId);
        // Symbol se usadi do mrizky policek (40x65 px jako v originale)
        const cell = el("div", "drop-cell-item");
        cell.style.gridColumnStart = (slot % DROP_COLS) + 1;
        cell.style.gridRowStart = Math.floor(slot / DROP_COLS) + 1;
        const copy = document.createElement("img");
        copy.src = ui.draggable[0].src;
        cell.appendChild(copy);
        zone.appendChild(cell);
        const response = Object.keys(dropState).map(function (z) {
          return z + "(" + dropState[z].join(";") + ")";
        }).join(",");
        AppState.responses[fieldId] = response;
        logComponentEvent(fieldId, { dragged: itemId, dropped: zoneId, response: response });
      },
    });
  });

  return zone;
}
