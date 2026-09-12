// Centralni stav behu testu (v pameti prohlizece, zatim bez ukladani na server - viz krok 4/6 planu).
const AppState = {
  studentId: null,
  screenIndex: 0,        // index do SCREEN_ORDER
  responses: {},         // odpovedi podle identifikatoru MQ... (kap. 3 specifikace)
  events: [],            // log procesnich udalosti (kap. 7 specifikace)
  visited: {},           // navstivene obrazovky - podle nich se barvi policka v navigacni liste
  maxReachedIndex: 0,    // nejdal dosazena obrazovka - vpred lze jen o jednu novou
  timerRemainingMs: null,
  timerHandle: null,
  timerStarted: false,
  fiveMinWarningShown: false,
};

function imgPath(localPath) {
  return "../data/" + localPath;
}

function getScreenDef(index) {
  return SCREEN_ORDER[index];
}

function currentScreenDef() {
  return getScreenDef(AppState.screenIndex);
}

function findScreenData(code) {
  return SCREENS_DATA.find(function (s) { return s.screen_code === code; });
}
