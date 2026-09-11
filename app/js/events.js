// Zaznam procesnich dat presne podle kap. 7 specifikace - jen udalosti z katalogu (kap. 7.2), nic navic.
// Pozor na nekonzistenci originalu (kap. 7.1): trackEvents() pouziva klic "timeStamp",
// componentEvents()/eventTracker pouziva "startTime". Zachovano schvalne, aby vystup odpovidal originalu.

function nowMs() {
  return new Date().getTime();
}

function currentActivityId() {
  const def = currentScreenDef();
  const data = findScreenData(def.code);
  return data ? data.activity_id : null;
}

function pushEvent(trackId, timeKey, data) {
  const evt = {
    activity_id: currentActivityId(),
    event_data: {
      trackId: trackId,
    },
  };
  evt.event_data[timeKey] = nowMs();
  if (data !== undefined) {
    evt.event_data.data = data;
  }
  AppState.events.push(evt);
  console.debug("[event]", trackId, evt);
}

// Odpovida puvodnimu trackEvents() - klic "timeStamp"
function logTrackEvent(trackId, data) {
  pushEvent(trackId, "timeStamp", data);
}

// Odpovida puvodnimu componentEvents()/eventTracker.saveData() - klic "startTime"
function logComponentEvent(trackId, data) {
  pushEvent(trackId, "startTime", data);
}

function exportEventsCsv() {
  const rows = ["student_id,activity_id,trackId,startTime,timeStamp,data_json"];
  AppState.events.forEach(function (e) {
    const d = e.event_data;
    rows.push([
      AppState.studentId || "",
      e.activity_id === null ? "" : e.activity_id,
      d.trackId,
      d.startTime || "",
      d.timeStamp || "",
      d.data ? JSON.stringify(d.data).replace(/"/g, '""') : "",
    ].map(function (v) { return '"' + String(v) + '"'; }).join(","));
  });
  return rows.join("\n");
}

function exportResponsesCsv() {
  const ids = Object.keys(AppState.responses).sort();
  const header = ["student_id"].concat(ids).join(",");
  const values = [AppState.studentId || ""].concat(ids.map(function (id) { return AppState.responses[id]; }));
  return header + "\n" + values.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(",");
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
