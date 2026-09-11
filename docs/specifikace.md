# Online test „Tučňáci nejmenší“ (TIMSS 2023, 4. ročník) – specifikace projektu

Stav k 11. 9. 2026. Dokument shrnuje analýzu offline Playeru a dohodnutá rozhodnutí. Slouží jako výchozí zadání pro vývoj (např. v Claude Code).

## 1. Cíl a rámec

- Nekomerční výzkum (ČŠI / UHK) s využitím **uvolněné úlohy** TIMSS 2023 „Little Penguins“ (M71A01–M71A07).
- **Vlastní, nezávislé řešení.** Z balíčku převzít pouze obsah (české texty, obrázky) a *popis* chování a procesních dat. Kód dodavatele (Sonet / Assessment Master) nekopírovat.
- Časový limit testu: **18 minut**.
- Pokyny (Directions) **zúžené** na nástroje, které Tučňáci používají.
- Přihlašovací okno žáka a okno pro začátek testu jako v originálu (viz kap. 6).
- Přihlašování přes generované ID (odlišné pro školy) a heslo.
- Procesní data sbírat **přesně v rozsahu a struktuře originálu, nic navíc** (viz kap. 7).
- Hosting zatím otevřený (server ČŠI, UHK nebo služba). Vrstvu ukládání navrhnout jako vyměnitelnou.
- Ověřit podmínky použití uvolněných úloh IEA a zajistit GDPR (souhlasy, pseudonymní ID, smlouva o zpracování).

## 2. Zdrojový balíček

Kořen: `G4_USB_TEST_FINAL_PLAYER/` (verze Playeru 3.133.0.59). Offline server: Apache + PHP (Yii 1.x), veškerý obsah je v souborech, žádná databáze. Uložená data žáků balíček neobsahuje.

| Co | Cesta (od `htdocs/`) |
|---|---|
| Obrazovky (HTML, EN + `_cs-CZ`) | `web/engine/packages/AssessmentMaster/Items/<složka>/<id>.html` |
| Obrázky k otázkám | `web/engine/packages/AssessmentMaster/Media/images/` (pokyny v podsložkách `27557`, `27561`) |
| Videa | `web/engine/packages/AssessmentMaster/Media/videos/` |
| Pozadí obrazovek Tučňáků | `web/engine/packages/TIMSS2023MS/Resources/img/PSI/LittlePenguins/` |
| Styly úlohy | `web/engine/packages/TIMSS2023MS/Resources/css/sass/PSI/_littlePenguins.scss` |
| Chování úloh (TIMSS vrstva) | `web/engine/packages/TIMSS2023MS/Resources/js/timss.js` |
| Záznam událostí (obecný) | `web/engine/packages/common/widgets/eventTracker.js` |
| Struktura sešitů | `protected/runtime/organisations/<id>.json` (sekce `children` = pořadí, `resources` = mapování na HTML) |

Tučňáci jsou v sešitech **A_B06** (`18106.json`) a **A_B07** (`18695.json`). Referenční sešit pro ID aktivit: A_B07.

## 3. Obrazovky úlohy

Pravítko i kalkulačka jsou na všech obrazovkách vypnuté. Číselná pole používají virtuální klávesnici `math_min`: číslice 0–9, desetinná čárka, operátory − + · : =. Identifikátory odpovědí (`MQ…`) mají číslo o jedno nižší než kód obrazovky (číslují otázky v rámci úlohy).

