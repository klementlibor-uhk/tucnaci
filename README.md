# Tučňáci nejmenší – online test (TIMSS 2023, 4. ročník)

Nekomerční výzkumný projekt (ČŠI / UHK) využívající uvolněnou úlohu TIMSS 2023 „Little Penguins“
(M71A01–M71A07). Jde o vlastní, nezávislou implementaci: z originálního offline Playeru (Sonet /
Assessment Master, ve složce [`G4_USB_TEST_FINAL_PLAYER/`](G4_USB_TEST_FINAL_PLAYER)) se přebírá pouze
**obsah** (české texty, obrázky) a **popis** chování a procesních dat – kód dodavatele se nekopíruje.

Plná specifikace: [`docs/specifikace.md`](docs/specifikace.md).

## Stav projektu

- [x] Krok 1: struktura projektu
- [x] Krok 2: extrakce obsahu obrazovek 1–19 (kap. 6.1 specifikace) do JSON + obrázky
- [x] Krok 3: vlastní webový engine (navigace, časovač, 6 typů interakcí) - viz `app/`
- [x] Krok 4 (základ): záznam procesních dat dle katalogu kap. 7, export do CSV (tlačítka v patě aplikace)
- [ ] Krok 4 (dokončení): odesílání po dávkách na server, ne jen lokální export
- [ ] Krok 5: kontrola proti náhledům
- [ ] Krok 6: generátor ID/hesel, úložiště
- [ ] Krok 7: pilotáž

## Struktura repozitáře

```
docs/
  specifikace.md              – plná specifikace projektu (kopie zadání)
  event-catalog-overeni.md    – ověření katalogu procesních událostí (kap. 7) proti zdroji
data/
  screens/                    – 19 JSON souborů, jeden na obrazovku (viz kap. 6.1), obsah+texty+odkazy na obrázky
  media/
    images/
      littlepenguins/         – pozadí a obrázky specifické pro úlohu Tučňáci
      pokyny/27557, 27561/    – obrázky použité v obrazovkách Pokynů (Directions)
      common/                 – logo, sdílené obrázky
    reference-screenshots/    – 8 screenshotů obrazovek M71A01-M71A07 z náhledu (ověřovací materiál)
app/                           – vlastní webový engine (vanilla HTML/CSS/JS, bez závislostí)
  index.html
  css/style.css
  js/manifest.js              – pořadí obrazovek, časový limit, testovací heslo
  js/data.js                  – sbalený obsah z data/screens/*.json (generováno, needituje se ručně)
  js/state.js, events.js, timer.js, interactions.js, screens.js, app.js
serve.ps1, .claude/launch.json – lokální statický server pro vývoj/testování (spustí se přes "Preview")
G4_USB_TEST_FINAL_PLAYER/     – originální offline Player (jen pro čtení/referenci, nekopíruje se do enginu)
```

### Spuštění enginu lokálně

Otevřít `app/index.html` přímo v prohlížeči (dvojklikem) nefunguje spolehlivě (prohlížeče blokují
načítání souborů přes `file://`). Je potřeba jednoduchý lokální server – v tomto repozitáři je pro
tento účel `serve.ps1` (PowerShell, bez závislostí na Node/Python), spustitelný přes Claude Code
"Preview" (konfigurace `tucnaci-dev` v `.claude/launch.json`) nebo ručně: `powershell -File serve.ps1`
a otevřít `http://localhost:8080/app/index.html`. Testovací heslo pro obrazovky se zadáním od
zadavatele (Začátek pokynů, Začátek testu) je `0000` (viz `js/manifest.js`).

## Otevřené položky po extrakci (viz jednotlivé JSON soubory, pole `notes`/`decision`)

- **Přihlašovací okno (`data/screens/01_login.json`)** nemá žádný text ani v balíčku, ani v živém
  Playeru (potvrzeno screenshotem: jen ikony a šipka) – texty a chybové hlášky je nutné navrhnout od nuly.
- **Obrazovka po konci testu (`data/screens/19_logoff.json`)**: v originále po Části 2 následuje žákovský
  dotazník, nikoli logoff.html – ta obrazovka tedy není použitelná ani jako vzor obsahu, ani chování.
  Projekt Tučňáci žádný dotazník nemá (mimo rozsah), takže závěrečnou obrazovku po testu musíme navrhnout
  úplně samostatně – otevřené rozhodnutí, viz pole `flow_decision_needed` v JSON a spec kap. 9.
- Několik obrazovek Pokynů vyžaduje textové úpravy podle rozhodnutí ve spec kap. 4 (zkrácení času
  36→18 minut, vypuštění zmínky o pravítku a "Části 2", nahrazení cvičení se zlomkem celým číslem) –
  označeno v příslušných JSON souborech polem `decision`/`notes`.
- Přesný payload živé události `MQ71A05B_T` (přetažení ryb, M71A06) není v dostupném zdroji jednoznačně
  dohledatelný – viz `docs/event-catalog-overeni.md`, sekce "Nedořešeno".

## Známé mezery enginu (krok 3, k dořešení v kroku 5 "Kontrola vzhledu a chování")

- **Přetahování (drag&drop) na dotykových zařízeních**: řazení tučňáků (M71A04) a přetahování ryb do
  tabulky (M71A06) používá nativní HTML5 drag&drop (`draggable`, `dragstart/dragover/drop`). To
  spolehlivě funguje myší, ale **na tabletech/dotykových obrazovkách nativní HTML5 drag&drop většinou
  nefunguje bez dalšího dopracování** (potřeba by byly dotykové/pointer events jako náhrada). Protože
  TIMSS testy běžně probíhají na tabletech, je to důležité doladit před pilotáží (krok 7).
- Rozvržení "task_screen" (levý panel + pravý panel s napodobeninou webové stránky) je navržené pro
  šířku obrazovky nad cca 900px; na užších oknech se pravý panel může vodorovně scrollovat.
- Ověření skutečného chování zvýrazňovače (highlighter) a přesný payload živé události `MQ71A05B_T`
  zůstává otevřené - viz `docs/event-catalog-overeni.md`.

## Vývoj

Vanilla HTML/CSS/JS, žádný build krok. Testováno end-to-end (login → pokyny → M71A01-M71A07 → konec
testu → závěrečná obrazovka) včetně časovače, hesel a všech 6 typů interakcí.
