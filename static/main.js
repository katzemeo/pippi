const ISSUE_WEBSITE_URL = "/items/";
const DEFAULT_SP_DAY_RATE = 0.8;
const MY_TEAM = "MY TEAM";
const NOW = new Date();
const MAX_FRAC_DIGITS = 1;
const _percentFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: MAX_FRAC_DIGITS }).format;
const _numFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format;
const PCT = function (value) { if (!isNaN(value)) { return _percentFormat(value); } return ""; };
const EFF = function (value) { if (!isNaN(value)) { return _numFormat(value); } return ""; };
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Toronto";
const EMPTY_TEAM = {
  sp_per_day_rate: null,
  completed: null,
  remaining: null,
  sprint: null
};

// Application state (to be persisted)
var _teams = {};
var _teamName = null;
var _SPDayRate = DEFAULT_SP_DAY_RATE;

// Application UI related state
var _sortOrders = {};
var _sortKey = "";
var _filterKey = null;
var _team = EMPTY_TEAM;
var _items = [];
var _toggleEditSPDayRate = false;
var _refresh = true;
var _userInfo = null;

function clearState() {
  _teams = {};
  _teamName = null;
  _SPDayRate = DEFAULT_SP_DAY_RATE;
}

window.onload = function () {
  refreshTeam();
  if (restoreFromStorage()) {
    if (_teamName) {
      showTeam(_teamName);
    }
  }
  configureAutomaticSave();

  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  });
};

var _modified = false;
var _state = null;
const saveToStorage = (force=false) => {
  if (localStorage && (_modified || force)) {
    _state = {};
    _state._teams = _teams;
    _state._teamName = _teamName;
    _state._SPDayRate = _SPDayRate;
    _state.lastModified = new Date();
    localStorage.setItem("katzemeo.pippi", JSON.stringify(_state));
    _modified = false;
    writeMessage("Saved to local storage (Updated: "+ formatTime(_state.lastModified) +")");
  } else if (!localStorage) {
    writeMessage("Local storage not supported!");
  }
};

const restoreFromStorage = () => {
  if (localStorage) {
    _state = localStorage.getItem("katzemeo.pippi");
    if (_state) {
      try {
        _state = JSON.parse(_state);
        _teams = _state._teams ?? {};
        _teamName = _state._teamName;
        _SPDayRate = _state._SPDayRate ?? DEFAULT_SP_DAY_RATE;
        writeMessage("Restored from local storage (Updated: "+ formatTime(_state.lastModified) +")");
        return true;
      } catch (error) {
        console.log(error);
      }
    }
    _modified = false;
  } else if (!localStorage) {
    writeMessage("Local storage not supported!");
  }
  return false;
};

const deleteLocalStorage = () => {
  var r = confirm("Are you sure you want to delete all?");
  if (r != true) {
    return;
  }

  if (localStorage) {
    localStorage.removeItem("katzemeo.pippi");
    writeMessage("Removed state from local storage. Refreshing...");
    clearState();
    setTimeout(function() { document.location.reload(true); }, 1000);
  } else {
    writeMessage("Local storage not supported!");
  }
};

const configureAutomaticSave = () => {
  if (localStorage) {
    setInterval(saveToStorage, 60 * 1000);
    window.onbeforeunload = saveToStorage;
  } else {
    writeMessage("Local storage not supported!");
  }
};