| Obrazovka | activity_id (A_B07) | Soubor | Identifikátory odpovědí | Interakce |
|---|---|---|---|---|
| M71A01 Úvod | 155993 | 93021/228767 | – | Tlačítko pro start úlohy (událost `M71A01_NEXT`) |
| M71A02 Obrázky | 155994 | 93026/228936 | `MQ71A01_T` | Hottext: výběr obrázku s největším obsahem |
| M71A03 Výška | 155995 | 93037/228783 | `MQ71A02A_T`, `MQ71A02B_T`, `MQ71A02C_T` | 3 číselná pole |
| M71A04 Hmotnost | 155996 | 93033/228779 | `MQ71A03A_T` (řazení, pozice `MQ71A03AA`–`AE`), `MQ71A03B_T` | Řazení přetahováním + číselné pole |
| M71A05 Počet tučňáků | 155997 | 93687/250885 | `MQ71A04AA_T`, `MQ71A04AB_T` (posuvníky 3950–5050, krok 50), `MQ71A04B_T` | 2 posuvníky na rybí číselné ose + číselné pole |
| M71A06 Potrava | 155998 | 93036/253749 | `MQ71A05A_T` (volby `MQ71A05A_T_MQ71A05A__1`–`__4`), `MQ71A05B_T` | Výběr jedné možnosti + přetahování obrázků ryb do tabulky |
| M71A07 Příspěvek | 155999 | 93023/228769 | `MQ71A06A_T`, `MQ71A06B_T` | 2 číselná pole |

Poznámky: v `_cs-CZ` souborech zůstaly některé anglické systémové řetězce (např. „Select ONE statement“), ověřit podle náhledů, zda jsou viditelné. Verze obrázků `_RTL` nejsou potřeba. Správná řešení a pravidla bodování v balíčku nejsou, je třeba hodnoticí manuál k uvolněným úlohám.

## 4. Pokyny (zúžené)

| Původní | activity_id | Soubor | Rozhodnutí |
|---|---|---|---|
| DIR_START_G4 | 155928 | 97530/216851 | Nahradit přihlášením / „Začít“ |
| G4_DIR_01 Vítej | 155929 | 98624/233128 | Ponechat, text jen o matematice |
| G4_DIR_02 Hodiny, lišta, pravítko | 155930 | 98626/233129 | Bez pravítka; hodiny (18 min) a lišta procházení |
| G4_DIR_03 Výběr odpovědi | 155931 | 98628/233130 | Jen výběr jedné odpovědi + klik na obrázek |
| G4_DIR_04 Přetahování | 155932 | 98630/233131 | Ponechat |
| G4_DIR_05 Číselná klávesnice | 155933 | 98632/233474 | Ponechat, cvičení s celým číslem místo zlomku |
| G4_DIR_06 Psaní textu | 155934 | 98634/233149 | Vypustit |
| G4_DIR_07 Kreslení čar + video | 155935 | 98636/233151 | Vypustit |
| G4_DIR_08 Tipy (zedy, rolování) | 155937 | 98640/233475 | Ponechat |
| DIR_END_G4 | 155938 | 97532/216883 | Ponechat |

Volitelně: krátké cvičení na posuvník (typ z obrazovky M71A05).

## 5. Časový limit

- 18 minut na úlohu M71A01–M71A07 (pokyny se neměří). Měření začíná po zadání hesla na obrazovce začátku testu.
- Originál: upozornění „Zbývá ti 5 minut“ a dialog „Čas vypršel!“. Rozhodnout, zda upozornění ponechat při 18 minutách.

## 6. Přihlášení, začátek testu a pořadí obrazovek

### 6.1 Celkové pořadí

| # | Obrazovka | Předloha v originálu | Poznámka |
|---|---|---|---|
| 1 | Přihlášení žáka | `web/engine/packages/TIMSS/login.html` + `TIMSS2023MS/Resources/js/login.js`, `css/login.css` | ID + heslo |
| 2 | Začátek pokynů | `DIR_START_G4` (97530/216851), activity 155928 | Heslo od zadavatele, „Začít“ |
| 3–8 | Pokyny 1–5 a 8 (zúžené) | viz kap. 4 | |
| 9 | Konec pokynů | `DIR_END_G4` (97532/216883), activity 155938 | |
| 10 | Začátek testu | `PT2_START_G4` (97541/228926), activity 155965 | Text upravit na 18 minut a bez „Části 2“; heslo od zadavatele; start časovače |
| 11–17 | M71A01–M71A07 | viz kap. 3 | |
| 18 | Konec testu | `PT2_END_G4` (97542/216877), activity 155976 | Možnost vrátit se k otázkám, pak odeslat |
| 19 | Odhlášení | `Logoff` (`AssessmentMaster/logoff.html`), activity 175685 | |

