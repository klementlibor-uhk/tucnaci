// Casovac 18 minut (spec kap.5). Start po zadani hesla na obrazovce zacatku testu (PT2_START_G4),
// konec pri dosazeni obrazovky "Konec testu" (PT2_END_G4) - at uz prirozene, nebo po vyprseni casu.
// Upozorneni "Zbyva ti 5 minut" ponechano (spec kap.5/9 - oznaceno jako otevrena otazka, zatim zachovano
// jako v originale; lze snadno vypnout nastavenim KEEP_FIVE_MIN_WARNING na false).
const KEEP_FIVE_MIN_WARNING = true;

function startTimer() {
  if (AppState.timerStarted) return;
  AppState.timerStarted = true;
  AppState.timerRemainingMs = TEST_TIME_LIMIT_MS;
  logTrackEvent("PART2_CLOCK_START");
  updateTimerDisplay();
  AppState.timerHandle = setInterval(function () {
    AppState.timerRemainingMs -= 1000;
    updateTimerDisplay();
    if (KEEP_FIVE_MIN_WARNING && !AppState.fiveMinWarningShown && AppState.timerRemainingMs <= FIVE_MIN_WARNING_MS) {
      AppState.fiveMinWarningShown = true;
      showFiveMinutePopup();
    }
    if (AppState.timerRemainingMs <= 0) {
      AppState.timerRemainingMs = 0;
      updateTimerDisplay();
      stopInterval();
      showTimeUpPopup();
    }
  }, 1000);
}

function stopInterval() {
  if (AppState.timerHandle) {
    clearInterval(AppState.timerHandle);
    AppState.timerHandle = null;
  }
}

function stopTimer() {
  if (!AppState.timerStarted) return;
  stopInterval();
  logTrackEvent("PART2_CLOCK_STOP");
  AppState.timerStarted = false;
}

function updateTimerDisplay() {
  const el = document.getElementById("timer-display");
  if (!el) return;
  const totalSec = Math.max(0, Math.round(AppState.timerRemainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function showFiveMinutePopup() {
  logTrackEvent("POPUP_FIVE_MINUTES_OPEN");
  showModal("Zbývá ti 5 minut.", "OK", function () {
    logTrackEvent("POPUP_FIVE_MINUTES_CLOSE");
  });
}

// Po vyprseni casu se test uzavre - zak je preveden rovnou na zaverecnou obrazovku.
function showTimeUpPopup() {
  logTrackEvent("POPUP_TIME_UP_OPEN");
  showModal("Čas vypršel!", "Další", function () {
    logTrackEvent("POPUP_TIME_UP_CLOSE", { event_attribute: "time_up_forced_next" });
    stopTimer();
    const lastIndex = SCREEN_ORDER.findIndex(function (s) { return s.code === "Logoff"; });
    AppState.maxReachedIndex = Math.max(AppState.maxReachedIndex, lastIndex);
    goToIndex(lastIndex, "NAV_PROG");
  }, TIME_UP_AUTOCLOSE_MS);
}