function formatDate(dt, timeZone = TIME_ZONE) {
  return dt ? new Date(dt).toLocaleDateString('en-us', { timeZone: timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "";
}

function formatTime(dt, timeZone = TIME_ZONE) {
  return dt ? new Date(dt).toLocaleTimeString('en-us', { timeZone: timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "";
}

function sortBy(key) {
  _sortKey = key;
  _sortOrders[key] = (!_sortOrders[key] ? 1 : _sortOrders[key]) * -1;
  renderItems();
}

function searchKey(key) {
  var value = document.getElementById(key).value;
  _filterKey = value;
  renderItems();
}

function updateItemForTeam(item, team) {
  if (!item.remaining) {
    if (item.status == "COMPLETED") {
      item.remaining = 0;
    } else {
      item.remaining = item.estimate;
    }
  }

  if (!item.computed_effort) {
    item.computed_effort = (item.completed ?? 0) + item.remaining;
  }

  if (item.completed && item.computed_effort > 0) {
    item.progress = toFixed(item.completed * 100 / item.computed_effort);
  }

  if (item.due || item.sprint_start || item.sprint_end) {
    let notes = `<ul>`;
    if (item.due) {
      notes += `<li>Due: ${formatDate(item.due)}</li>`;
    }
    if (item.sprint_start) {
      notes += `<li>Start: ${item.sprint_start}</li>`;
    }
    if (item.sprint_end) {
      notes += `<li>End: ${item.sprint_end}</li>`;
    }
    notes += `</ul>`;
    item.computed_notes = notes;
  }
}

function processTeamMembers(data, team) {
  if (data.members) {
    if (!team.members) {
      team.members = {};
    }
    data.members.forEach((member) => {
      team.members[member.id] = member;
    });  
  }
}

function processTeamItems(data) {
  let team = _teams[data.name];
  if (!team) {
    team = {
      name: data.name
    };
  }

  team.name = team.name ?? MY_TEAM;
  team.squad = data.squad ?? team.squad ?? "My Squad";
  team.sp_per_day_rate = data.sp_per_day_rate ?? team.sp_per_day_rate ?? _SPDayRate ?? DEFAULT_SP_DAY_RATE;
  team.items = data.items ?? team.items;
  team.capacity = data.capacity ?? team.capacity;
  team.sprint = data.sprint ?? team.sprint;
  processTeamMembers(data, team);

  if (!_teams[team.name] || team.squad !== _teams[team.name].squad) {
    _teamName = team.name;
    _teams[team.name] = team;
    _modified = true;
  }

  refreshTeam(team);
    
  return team;
}

function findItemByJira(team, jira) {
  for (let i=0; i<team.items.length; i++) {
    if (team.items[i].jira === jira) {
      return team.items[i];
    }
  }
  throw new Error(`Unable to find item for specified jira ${jira}!`);
}

function appendItem(parentEl, innerHTML, className = null) {
  let li = document.createElement("li");
  if (innerHTML) {
    li.innerHTML = innerHTML;
  }
  if (className) {
    li.className = className;
  }
  parentEl.appendChild(li);
}

function refreshTeam(team = _team) {
  // Link items to squad name.
  if (team.items && team.squad) {
    team.items.forEach(item => {
      item.computed_squad = team.squad;
      updateItemForTeam(item, team);
    });
  }

  // Build teams picker based
  let el = document.getElementById("teams");
  removeChildren(el);

  const numTeams = Object.keys(_teams).length;
  if (numTeams > 1) {
    createTeamMI(el, MY_TEAM, MY_TEAM, false);
  } else if (numTeams < 1) {
    appendItem(el, `<a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#uploadFile">Upload JSON File...</a>`);
  }

  for (const key in _teams) {
    let t = _teams[key];
    //console.log(team);
    createTeamMI(el, t.name, t.squad);
  };

  setTeam(team);
}

//<li><a class="dropdown-item" href="#">Team</a></li>
function createTeamMI(el, name, squad, removeOption = true) {
  let li = document.createElement("li");
  let a = document.createElement("a");
  a.className = "dropdown-item";
  a.href = `javascript:showTeam("${name}")`;
  a.innerHTML = removeOption ? createRemoveTeam(name, squad) : `<span class="me-1" title="Show Team">${name}</span>`;
  li.appendChild(a);
  el.appendChild(li);
}

function createRemoveTeam(name, squad) {
  return `<span class="me-1" title="Show Team">${squad} - ${name}</span><button class="btn btn-muted mx-1" title="Remove Team" onclick="deleteTeam(\'${name}\')"><i class="material-icons custom">delete</i></button>`;
}

function showMyTeam() {
  var team = {
    squad: MY_TEAM,
    items: [],
    capacity: 0,
  };

  for (const key in _teams) {
    let squad = _teams[key];
    if (!team.date) {
      team.date = squad.date;
      team.sp_per_day_rate = squad.sp_per_day_rate;
    }
    if (squad.items) {
      team.items.push(...squad.items);
    }

    if (squad.capacity && !isNaN(team.capacity)) {
      team.capacity += squad.capacity;
    }
  };

  setTeam(team);
}

function showTeam(teamName) {
  if (_teamName !== teamName) {
    _teamName = teamName;
    _modified = true;
  }
  if (teamName == MY_TEAM) {
    showMyTeam();
  } else {
    if (_teams[teamName]) {
      setTeam(_teams[teamName]);
    } else {
      //console.log("Team removed!");
    }
  }
}

function removeTeam(teamName) {
  delete _teams[teamName];
  let team;
  if (Object.keys(_teams).length > 0) {
    team = Object.values(_teams)[0];
    _teamName = team.name;
  } else {
    team = EMPTY_TEAM;
    _teamName = null;
  }
  _modified = true;

  refreshTeam(team);
}

function setTeam(team) {
  const resetUI = (_team !== team);
  _team = team;

  if (resetUI) {
    _SPDayRate = team ? team.sp_per_day_rate : DEFAULT_SP_DAY_RATE;
    _sortKey = "";
    _filterKey = null;
    _refresh = true;
  }

  if (!team.time_zone) {
    team.time_zone = TIME_ZONE;
  }

  let el;

  // Enable appropriate elements when team is loaded
  if (team.items) {
    el = document.getElementById("show_completed");
    el.classList.remove("disabled");
    el = document.getElementById("show_pending");
    el.classList.remove("disabled");
    el = document.getElementById("show_blocked");
    el.classList.remove("disabled");
  } else {
    el = document.getElementById("show_completed");
    el.classList.add("disabled");
    el = document.getElementById("show_pending");
    el.classList.add("disabled");
    el = document.getElementById("show_blocked");
    el.classList.add("disabled");
  }

  el = document.getElementById("global_search");
  el.value = _filterKey;

  _date = _team.date ? new Date(_team.date) : new Date(NOW);
  refreshTeamDate();
  enableDisableNavigation();
  renderItems();

  el = document.getElementById("team_name");
  let capacity = `SP:  ${_team.capacity ?? "Unknown"}`;
  if (_team.capacity && _team.computed_effort) {
    if (_team.capacity >= _team.computed_effort) {
      capacity += `, Unused: ${EFF(_team.capacity - _team.computed_effort)}`;
    } else {
      capacity += `, <strong class="text-danger">Over: ${EFF(_team.computed_effort - _team.capacity)}</strong>`;
    }
  }
  el.innerHTML = (_team.squad ?? _team.name ?? "") +" ("+ capacity +")";
  el.title = `${formatDate(NOW)} - ${team.time_zone}`;
}

function refreshTeamDate(showTime = false, timeZone = TIME_ZONE) {
  if (_date) {
    let dateFormatted;
    if (showTime) {
      dateFormatted = formatTime(_date, timeZone);
    } else {
      dateFormatted = formatDate(_date, timeZone);
    }
    let el = document.getElementById("team_date");
    el.innerHTML = `${_team.sprint ?? "&lt;&lt;PI Planning&gt;&gt;"}<br>${dateFormatted}`;
  }
}

function uncheckSelectTeamCB() {
  const el = document.getElementById("selectTeamCB");
  el.checked = false;
}

function writeSummary() {
  let msg = "";
  let numCompleted = 0;
  let numInProgress = 0;
  let numBlocked = 0;
  let numReady = 0;
  let numPending = 0;
  let numBacklog = 0;
  if (_items) {
    _items.forEach(item => {
      if (item.status === "COMPLETED") {
        numCompleted++;
      } else if (item.status === "INPROGRESS") {
        numInProgress++;
      } else if (item.status === "BLOCKED") {
        numBlocked++;
      } else if (item.status === "READY") {
        numReady++;
      } else if (item.status === "PENDING") {
        numPending++;
      } else if (item.status === "BACKLOG") {
        numBacklog++;
      } 
    });

    msg += `Completed: ${numCompleted}`;
    if (numInProgress > 0) {
      msg += `, In Progress: ${numInProgress}`;
    }
    if (numBlocked > 0) {
      msg += `, Blocked: ${numBlocked}`;
    }
    if (numReady > 0) {
      msg += `, Ready: ${numReady}`;
    }
    if (numPending > 0) {
      msg += `, Pending: ${numPending}`;
    }
    if (numBacklog > 0) {
      msg += `, Backlog: ${numBacklog}`;
    }
    writePrefix("SUMMARY");
  }

  writeMessage(msg);
}

function toggleEditSPDayRate(labelId, inputId) {
  var labelEl = document.getElementById(labelId);
  var inputEl = document.getElementById(inputId);
  _toggleEditSPDayRate = !_toggleEditSPDayRate;
  if (_toggleEditSPDayRate) {
    labelEl.style.display = "none";
    inputEl.style.display = "block";
    inputEl.value = _SPDayRate ?? "";
  } else {
    inputEl.style.display = "none";
    labelEl.style.display = "block";
  }
}

function updateSPDayRate(labelId, inputId, done) {
  var el = document.getElementById(inputId);
  const rate = Number(el.value);
  if (el && rate >= 0 && rate < 2) {
    _SPDayRate = rate;
  } else {
    _SPDayRate = _team.sp_per_day_rate;
    el.value = _SPDayRate;
  }

  if (done) {
    _modified = true;
    toggleEditSPDayRate(labelId, inputId);
  }
  renderItems();
}

function filterItems() {
  var filterKey = _filterKey && _filterKey.toLowerCase();
  var order = _sortOrders[_sortKey] || 1;
  var items = _team.items;
  if (filterKey) {
    items = items.filter(function (row) {
      return Object.keys(row).some(function (key) {
        return (
          String(row[key])
            .toLowerCase()
            .indexOf(filterKey) > -1
        );
      });
    });
  }
  if (_sortKey) {
    items = items.slice().sort(function (a, b) {
      a = a[_sortKey];
      b = b[_sortKey];
      if (!a) a = "";
      if (!b) b = "";
      return (a === b ? 0 : a > b ? 1 : -1) * order;
    });
  }
  return items;
}

function enableDisableNavigation() {
 // Empty
}

function showCompleted(key) {
  toggleSearchKey(key, "completed");
}

function showPending(key) {
  toggleSearchKey(key, "pending");
}

function showBlocked(key) {
  toggleSearchKey(key, "blocked");
}

function toggleSearchKey(key, value) {
  const el = document.getElementById(key);
  if (el.value == value) {
    el.value = "";
  } else {
    el.value = value;
  }
  searchKey(key);
}

const removeChildren = (parent, header = 0) => {
  while (parent.lastChild && parent.childElementCount > header) {
    parent.removeChild(parent.lastChild);
  }
};

function renderCell(row, value, colspan) {
  let cell = document.createElement("td");
  if (colspan) {
    cell.setAttribute("colspan", colspan);
  }
  cell.innerHTML = value ?? "N/A";
  row.appendChild(cell);
  return cell;
}

function writePrefix(prefix) {
  const el = document.getElementById("message-prefix");
  el.innerHTML = prefix;
}

function writeMessage(msg, consolelog=false) {
  const el = document.getElementById("message-text");
  el.value = msg;
  if (consolelog) {
    console.log(msg);
  }
}

function writeStats(stats, title) {
  const el = document.getElementById("message-stats");
  el.innerHTML = stats;
  el.title = title;
}

function writePercent(percent, title) {
  const el = document.getElementById("message-percent");
  el.innerText = percent;
  el.title = title;
}

async function postFile(blob, fileName, data, onSuccess) {
  if (data === "items") {
    postItemsFile(blob, fileName, onSuccess);
  }
}

async function postItemsFile(blob, fileName, onSuccess) {
  const formData = new FormData();
  formData.append("jsonFile", blob, fileName);
  fetch("/items/upload", {
    mode: 'no-cors',
    method: 'POST',
    body: formData
  }).then((res) => {
    //console.log(response.status);
    if (res.status == 200) {
      res.json().then((data) => {
        //console.log(data);
        processTeamItems(data);
        onSuccess();
      });
    } else if (res.status == 413 || res.status == 415 || res.status == 422) {
      res.json().then((data) => {
        window.alert(data.msg);
      });
    } else if (res.status == 401) {
      onSuccess();
      showLogin();
    } else {
      window.alert("Unexpected response code " + res.status);
    }
  }).catch((error) => {
    console.error(error);
    window.alert("Unable to upload selected file.  Please try again.");
  });
}

function uploadFile(modal, data) {
  const input = document.getElementById('file');
  if (!input.files[0]) {
    alert("Please choose a file before clicking 'Upload'");
    return;
  }

  const file = input.files[0];
  const closeModal = () => { modal.hide() };
  postFile(file, input.files[0].name, data, closeModal);
}

function uploadJSONFile(data) {
  const modalEl = document.getElementById('uploadFile')
  const modal = bootstrap.Modal.getInstance(modalEl);
  uploadFile(modal, data);
}

async function deleteTeam(teamName) {
  removeTeam(teamName);
}

function writeTeam(msg, id) {
  const message = document.getElementById(id);
  removeChildren(message);
  const b = document.createElement('b');
  b.innerHTML = msg;
  message.appendChild(b);
  return b;
}

function convertToSP(value, unit) {
  if (_SPDayRate && !isNaN(_SPDayRate)) {
    if (unit == "DAY") {
      value *= _SPDayRate;
    }
    return value;
  }
  console.log("convertToSP() - unknown conversion rate!");
  return 0;
}

function convertToDay(value) {
  if (_SPDayRate && !isNaN(_SPDayRate)) {
    return value /= _SPDayRate;
  }
  console.log("convertToDay() - unknown conversion rate!");
  return 0;
}

function toFixed(n) {
  return Number(n.toFixed(MAX_FRAC_DIGITS+2));
}

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

function toggleSelection(select) {
  let selection = document.querySelectorAll('input[name = selectTeam]');
  if (selection && selection.length > 0) {
    selection.forEach((e) => {
      e.checked = select;
    });
    computeStats();
  }
}

function computeStats() {
  let selection = document.querySelectorAll('input[name = selectTeam]:checked');
  if (!selection || selection.length < 1) {
    writeStats("None", "");
    writePercent("%", "");
  } else {
    let count = 0;
    let sum = 0;
    let gainLoss = 0;
    let percent = 0;
    selection.forEach((e) => {
      count++;
      sum += convertToSP(Number(e.getAttribute("data-estimate")), e.getAttribute("data-unit"));
      gainLoss += convertToSP(Number(e.getAttribute("data-gain_loss_amt")), e.getAttribute("data-unit"));
      percent += Number(e.getAttribute("data-team_pct"));
    });

    const label = "Gain";
    const title = `${count} selected, ${label}: ${EFF(gainLoss)} SP`;
    writeStats(EFF(sum) + " SP", title);
    writePercent(`${PCT(percent)} %`, "Team %");
  }
}

function createSelectionCheck(item) {
  let markup = `<input class="form-check-input" name="selectTeam" data-gain_loss_amt="${item.gain_loss_amt ?? 0}" data-estimate="${item.computed_effort ?? 0}" data-unit="${item.unit}" data-team_pct="${item.computed_team_pct ?? 0}" title="Stats" onchange="computeStats()" type="checkbox" value="" />`;
  return markup;
}

function createPriorityLink(item) {
  let markup = `<div class="row">`;

  markup += `<div class="col">${(item.priority >= 0) ? item.priority: ""}</div>`;
  if (item.computed_notes) {
    markup +=
    `<div class="col" style="padding-top:4px">
        <a tabindex="0" title="${item.type} ${item.jira ?? ""} Notes" data-bs-toggle="popover" data-bs-trigger="focus" data-bs-content="${escapeHtml(item.computed_notes)}">
          <i class="material-icons row">event_note</i>
        </a>
      </div>`;
  }
  markup += `</div>`;

  return markup;
}

function createIssueAnchor(item) {
  let className = "text-primary";
  if (item.type === "FEAT" || item.type === "EPIC") {
    className += " text-decoration-underline";
  }
  return `<a class="${className} text-decoration-none" href="${ISSUE_WEBSITE_URL}${item.jira}" target="item_jira">${item.jira}</a>`;
}

function createIssueLink(item) {
  let markup = `<div class="row">`;
  if (item.jira) {
    markup += `<div class="col">${createIssueAnchor(item)}</div>`;
  }
  markup += `</div>`;

  return markup;
}

function createSummaryLink(item) {
  let markup = `<div class="row">`;
  if (item.children) {
    let className = "text-primary";
    markup += `<div class="col"><a class="${className} text-decoration-none" href="javascript:showChildren('${item.jira}')">${item.summary}</a>
    </div>`;
  } else {
    markup += `<div class="col"><nobr>${item.summary}</nobr></div>`;
  }
  markup += `</div>`;

  return markup;
}

const RED = "color:#F93154";
const GREEN = "color:#00B74A";
const AMBER = "color:#FFA900";

function renderItems() {
  if (!_SPDayRate || isNaN(_SPDayRate)) {
    _SPDayRate = _team.sp_per_day_rate ?? DEFAULT_SP_DAY_RATE;
  }
  _items = filterItems();

  let teamTotalEffort = _team.computed_effort;
  let totalCompleted = _team.completed;
  let totalRemaining = _team.remaining;

  // Re-compute in case filtered or SP Day rate was changed
  if (_items && (_refresh || _filterKey || _SPDayRate != _team.sp_per_day_rate)) {
    if (_refresh || _filterKey) {
      teamTotalEffort = _team.items.reduce((sum, i) => sum + convertToSP(Number(i["computed_effort"] ?? 0), i["unit"]), 0.0);
    }
    totalCompleted = _items.reduce((sum, i) => sum + convertToSP(Number(i["completed"] ?? 0), i["unit"]), 0.0);
    totalRemaining = _items.reduce((sum, i) => sum + convertToSP(Number(i["remaining"] ?? 0), i["unit"]), 0.0);
  }

  let hasBlockers = false;
  let totalEffort = totalCompleted + totalRemaining;
  let remainingPct = totalRemaining * 100 / totalEffort;

  uncheckSelectTeamCB();
  const mytable = document.getElementById("items");
  removeChildren(mytable);
  if (_items && _items.length > 0) {
    let n = 1;
    _items.forEach(item => {
      // Re-compute team pct in case SP Day rate was changed
      if (teamTotalEffort > 0) {
        item.computed_team_pct = toFixed(convertToSP(item.computed_effort, item.unit) * 100 / teamTotalEffort);
      }

      let row = document.createElement("tr");
      let cell;

      cell = renderCell(row, n);
      cell.className = "text-muted";
      if (item.computed_squad) {
        cell.title = item.computed_squad;
      }

      cell = renderCell(row, createSelectionCheck(item));
      cell.className = "text-muted";

      cell = renderCell(row, item.theme);
      if (item.t_shirt_size) {
        cell.title = item.t_shirt_size;
      }

      cell = renderCell(row, createPriorityLink(item));
      if (item.client) {
        cell.title = item.client;
      }

      cell = renderCell(row, createIssueLink(item));

      cell = renderCell(row, createSummaryLink(item));
      if (item.description) {
        cell.title = item.description;
      }

      cell = renderCell(row, item.type);
      if (item.estimate) {
        let estimate = "Estimate: " + item.estimate + " " + item.unit;
        if (item.unit !== "SP") {
          estimate += " (" + EFF(convertToSP(item.estimate, item.unit)) + " SP)";
        }
        cell.title = estimate;
      }

      if (item.progress) {
        const completed = EFF(convertToSP(item.completed, item.unit));
        cell = renderCell(row, `${PCT(item.progress)}% (${completed} SP)`);
        cell.title = "Remaining: " + EFF(convertToSP(item.remaining, item.unit)) + " SP";
      } else {
        cell = renderCell(row, "");
      }

      let note = "";
      const effort = EFF(convertToSP(item.computed_effort, item.unit));
      let noteTitle = "";
      if (item.estimate && item.computed_effort > item.estimate) {
        note = "*";
        noteTitle += "Over Estimate: "+ EFF(convertToSP(item.computed_effort - item.estimate, item.unit)) +" SP";
      }
      cell = renderCell(row, item.status+note);
      if (item.status === "COMPLETED") {
        cell.style = GREEN;
      } else if (item.status === "INPROGRESS") {
        cell.style = AMBER;
      } else if (item.status === "PENDING") {
        cell.style = AMBER;
      } else if (item.status === "BLOCKED") {
        cell.style = RED;
        hasBlockers = true;
      }
      cell.title = noteTitle;

      if (item.computed_effort > 0) {
        cell = renderCell(row, `${PCT(item.computed_team_pct)}% (${effort} SP)`);
      } else {
        cell = renderCell(row, "");
      }
      if (item.assignee) {
        cell.title = "Assignee: " + item.assignee;
        item.computed_unassigned = "Assignee";
      } else {
        cell.title = "Unassigned";
        item.computed_unassigned = "Unassigned";
      }

      mytable.appendChild(row);
      n++;
    });

    if (_refresh) {
      // Cache computed values to support subsequent rendering (e.g. filtering or sorting)
      _team.computed_effort = teamTotalEffort;
      _team.completed = totalCompleted;
      _team.remaining = totalRemaining;
      _refresh = false;
    }

    // Warning: may not be performant
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl, { html: true });
    });
  } else {
    let row = document.createElement("tr");
    let msg = "Please upload team items via JSON file";
    if (_items) {
      msg = "No matching items found.";
    }
    renderCell(row, msg, 10);
    mytable.appendChild(row);
  }

  writeTeam(_SPDayRate, "sp_per_day_rate");

  let el;
  el = writeTeam(EFF(totalCompleted), "team_completed");
  el.title = EFF(convertToDay(totalCompleted)) + " DAY";

  el = writeTeam(EFF(totalEffort), "team_total");
  el.title = EFF(convertToDay(totalEffort)) + " DAY";

  let msg = `<span class="fs-2">${PCT(remainingPct)}%</span>&nbsp;&nbsp;&nbsp;`;
  el = writeTeam(msg + EFF(totalRemaining)+" SP", "team_remaining");
  if (totalRemaining <= 0 && _items && _items.length > 0) {
    const label = writeTeam("Items Completed!", "team_status");
    label.title = "Please schedule demos for completed items!";
    el.style = GREEN;
  } else if (totalRemaining > 0) {
    const label = writeTeam("Remaining Effort", "team_status");
    if (hasBlockers) {
      label.title = "Please resolve blockers!";
      el.style = RED;
    } else {
      el.style = AMBER;
    }
  } else {
    writeTeam("", "team_status");
  }
  el.title = EFF(convertToDay(totalRemaining)) + " DAY";

  writeSummary();
  computeStats();
}

var _childrenItems = [];
var _childrenFilterKey = null;
var _childrenSortKey = null;
var _childrenSortOrder = {};

function findItemByJira(jira, items=_items) {
  if (items) {
    for (let i=0; i<items.length; i++) {
      if (items[i].jira === jira) {
        return items[i];
      } else if (items[i].children) {
        let item = findItemByJira(jira, items[i].children);
        if (item) {
          return item;
        }
      }
    }
  }
  return null;
}

function showChildren(parentJira) {
  const options = { backdrop: "static" };
  const modal = new bootstrap.Modal(document.getElementById('itemChildren'), options);
  const parent = findItemByJira(parentJira);

  _childrenItems = [];
  if (parent.children) {
    parent.children.forEach((item) => {
      _childrenItems.push(item);
      if (item.children) {
        _childrenItems.push(...item.children);
      }
    });
  }

  const label = document.getElementById("childrenItemsLabel");
  removeChildren(label);
  label.innerHTML = `${createIssueAnchor(parent)} (${parent.t_shirt_size}: ${parent.computed_effort} ${parent.unit}) - ${parent.summary}`;

  const statusEl = document.getElementById("parentItemLabel");
  removeChildren(statusEl);

  let progress = "";
  if (parent.progress) {
    const completed = EFF(convertToSP(parent.completed, parent.unit));
    progress = ` - ${PCT(parent.progress)}% (${completed} SP) Completed`;
  }

  statusEl.innerHTML = `${parent.status}${progress}`;
  if (parent.status === "COMPLETED") {
    statusEl.style = GREEN;
  } else if (parent.status === "INPROGRESS") {
    statusEl.style = AMBER;
  } else if (parent.status === "PENDING") {
    statusEl.style = AMBER;
  } else if (parent.status === "BLOCKED") {
    statusEl.style = RED;
  }

  document.getElementById("children_search").value = "";
  _childrenFilterKey = null;
  renderChildrenItems();

  modal.show();
}

function renderChildrenItems() {
  const mytable = document.getElementById("children_items");
  removeChildren(mytable);

  const items = filterChildrenItems();
  let n = 1;
  let row;
  let cell;
  items.forEach(item => {
    row = document.createElement("tr");
    cell = renderCell(row, n);
    cell.className = "text-muted";

    cell = renderCell(row, createIssueLink(item));
    if (item.parent_jira) {
      cell.title = `Parent: ${item.parent_jira}`;
    }

    cell = renderCell(row, item.summary);
    if (item.description) {
      cell.title = item.description;
    }

    if (item.type !== "EPIC") {
      cell = renderCell(row, item.sprint);
    } else {
      cell = renderCell(row, "");
    }

    cell = renderCell(row, item.type);
    if (item.type === "EPIC") {
      cell.className = "text-muted";
    }
    if (item.depends_on) {
      cell.title = `Depends on: ${item.depends_on}`;
    }

    if (item.assignee) {
      let assigneeName = item.assignee;
      if (_team.members) {
        const assignee = _team.members[item.assignee];
        assigneeName = assignee ? assignee.name : item.assignee;  
      }

      cell = renderCell(row, assigneeName);
      cell.title = "Assignee: " + item.assignee;
      item.computed_unassigned = assigneeName;
    } else {
      cell = renderCell(row, "");
      cell.title = "Unassigned";
      item.computed_unassigned = "Unassigned";
    }

    cell = renderCell(row, item.status);
    if (item.status === "COMPLETED") {
      cell.style = GREEN;
    } else if (item.status === "INPROGRESS") {
      cell.style = AMBER;
    } else if (item.status === "PENDING") {
      cell.style = AMBER;
    } else if (item.status === "BLOCKED") {
      cell.style = RED;
    }

    if (item.type === "EPIC") {
      cell = renderCell(row, item.computed_sp);
      cell.className = "text-muted";
      if (item.estimate) {
        cell.title = `Estimate: ${item.estimate}`;
      }
    } else {
      cell = renderCell(row, EFF(convertToSP(item.estimate, item.unit)));
    }

    mytable.appendChild(row);
    n++;
  });
}

function searchChildrenKey(key) {
  var value = document.getElementById(key).value;
  _childrenFilterKey = value;
  renderChildrenItems();
}

function filterChildrenItems() {
  var filterKey = _childrenFilterKey && _childrenFilterKey.toLowerCase();
  const sortKey = _childrenSortKey;
  var order = _childrenSortOrder[sortKey] || 1;
  var items = _childrenItems;
  if (filterKey) {
    items = items.filter(function (row) {
      return Object.keys(row).some(function (key) {
        return (
          String(row[key])
            .toLowerCase()
            .indexOf(filterKey) > -1
        );
      });
    });
  }

  if (sortKey) {
    items = items.slice().sort(function (a, b) {
      a = a[sortKey];
      b = b[sortKey];
      if (!a) a = "";
      if (!b) b = "";
      return (a === b ? 0 : a > b ? 1 : -1) * order;
    });
  }
  return items;
}

function sortChildrenBy(key) {
  _childrenSortKey = key;
  _childrenSortOrder[key] = (!_childrenSortOrder[key] ? 1 : _childrenSortOrder[key]) * -1;
  renderChildrenItems();
}

function copyToClipboard(text) {
  var tmpElement = document.createElement("input");
  tmpElement.value = text;
  document.body.appendChild(tmpElement);
  tmpElement.select();
  document.execCommand("copy");
  document.body.removeChild(tmpElement);
}

function copyItems() {
  let data = _team;
  if (data) {
    copyToClipboard(JSON.stringify(data, function (key, value) {
      if (key.startsWith("computed_")) {
        return undefined;
      }
      return value;
    }, 1));
    writeMessage(`Copied team "${data.name}" information to clipboard`);
  }
}