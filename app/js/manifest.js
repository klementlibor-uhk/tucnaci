// Poradi obrazovek presne podle spec kap. 6.1. "code" odpovida screen_code v data/screens/*.json.
const SCREEN_ORDER = [
  { code: "LOGIN",        kind: "login" },
  { code: "DIR_START_G4", kind: "password_gate", passwordEvent: "DIRECTIONS_START", bookletPart: "Directions" },
  { code: "G4_DIR_01",    kind: "directions" },
  { code: "G4_DIR_02",    kind: "directions" },
  { code: "G4_DIR_03",    kind: "directions" },
  { code: "G4_DIR_04",    kind: "directions" },
  { code: "G4_DIR_05",    kind: "directions" },
  { code: "G4_DIR_08",    kind: "directions" },
  { code: "DIR_END_G4",   kind: "info" },
  { code: "PT2_START_G4", kind: "password_gate", passwordEvent: "PART2_START", bookletPart: "Part2", startsTimer: true },
  { code: "M71A01",       kind: "task_screen" },
  { code: "M71A02",       kind: "task_screen" },
  { code: "M71A03",       kind: "task_screen" },
  { code: "M71A04",       kind: "task_screen" },
  { code: "M71A05",       kind: "task_screen" },
  { code: "M71A06",       kind: "task_screen" },
  { code: "M71A07",       kind: "task_screen" },
  { code: "PT2_END_G4",   kind: "info", stopsTimer: true },
  { code: "Logoff",       kind: "logoff" },
];

const TEST_TIME_LIMIT_MS = 18 * 60 * 1000;      // spec kap.5: 18 minut na M71A01-M71A07
const FIVE_MIN_WARNING_MS = 5 * 60 * 1000;      // spec kap.5/9: upozorneni "Zbyva ti 5 minut" - ponechano
const GATE_PASSWORD = "0000";                    // testovaci heslo overene proti zivemu Playeru (zadavatel jej sdeli tride)
