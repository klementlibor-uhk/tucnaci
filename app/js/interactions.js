// Sest typu interakci pouzitych v obrazovkach M71A01-M71A07 a v Pokynech (spec kap.8 krok3).
// Vsechny zaznamenavane udalosti odpovidaji katalogu v kap.7.2 specifikace; kde original pouziva
// dva ruzne mechanismy zaznamu (trackEvents=timeStamp, componentEvents/eventTracker=startTime),
// je zachovano presne dle overeni v docs/event-catalog-overeni.md. U dvou udalosti (razeni MQ71A03A_T
// a MQ71A05B_T), kde presny mechanismus nebyl ve zdroji jednoznacne dohledatelny, pouzivame
// componentEvents styl (startTime) - jde o nase vlastni, nezavisle reseni (viz spec kap.1).

// ---------- Spolecna virtualni klavesnice math_min pro cislena pole ----------

let activeNumberField = null; // { fieldId, valueEl, value }

function ensureKeypad() {
  let kb = document.getElementById("math-keypad");
  if (kb) return kb;
  kb = document.createElement("div");
  kb.id = "math-keypad";
  kb.className = "math-keypad hidden";
  const keys = ["7","8","9","-","4","5","6","+","1","2","3","·","0",",","=",":","⌫","OK"];
  keys.forEach(function (k) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "keypad-btn" + (k === "OK" ? " keypad-ok" : "");
    btn.textContent = k;
    btn.addEventListener("click", function () { handleKeypadPress(k); });
    kb.appendChild(btn);
  });
  document.body.appendChild(kb);
  return kb;
}

function handleKeypadPress(k) {
  if (!activeNumberField) return;
  if (k === "OK") {
    closeNumberField();
    return;
  }
  if (k === "⌫") {
    activeNumberField.value = activeNumberField.value.slice(0, -1);
  } else {
    activeNumberField.value += k;
  }
  activeNumberField.valueEl.textContent = activeNumberField.value || " ";
}

function openNumberField(fieldId, valueEl) {
  const kb = ensureKeypad();
  const wasOpen = !kb.classList.contains("hidden") && activeNumberField && activeNumberField.fieldId === fieldId;
  if (wasOpen) return;
  const firstOpen = kb.classList.contains("hidden");
  activeNumberField = { fieldId: fieldId, valueEl: valueEl, value: AppState.responses[fieldId] || "" };
  kb.classList.remove("hidden");
  const rect = valueEl.getBoundingClientRect();
  kb.style.top = (window.scrollY + rect.bottom + 6) + "px";
  kb.style.left = (window.scrollX + rect.left) + "px";
  logComponentEvent(fieldId, { type: "focus" });
  if (firstOpen) logTrackEvent("NUMBERPAD_OPEN");
}

function closeNumberField() {
  if (!activeNumberField) return;
  const { fieldId, value } = activeNumberField;
  AppState.responses[fieldId] = value;
  logComponentEvent(fieldId, { type: "blur", response: value });
  const kb = document.getElementById("math-keypad");
  if (kb) kb.classList.add("hidden");
  activeNumberField = null;
}

// Vytvori cislene pole (unit = jednotka zobrazena za polem, napr. "cm")
function createNumberField(fieldId, unit) {
  const wrap = document.createElement("span");
  wrap.className = "number-field-wrap";
  const box = document.createElement("span");
  box.className = "number-field";
  box.tabIndex = 0;
  box.textContent = AppState.responses[fieldId] || " ";
  box.addEventListener("click", function () { openNumberField(fieldId, box); });
  wrap.appendChild(box);
  if (unit) {
    const u = document.createElement("span");
    u.className = "number-field-unit";
    u.textContent = " " + unit;
    wrap.appendChild(u);
  }
  return wrap;
}

// ---------- 1) Hottext - vyber obrazku klikem (M71A02) ----------

function createHottext(fieldId, options, onChange) {
  // options: [{id, imgSrc, label}]
  const wrap = document.createElement("div");
  wrap.className = "hottext-group";
  let selected = null;
  options.forEach(function (opt) {
    const el = document.createElement("div");
    el.className = "hottext-option";
    const img = document.createElement("img");
    img.src = opt.imgSrc;
    img.alt = opt.label || "";
    el.appendChild(img);
    if (opt.label) {
      const lbl = document.createElement("div");
      lbl.className = "hottext-label";
      lbl.textContent = opt.label;
      el.appendChild(lbl);
    }
    el.addEventListener("click", function () {
      const trackId = fieldId + "_" + opt.id;
      if (selected === opt.id) {
        selected = null;
        el.classList.remove("selected");
        AppState.responses[fieldId] = "";
        logComponentEvent(trackId, { cleared: true, response: "" });
      } else {
        wrap.querySelectorAll(".hottext-option.selected").forEach(function (n) { n.classList.remove("selected"); });
        selected = opt.id;
        el.classList.add("selected");
        AppState.responses[fieldId] = opt.id;
        logComponentEvent(trackId, { response: opt.id });
      }
      if (onChange) onChange(selected);
    });
    wrap.appendChild(el);
  });
  return wrap;
}

// ---------- 2) Vyber jedne moznosti (M71A06 A, take pouzito v Pokynech) ----------