### 6.2 Přihlašovací okno

- Formát originálu (validace v `login.js`): **ID žáka = 8 číslic**, **heslo = 5 alfanumerických znaků** (volitelně s `*` na konci). Převzít stejný formát.
- ID generovat ve stylu IEA: 4 číslice škola + 2 třída + 2 žák (ověřit s metodikou ČŠI). Generátor po školách, výstup CSV / tisknutelné kartičky pro zadavatele.
- Chybové stavy originálu: nesprávné ID nebo heslo, test již dokončen, souběžné přihlášení.
- České texty přihlašovacího okna v balíčku nejsou (šablona se plní z JS / serveru), převzít z náhledů obrazovek.
- Jména žáků nikdy v systému; párování ID–jméno zůstává ve škole. Heslo ukládat jen jako hash. Po odeslání testu přihlášení zablokovat, při výpadku umožnit pokračování.

### 6.3 Okna s heslem od zadavatele (začátek pokynů, začátek testu)

- Žák čeká na heslo, které zadavatel sdělí třídě. Při chybném hesle se zobrazí upozornění.
- Zaznamenávané události (viz kap. 7): `DIRECTIONS_START` resp. `PART2_START` s daty `Booklet Part` („Directions“ / „Part2“), `login success`, `incorrect attempts`; při chybném hesle `POPUP_PW_INCORRECT_OPEN` a `POPUP_PW_INCORRECT_CLOSE` (klíč `timeStamp`). Kód: `timss.js` ř. ~9760–9815.
- Samotné přihlášení v přihlašovacím okně procesní událost v balíčku negeneruje (ověřit v Code fázi).

## 7. Procesní data – shodně s originálem

### 7.1 Struktura události

Každá událost se v originálu odesílá jako:

```json
{
  "activity_id": 155996,
  "event_data": {
    "trackId": "MQ71A03A_T",
    "startTime": 1789160412345,
    "data": { }
  }
}
```

- Časové značky: Unix čas v milisekundách (`new Date().getTime()`).
- Pozor na nekonzistenci originálu: události přes `trackEvents()` mají klíč `timeStamp`, události přes `componentEvents()` a `eventTracker` mají `startTime`. Pro shodnost zachovat.

### 7.2 Katalog událostí relevantních pro test

| trackId | Kdy | data |
|---|---|---|
| `SCREEN_LOADED` | Načtení obrazovky | `loadedScreenSequence`, `loadedScreenId`, `timeStamp` |
| `NAV_NEXT`, `NAV_BACK`, `NAV_PROG` | Další / zpět / skok přes lištu | `departureScreenSequence`, `destinationScreenSequence`, `departureScreenId`, `destinationScreenId` |
| `M71A01_NEXT` | Start úlohy tlačítkem na úvodní obrazovce | – |
| `DIRECTIONS_START`, `PART2_START` | Zadání hesla na začátku pokynů / testu | `Booklet Part`, `login success`, `incorrect attempts` |
| `POPUP_PW_INCORRECT_OPEN` / `_CLOSE` | Upozornění na chybné heslo | – (klíč `timeStamp`) |
| `PART2_CLOCK_START`, `PART2_CLOCK_STOP` | Start a konec měření času | – |
| `POPUP_FIVE_MINUTES_OPEN` / `_CLOSE` | Upozornění na 5 minut | (close: volitelně data) |
| `POPUP_TIME_UP_OPEN` / `_CLOSE` | Vypršení času | `event_attribute` |
| `SCROLL_ACTIVE` | Zda je na obrazovce posuvník | `"Y"` / `"N"` |
| `SCROLL_START`, `SCROLL_STOP`, `SCROLL_DRAG_START` / `_STOP` | Rolování | `ScrollTop`, `Clientheight`, `TotalUIHeight` resp. `scrollFrom`, `scrollTo` |
| `MQ71A01_T…` (hottext) | Klik na obrázek (M71A02) | při zrušení výběru `cleared: true` |
| `NUMBERPAD_OPEN` | Otevření číselné klávesnice | – |
| `<id pole>` např. `MQ71A02A_T` | Fokus / opuštění číselného pole | `type: "focus"`; při `blur` navíc `response` (LaTeX) |
| `MQ71A03A_T` | Přetažení při řazení (M71A04) | `dragged`, `dropped`, `endTime`, `response` (položka → dropzone) |
| `MQ71A04AA_T`, `MQ71A04AB_T` | Puštění posuvníku (M71A05) | `response` (hodnota) |
| `MQ71A05A_T_MQ71A05A__n` | Klik na volbu (M71A06 A) | `response` nebo `cleared: true, response: ""` |
| `MQ71A05B_T` | Přetažení obrázku ryby (M71A06 B) | `dragged` (+ doplnit dle komponenty drag&drop) |

