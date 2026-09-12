// Bootstrap aplikace: navigacni tlacitka, sledovani rolovani (SCROLL_* dle kap.7.2),
// modalni okna a export dat (kap.7.3 - zatim export do souboru ke stazeni).

function showModal(text, buttonLabel, onClose) {
  const overlay = el("div", "modal-overlay");
  const box = el("div", "modal-box");
  box.appendChild(el("p", "modal-text", text));
  const btn = el("button", "primary-btn", buttonLabel);
  btn.addEventListener("click", function () {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  });
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

let scrollDebounce = null;
let scrollInProgress = false;

function setupScrollTracking() {
  const container = document.getElementById("screen-container");
  const thumb = document.getElementById("scroll-thumb");
  const isScrollable = container.scrollHeight > container.clientHeight + 4;

  thumb.classList.toggle("show", isScrollable);
  logTrackEvent("SCROLL_ACTIVE", isScrollable ? "Y" : "N");
  scrollInProgress = false;

  container.onscroll = function () {
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

  const baseRender = renderScreen;
  renderScreen = function () {
    baseRender();
    setupScrollTracking();
  };

  renderScreen();
}

document.addEventListener("DOMContentLoaded", init);
