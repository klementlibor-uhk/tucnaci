// Bootstrap aplikace: navigace tlacitky, casovac, sledovani rolovani (SCROLL_* dle kap.7.2),
// modalni okna a export dat (kap.7.3 - zakladni export do souboru ke stazeni, viz krok 4 planu).

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
let scrollActiveLogged = false;

function setupScrollTracking() {
  const container = document.getElementById("screen-container");
  const isScrollable = container.scrollHeight > container.clientHeight + 4;
  logTrackEvent("SCROLL_ACTIVE", isScrollable ? "Y" : "N");
  scrollActiveLogged = false;
  container.onscroll = function () {
    if (!scrollActiveLogged) {
      scrollActiveLogged = true;
      logTrackEvent("SCROLL_START", {
        ScrollTop: container.scrollTop,
        Clientheight: container.clientHeight,
        TotalUIHeight: container.scrollHeight,
      });
    }
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(function () {
      logTrackEvent("SCROLL_STOP", {
        ScrollTop: container.scrollTop,
        Clientheight: container.clientHeight,
        TotalUIHeight: container.scrollHeight,
      });
      scrollActiveLogged = false;
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

  const originalRenderScreen = renderScreen;
  renderScreen = function () {
    originalRenderScreen();
    setupScrollTracking();
  };

  renderScreen();
}

document.addEventListener("DOMContentLoaded", init);