function createSingleChoice(fieldId, choices) {
  // choices: [{id, label}]
  const wrap = document.createElement("div");
  wrap.className = "choice-group";
  let selected = null;
  choices.forEach(function (choice) {
    const row = document.createElement("label");
    row.className = "choice-row";
    const radio = document.createElement("span");
    radio.className = "choice-radio";
    const lbl = document.createElement("span");
    lbl.textContent = choice.label;
    row.appendChild(radio);
    row.appendChild(lbl);
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

// ---------- 3) Razeni pretahovanim (M71A04 A) ----------

function createSortable(fieldId, items, dropPositions) {
  // items: [{id, label}], dropPositions: ["MQ71A03AA", ... "MQ71A03AE"]
  const wrap = document.createElement("ul");
  wrap.className = "sortable-list";
  let dragSrc = null;

  function currentOrderResponse() {
    return Array.prototype.map.call(wrap.children, function (li, idx) {
      return dropPositions[idx] + ":" + li.dataset.itemId;
    }).join(",");
  }

  items.forEach(function (item) {
    const li = document.createElement("li");
    li.className = "sortable-item";
    li.draggable = true;
    li.dataset.itemId = item.id;
    li.textContent = item.label;
    li.addEventListener("dragstart", function (e) {
      dragSrc = li;
      e.dataTransfer.effectAllowed = "move";
    });
    li.addEventListener("dragover", function (e) { e.preventDefault(); });
    li.addEventListener("drop", function (e) {
      e.preventDefault();
      if (!dragSrc || dragSrc === li) return;
      const dropZoneIndex = Array.prototype.indexOf.call(wrap.children, li);
      wrap.insertBefore(dragSrc, li);
      AppState.responses[fieldId] = currentOrderResponse();
      logComponentEvent("MQ71A03A_T", {
        dragged: dragSrc.dataset.itemId,
        dropped: dropPositions[dropZoneIndex],
        endTime: nowMs(),
        response: AppState.responses[fieldId],
      });
    });
    wrap.appendChild(li);
  });
  AppState.responses[fieldId] = currentOrderResponse();
  return wrap;
}

// ---------- 4) Posuvnik na cislene ose (M71A05 A) ----------

function createSlider(fieldId, min, max, step, initial) {
  const wrap = document.createElement("span");
  wrap.className = "slider-wrap";
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = initial;
  const label = document.createElement("span");
  label.className = "slider-value";
  label.textContent = initial;
  input.addEventListener("input", function () {
    label.textContent = input.value;
  });
  input.addEventListener("change", function () {
    AppState.responses[fieldId] = input.value;
    logComponentEvent(fieldId, { response: input.value });
  });
  AppState.responses[fieldId] = String(initial);
  wrap.appendChild(input);
  wrap.appendChild(label);
  return wrap;
}

// ---------- 5) Cislene pole - viz createNumberField vyse ----------

// ---------- 6) Drag&drop obrazku do tabulky (M71A06 B) ----------

function createDragDropTable(fieldId, dragItems, dropZones, maxPerZone) {
  // dragItems: [{id, label, imgSrc}], dropZones: [{id, label}]
  const wrap = document.createElement("div");
  wrap.className = "dragdrop-table-wrap";

  const tray = document.createElement("div");
  tray.className = "dragdrop-tray";
  dragItems.forEach(function (item) {
    const el = document.createElement("img");
    el.src = item.imgSrc;
    el.alt = item.label;
    el.className = "dragdrop-item";
    el.draggable = true;
    el.dataset.itemId = item.id;
    el.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", item.id);
    });
    tray.appendChild(el);
  });
  wrap.appendChild(tray);

  const zonesWrap = document.createElement("div");
  zonesWrap.className = "dragdrop-zones";
  const dropped = {}; // zoneId -> [itemId,...]
  dropZones.forEach(function (zone) {
    dropped[zone.id] = [];
    const zoneEl = document.createElement("div");
    zoneEl.className = "dragdrop-zone";
    const title = document.createElement("div");
    title.className = "dragdrop-zone-label";
    title.textContent = zone.label;
    zoneEl.appendChild(title);
    const inner = document.createElement("div");
    inner.className = "dragdrop-zone-items";
    zoneEl.appendChild(inner);
    zoneEl.addEventListener("dragover", function (e) { e.preventDefault(); });
    zoneEl.addEventListener("drop", function (e) {
      e.preventDefault();
      const itemId = e.dataTransfer.getData("text/plain");
      const item = dragItems.find(function (d) { return d.id === itemId; });
      if (!item || dropped[zone.id].length >= maxPerZone) return;
      dropped[zone.id].push(itemId);
      const img = document.createElement("img");
      img.src = item.imgSrc;
      img.className = "dragdrop-item dropped";
      inner.appendChild(img);
      const response = Object.keys(dropped).map(function (z) {
        return z + "(" + dropped[z].join(";") + ")";
      }).join(",");
      AppState.responses[fieldId] = response;
      logComponentEvent(fieldId, { dragged: itemId, dropped: zone.id, response: response });
    });
    zonesWrap.appendChild(zoneEl);
  });
  wrap.appendChild(zonesWrap);
  AppState.responses[fieldId] = "";
  return wrap;
}