- **Rozhodnutí: zaznamenávat pouze události, které zaznamenával originál, nic navíc.** Katalog výše je třeba v Code fázi ověřit proti zdrojovým souborům a doplnit, ne rozšiřovat.
- Stisky kláves na číselné klávesnici TIMSS nezaznamenává (v `eventTracker.js` je podmínka `!body.hasClass('timss')`), proto se nezaznamenávají.
- V HTML obrazovek jsou atributy `HIGHLIGHT_TOOL` a `SCROLL_DRAG`. Ověřit podle náhledů, zda byl nástroj zvýrazňovač žákům dostupný.
- Před implementací dočíst přesný payload: `timss.js` ř. ~2770–2830 (řazení), ~3236–3262 (posuvníky), ~4075–4090 a ~5137–5160 (ukládání odpovědí), ~9150–9330 (čas, navigace), ~10120–10140 (rolování); komponenta drag&drop v `AssessmentMaster/Resources/build/js/assessment-master.min.js`.

### 7.3 Výstupy

- `events.csv`: `student_id, activity_id, screen_id, trackId, startTime, timeStamp, endTime, data_json` (jedna událost na řádek).
- `responses.csv`: jeden žák na řádek, sloupce podle identifikátorů odpovědí z kap. 3.
- Odesílání událostí po dávkách, při výpadku připojení podržet v prohlížeči a odeslat po obnovení.

## 8. Plán práce

1. Příprava projektu: GitHub repozitář (soukromý), struktura složek, lokální spuštění.
2. Extrakce obsahu (obrazovky 1–19 z kap. 6.1) do datových souborů (JSON) + kopie potřebných obrázků; ruční doplnění textů přihlašovacího okna z náhledů.
3. Vlastní webový engine: pořadí obrazovek, navigace, lišta, okna s heslem, časovač 18 min, 6 typů interakcí (hottext, číselné pole s klávesnicí, řazení, posuvník, výběr jedné možnosti, drag&drop do tabulky).
4. Záznam procesních dat přesně podle kap. 7, zpočátku export do souboru ke stažení.
5. Kontrola vzhledu a chování proti náhledům obrazovek originálu.
6. Generátor ID a hesel, napojení na úložiště (backend podle zvoleného hostingu).
7. Pilotáž ve škole, poté ostrý sběr.

## 9. Otevřené otázky

- Hosting a úložiště dat (ČŠI / UHK / služba v EU).
- Hodnoticí manuál k uvolněným úlohám (správná řešení, částečné bodování).
- Ponechat upozornění na 5 minut?
- Znění textů na obrazovce začátku a konce testu.
- Struktura ID žáka (škola/třída/žák) v souladu s metodikou ČŠI.
- Dostupnost zvýrazňovače v originálu.
- Případné další zkrácení pokynů (sloučení obrazovek 1–3).
