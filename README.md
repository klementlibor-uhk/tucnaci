# Tučňáci nejmenší – online test (TIMSS 2023, 4. ročník)

Nekomerční výzkumný projekt (ČŠI / UHK) využívající uvolněnou úlohu TIMSS 2023 „Little Penguins“
(M71A01–M71A07). Jde o vlastní, nezávislou implementaci: z originálního offline Playeru (Sonet /
Assessment Master, ve složce [`G4_USB_TEST_FINAL_PLAYER/`](G4_USB_TEST_FINAL_PLAYER)) se přebírá pouze
**obsah** (české texty, obrázky) a **popis** chování a procesních dat – kód dodavatele se nekopíruje.

Plná specifikace: [`docs/specifikace.md`](docs/specifikace.md).

## Stav projektu

- [x] Krok 1: struktura projektu
- [x] Krok 2: extrakce obsahu obrazovek 1–19 (kap. 6.1 specifikace) do JSON + obrázky
- [ ] Krok 3: vlastní webový engine (navigace, časovač, interakce)
- [ ] Krok 4: záznam procesních dat
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
G4_USB_TEST_FINAL_PLAYER/     – originální offline Player (jen pro čtení/referenci, nekopíruje se do enginu)
```

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

## Vývoj

Repozitář zatím bez závislostí/build systému – krok 3 (vlastní engine) teprve určí technologii.
