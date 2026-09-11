# Ověření katalogu procesních událostí (kap. 7.2 specifikace) proti zdrojovým souborům

Provedeno: 2026-09-11. Ověřováno proti souborům v `G4_USB_TEST_FINAL_PLAYER/htdocs/web/engine/packages/`:
`TIMSS2023MS/Resources/js/timss.js`, `common/widgets/eventTracker.js`, `common/widgets/MathKeyboard.js`,
HTML obrazovek v `AssessmentMaster/Items/**`.

Poznámka: cílem bylo ověřit **existenci a mechanismus** každé události z katalogu, ne extrahovat celý zdrojový kód (ten se nekopíruje, viz kap. 1 specifikace – přebírá se jen popis chování).

## Potvrzeno beze změny

| trackId | Zdroj | Poznámka |
|---|---|---|
| `SCREEN_LOADED` | `timss.js:9268` | data `loadedScreenSequence`, `loadedScreenId`, `timeStamp` – odpovídá |
| `NAV_NEXT`, `NAV_BACK`, `NAV_PROG` | `timss.js:9275,9286,9298` (fce `setNavigationEvent`) | odpovídá |
| `M71A01_NEXT` | `timss.js:2767` | `trackEvents("M71A01_NEXT")`, bez dat – odpovídá |
| `DIRECTIONS_START`, `PART2_START` | `timss.js:9774,9777` (fce `pwdclickevent`) | parametr `Booklet Part` = "Directions"/"Part2" podle `testletPartArr` mapování – odpovídá |
| `POPUP_PW_INCORRECT_OPEN` / `_CLOSE` | `timss.js:9797,9800` (fce `trackPOPUPEvents`) | klíč `timeStamp` – odpovídá |
| `PART2_CLOCK_START` / `_STOP` | `timss.js:9237-9253` | Sestavuje se dynamicky jako `<DIL>_CLOCK_START/STOP` z `testletPartArr` (`PT2_START_G4`→`PART2`); v přímém textovém hledání "PART2_CLOCK" proto zpočátku nenalezeno, po dohledání mechanismu potvrzeno |
| `POPUP_FIVE_MINUTES_OPEN` / `_CLOSE` | `timss.js:9148,9154` | odpovídá |
| `POPUP_TIME_UP_OPEN` / `_CLOSE` | `timss.js:9150,9162,9296` | odpovídá |
| `SCROLL_ACTIVE` | `timss.js:9209,9212` | hodnoty "Y"/"N" – odpovídá |
| `SCROLL_START`, `SCROLL_STOP` | `timss.js:10130,10143` | odpovídá |
| `SCROLL_DRAG` (start/stop) | `eventTracker.js:73-96` (generický mechanismus `data-trackId` + `_START`/`_STOP`) + HTML všech obrazovek obsahuje `<div class="slider-img" data-track-id="SCROLL_DRAG">` | mechanismus generický, ne specifický pro Tučňáky – odpovídá |
| `MQ71A01_T…` (hottext, M71A02) | `eventTracker.js:241-277` (generický klik na `.single` fieldset) + HTML `93026/228936_cs-CZ.html` | `cleared:true` při zrušení výběru potvrzen přesně – odpovídá |
| `NUMBERPAD_OPEN` | `MathKeyboard.js:182` (`startTrackingEvents(name, "NUMBERPAD_OPEN")`) | odpovídá |
| `<id pole>` focus/blur (např. `MQ71A02A_T`) | `MathKeyboard.js:178-181,225,297,319-322` | `response` = LaTeX při blur – odpovídá |
| `MQ71A03A_T` (řazení, M71A04) | `timss.js:2776-2809` | `dragged`, `dropped`, `endTime`, `response` – odpovídá |
| `MQ71A04AA_T`, `MQ71A04AB_T` (posuvníky, M71A05) | `timss.js:3246,3258` (`componentEvents(...)`) | `response` = hodnota – odpovídá |
| `MQ71A05A_T_MQ71A05A__n` (volba, M71A06 A) | `eventTracker.js:241-277`, stejný generický mechanismus jako hottext | `response` nebo `cleared:true, response:""` – odpovídá |
| `trackEvents()` → klíč `timeStamp` / `componentEvents()` a eventTracker → klíč `startTime` | `timss.js:10015-10054` | přesně odpovídá popisu v kap. 7.1 |

