// Bootstrap aplikace: navigacni tlacitka, sledovani rolovani (SCROLL_* dle kap.7.2),
// modalni okna a export dat (kap.7.3 - zatim export do souboru ke stazeni).

// autoCloseMs: hlaska se po dane dobe potvrdi sama (pouziva se pri vyprseni casu)
function showModal(text, buttonLabel, onClose, autoCloseMs) {
  const overlay = el("div", "modal-overlay");
  const box = el("div", "modal-box");
  box.appendChild(el("p", "modal-text", text));
  const btn = el("button", "primary-btn", buttonLabel);
  let autoCloseTimer = null;

  function close() {
    if (!overlay.parentNode) return;
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    document.body.removeChild(overlay);
    if (onClose) onClose();
  }

  btn.addEventListener("click", close);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  if (autoCloseMs) autoCloseTimer = setTimeout(close, autoCloseMs);
}

let scrollDebounce = null;
let scrollInProgress = false;

function maxScrollOf(container) {
  return container.scrollHeight - container.clientHeight;
}

// Modry pruh vpravo je funkcni posuvnik (jako v originale) - nativni je skryty.
function updateScrollThumb() {
  const container = document.getElementById("screen-container");
  const bar = document.getElementById("scroll-bar");
  const thumb = document.getElementById("scroll-thumb");
  const max = maxScrollOf(container);
  if (max <= 4) {
    thumb.classList.remove("show");
    return;
  }
  thumb.classList.add("show");
  const travel = bar.clientHeight - thumb.offsetHeight - 12;
  thumb.style.top = (6 + Math.round((container.scrollTop / max) * travel)) + "px";
}

function setupScrollbarDragging() {
  const container = document.getElementById("screen-container");
  const bar = document.getElementById("scroll-bar");
  const thumb = document.getElementById("scroll-thumb");
  let dragStartY = null;
  let scrollAtStart = 0;

  thumb.addEventListener("mousedown", function (e) {
    e.preventDefault();
    dragStartY = e.clientY;
    scrollAtStart = container.scrollTop;
    logTrackEvent("SCROLL_DRAG_START", { scrollFrom: container.scrollTop });
  });

  document.addEventListener("mousemove", function (e) {
    if (dragStartY === null) return;
    const travel = bar.clientHeight - thumb.offsetHeight - 12;
    const max = maxScrollOf(container);
    container.scrollTop = scrollAtStart + ((e.clientY - dragStartY) / travel) * max;
    updateScrollThumb();
  });

  document.addEventListener("mouseup", function () {
    if (dragStartY === null) return;
    dragStartY = null;
    logTrackEvent("SCROLL_DRAG_STOP", { scrollTo: container.scrollTop });
  });
}

function setupScrollTracking() {
  const container = document.getElementById("screen-container");
  const isScrollable = maxScrollOf(container) > 4;

  updateScrollThumb();
  logTrackEvent("SCROLL_ACTIVE", isScrollable ? "Y" : "N");
  scrollInProgress = false;

  container.onscroll = function () {
    updateScrollThumb();
    const data = {
      ScrollTop: container.scrollTop,
      Clientheight: container.clientHeight,
      TotalUIHeight: container.scrollHeight,
    };
    if (!scrollInProgress) {
      scrollInProgress = true;
      logTrackEvent("SCROLL_START", data);
    }
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(function () {
      logTrackEvent("SCROLL_STOP", data);
      scrollInProgress = false;
    }, 300);
  };
}

function init() {
  document.getElementById("nav-back").addEventListener("click", goBack);
  document.getElementById("nav-next").addEventListener("click", goNext);
  document.getElementById("export-events-btn").addEventListener("click", function () {
    downloadTextFile("events.csv", exportEventsCsv());
  });
  document.getElementById("export-responses-btn").addEventListener("click", function () {
    downloadTextFile("responses.csv", exportResponsesCsv());
  });

  // Klik mimo cislene pole zavre virtualni klavesnici.
  document.addEventListener("mousedown", function (e) {
    const keypad = document.getElementById("math-keypad");
    if (!keypad || keypad.classList.contains("hidden")) return;
    if (keypad.contains(e.target) || e.target.closest(".number-field")) return;
    closeKeypad();
  });

  setupScrollbarDragging();

  const baseRender = renderScreen;
  renderScreen = function () {
    baseRender();
    setupScrollTracking();
  };

  renderScreen();
}

document.addEventListener("DOMContentLoaded", init);
