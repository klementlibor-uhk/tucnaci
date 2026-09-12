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

const KEYPAD_LAYOUT = [
  { label: "7", action: function (mf) { mf.typedText("7"); } },
  { label: "8", action: function (mf) { mf.typedText("8"); } },
  { label: "9", action: function (mf) { mf.typedText("9"); } },
  { label: "-", action: function (mf) { mf.typedText("-"); } },
  { label: "4", action: function (mf) { mf.typedText("4"); } },
  { label: "5", action: function (mf) { mf.typedText("5"); } },
  { label: "6", action: function (mf) { mf.typedText("6"); } },
  { label: "▭/▭", cls: "keypad-frac", action: function (mf) { mf.cmd("\\frac"); } },
  { label: "1", action: function (mf) { mf.typedText("1"); } },
  { label: "2", action: function (mf) { mf.typedText("2"); } },
  { label: "3", action: function (mf) { mf.typedText("3"); } },
  { label: "⌫", action: function (mf) { mf.keystroke("Backspace"); } },
  { label: "0", action: function (mf) { mf.typedText("0"); } },
  { label: ",", action: function (mf) { mf.typedText(","); } },
  { label: "OK", cls: "keypad-ok", action: null },
];

function ensureKeypad() {
  let kb = document.getElementById("math-keypad");
  if (kb) return kb;
  kb = document.createElement("div");
  kb.id = "math-keypad";
  kb.className = "math-keypad hidden";
  kb.appendChild(el("div", "keypad-header"));
  KEYPAD_LAYOUT.forEach(function (key) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "keypad-btn" + (key.cls ? " " + key.cls : "");
    btn.textContent = key.label;
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
  return kb;
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
    const img = document.createElement("img");
    img.src = opt.imgSrc;
    img.alt = "";
    if (opt.width) img.style.width = opt.width + "px";
    item.appendChild(img);
    if (opt.label) item.appendChild(el("div", "hottext-label", opt.label));
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
  choices.forEach(function (choice) {
    const row = el("div", "choice-row");
    row.appendChild(el("span", "choice-radio"));
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

function createSlider(fieldId, min, max, step, initial, tagText) {
  const holder = el("div", "ui-slider");
  const handle = el("span", "ui-slider-handle");
  const tag = el("div", "slider-tag", tagText + " " + initial);
  handle.appendChild(tag);
  holder.appendChild(handle);

  pendingInits.push(function () {
    $(holder).slider({
      min: min, max: max, step: step, value: initial,
      slide: function (event, ui) { tag.textContent = tagText + " " + ui.value; },
      stop: function (event, ui) {
        AppState.responses[fieldId] = String(ui.value);
        logComponentEvent(fieldId, { response: String(ui.value) });
      },
    });
  });

  return holder;
}

// ---------- 5) Drag&drop obrazku do tabulky - jQuery UI draggable/droppable (M71A06 B) ----------

function createDragTray(dragItems) {
  const tray = el("div", "dragdrop-tray");
  dragItems.forEach(function (item) {
    const slot = el("div", "drag-slot");
    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.label;
    img.className = "dragdrop-item";
    img.dataset.itemId = item.id;
    slot.appendChild(img);
    tray.appendChild(slot);
    pendingInits.push(function () {
      $(img).draggable({ helper: "clone", revert: "invalid", appendTo: "body", zIndex: 900 });
    });
  });
  return tray;
}

function createDropZone(fieldId, zoneId, dropState) {
  const zone = el("div", "drop-zone");
  zone.dataset.zoneId = zoneId;
  dropState[zoneId] = [];

  pendingInits.push(function () {
    $(zone).droppable({
      accept: ".dragdrop-item",
      drop: function (event, ui) {
        const itemId = ui.draggable[0].dataset.itemId;
        if (dropState[zoneId].length >= 12) return;
        dropState[zoneId].push(itemId);
        const copy = document.createElement("img");
        copy.src = ui.draggable[0].src;
        copy.className = "dragdrop-item dropped";
        zone.appendChild(copy);
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