## Ověřeno – doplňující zjištění

- **`HIGHLIGHT_TOOL`, `SCROLL_DRAG` atributy v HTML** (kap. 7.2, poslední odrážky): potvrzeno, jsou přítomny v HTML/CSS všech obrazovek (`<div id="wrapper-highlighter" data-track-id="HIGHLIGHT_TOOL">`, `<div class="slider-img" data-track-id="SCROLL_DRAG">`). Zda byl zvýrazňovač žákům v Tučňácích skutečně dostupný, nelze určit jen z HTML (tlačítko existuje v markupu univerzálně) – **zůstává otevřenou otázkou** (viz spec kap. 9), řešitelné jen porovnáním s náhledy/chováním, ne se zdrojovým kódem.
- **"Select ONE statement"** (anglický zbytkový řetězec, spec kap. 3 poznámka): ověřeno v `_cs-CZ.html` souborech (G4_DIR_03, M71A06) – řetězec je obalen třídou `hide` (`<div class="c-html statement c-highlight hide">`), tedy **není žákovi zobrazen**. Otázka ze spec kap. 3 je tímto zodpovězena.
- **Heslo pro DIRECTIONS_START/PART2_START** (kap. 6.3): pole `password1` má `maxlength="4"` v HTML obou obrazovek (`DIR_START_G4`, `PT2_START_G4`) – jde o jiné heslo než přihlašovací heslo žáka (5 alfanumerických znaků dle `login.js`), toto je krátké číselné heslo sdělované zadavatelem celé třídě najednou.
- **Login formát** (kap. 6.2): potvrzeno přesně v `login.js:64`: `/^\d{8}$/.test(user) && /^[a-zA-Z0-9]{5}\*?$/.test(pass)`.
- **Chybové stavy loginu**: potvrzeny anglické serverové řetězce v `login.js:51`: `"Sorry you have already completed the assessment."`, `"Username or password is incorrect."`, a `error-concurrent-login` třída pro souběžné přihlášení – žádná čeština v balíčku, nutno navrhnout vlastní znění.

## Nedořešeno / přesahuje rozsah kroku 1–2 (ponecháno pro fázi implementace enginu, krok 3)

- **`MQ71A05B_T` (přetažení ryb do tabulky, M71A06 B)**: v `timss.js` nalezena pouze funkce `saveM71A06()` (řádek 4075), která sestavuje **finální** odpověď (`"MQ71A05BA_1,MQ71A05BB_2,..."`) při uložení obrazovky – nikoli živé sledování jednotlivých přetažení s klíčem `dragged` za běhu. Prohledání `AssessmentMaster/Resources/build/js/assessment-master.min.js` (generická drag&drop komponenta) nenašlo odpovídající `"dragged"` klíč v datové sadě (jen interní jQuery-UI stavový příznak `.dragged`, nesouvisející). **Přesný payload živé události pro tuto interakci je třeba dohledat přímo při implementaci** (spec sama toto v kap. 7.2 označuje frází „doplnit dle komponenty drag&drop“) – nejde o rozpor, jen o otevřený detail.
- Přesné payloady pro `NAV_NEXT/BACK/PROG` (accompanying screen ID mapping) a `SCROLL_START/STOP` (`ScrollTop`, `Clientheight`, `TotalUIHeight`) byly vizuálně potvrzeny v `timss.js`, ale nebyly opisovány do detailu (kód se nekopíruje) – při implementaci enginu je nutné znovu nahlédnout do stejných řádků pro přesný název polí.

## Závěr

Katalog z kap. 7.2 specifikace **odpovídá zdrojovým souborům** – žádný trackId v katalogu nebyl shledán jako neexistující nebo chybný. Jediné doplnění je mechanismus u `PART2_CLOCK_START/STOP` (generováno dynamicky, ne jako literální řetězec) a otevřený detail u `MQ71A05B_T`. Doporučení: při implementaci kroku 3 (engine) nedoplňovat žádné další procesní události nad rámec tohoto katalogu, v souladu s rozhodnutím ve spec kap. 7.2.
