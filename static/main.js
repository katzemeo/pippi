const ISSUE_WEBSITE_URL = "/item/";

const JSON_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
};

var ANIMATE_SPEED = 1;
var SHOW_TEAM = false;
var SHOW_UNPLANNED = true;

const DEFAULT_SP_DAY_RATE = 0.8;
const MY_TEAM = "MY_TEAM";
const MY_SQUAD = "My Team";
const NOW = new Date();
const MAX_FRAC_DIGITS = 0;
const _percentFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: MAX_FRAC_DIGITS }).format;
const _numFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format;
const PCT = function (value) { if (!isNaN(value)) { return _percentFormat(value); } return ""; };
const EFF = function (value) { if (!isNaN(value)) { return _numFormat(value); } return ""; };
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Toronto";
const EMPTY_TEAM = {
  name: MY_TEAM,
  squad: MY_SQUAD,
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
var _teamNameParam = null;
var _sprintParam = null;
var _modeParam = null;
var _statusParam = null;
var _status = null;
var _poParam = null;
var _po = null;
var _assigneeParam = null;
var _assignee = null;
var _filterKeyParam = null;
var _filterKey = _filterKeyParam;
var _team = EMPTY_TEAM;
var _items = [];
var _toggleEditSPDayRate = false;
var _refresh = true;
var _userInfo = null;
var _ctrl = false;

function isEmpty(value) {
  return !value || ((typeof value) === "string" &&  value.trim() === "");
}

function clearState() {
  _teams = {};
  _teamName = _teamNameParam;
  _SPDayRate = DEFAULT_SP_DAY_RATE;
}

window.onload = function () {
  const url = new URL(window.location.href);
  if (url.searchParams.has("team")) {
    _teamNameParam = url.searchParams.get("team");
    _teamName = _teamNameParam;
  }
  if (url.searchParams.has("sprint")) {
    _sprintParam = url.searchParams.get("sprint");
  }
  if (url.searchParams.has("mode")) {
    _modeParam = url.searchParams.get("mode");
  }
  if (url.searchParams.has("status")) {
    _statusParam = url.searchParams.get("status");
    _status = toValueSet(_statusParam, true);
  }
  if (url.searchParams.has("po")) {
    _poParam = url.searchParams.get("po");
    _po = toValueSet(_poParam);
  }
  if (url.searchParams.has("assignee")) {
    _assigneeParam = url.searchParams.get("assignee");
    _assignee = toValueSet(_assigneeParam);
  }
  if (url.searchParams.has("filter")) {
    _filterKeyParam = url.searchParams.get("filter");
    setFilterKey(_filterKeyParam);
  }

  if (restoreFromStorage()) {
    if (_teamName) {
      showTeam(_teamName);
    }
  }
  refreshTeam();

  if (!_teamName || _sprintParam && _sprintParam !== _team.sprint) {
    loadMyTeam();
  }

  configureAutomaticSave();
  configurePopupListener();

  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, { trigger : 'hover' });
  });

  window.addEventListener('resize', () => {
    _refreshMap = true;
    if (_canvasMode && _canvasMap) {
      refreshMap();
    }
  });

  document.onkeydown = function (e) {
    if (e.key === "Control" || e.key === "Meta") {
      _ctrl = true;
      e.preventDefault();
    }
  };
  document.onkeyup = function (e) {
    if (e.key === "Control" || e.key === "Meta") {
      _ctrl = false;
      e.preventDefault();
    }
  };

  if (_modeParam === "map") {
    toggleItemMap();
  }
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
        _teamName = _teamNameParam ?? _state._teamName;
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
    _modified = false;
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
  _refreshMap = true;
  _modified = true;
}

function searchKey(key) {
  if (key) {
    var value = document.getElementById(key).value;
    _filterKey = value;  
  }
  renderItems();
  _refreshMap = true;
  updateCanvasSelection();
}

function updateItemForTeam(item, team) {
  if (!item.remaining) {
    if (item.status === "COMPLETED") {
      item.remaining = 0;
    } else if (item.status !== "INPROGRESS") {
      item.remaining = item.estimate;
    }
  }

  if (!item.computed_effort) {
    item.computed_effort = (item.completed ?? 0) + (item.remaining ?? 0);
  }

  if (item.completed && item.computed_effort > 0) {
    item.progress = toFixed(item.completed * 100 / item.computed_effort);
  }

  if (item.sprint_start || item.sprint_end || item.delta) {
    let notes = `<ul>`;
    if (item.sprint_start) {
      notes += `<li>START: ${item.sprint_start}</li>`;
    }
    if (item.sprint_end) {
      notes += `<li>END: ${item.sprint_end}</li>`;
    }

    if (item.delta && team.delta) {
      if (item.delta === "new") {
        const details = team.delta.added[item.jira];
        notes += `<li>REPORTER: ${lookupTeamMember(details.reporter)}</li>`;
        notes += `<li>ESTIMATE: ${details.estimate ?? "?"} SP</li>`;
      } else if (team.delta.updated) {
        const details = team.delta.updated[item.jira];
        if (details.diffs) {
          details.diffs.forEach((c) => {
            // TODO - support custom formatter based attribute 'key' (e.g. Date/Time)
            notes += `<li>${c.key.toUpperCase()}: ${c.old} &rarr; ${c.new}</li>`;
          });
        }
      }
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
      if (team.members[member.id]) {
        console.log(`Team member ${member.name} (${member.id}) is already in a squad!`);
      } else {
        team.members[member.id] = member;
        if (!member.role) {
          member.role = "TM";
        }
      }
    });
  }
}

function computeTotalSP(item, sortChildren = true) {
  if (!item.status) {
    item.status = "BACKLOG";
  }

  if (item.children) {
    let computed_sp = 0;
    let completed = 0;
    let remaining = 0;
    item.children.forEach((child) => {
      computed_sp += computeTotalSP(child);
      completed += child.completed ?? 0;
      remaining += child.remaining ?? 0;
    });
    if (!item.estimate) {
      item.estimate = computed_sp;
    }
    item.computed_sp = computed_sp;
    item.completed = completed;
    item.remaining = remaining;

    if (item.status === "COMPLETED" && item.remaining > 0) {
      console.warn(`computeTotalSP() - ${item.jira} is COMPLETED but remaining SP is ${item.remaining}!`);
    }
  
    if (sortChildren) {
      item.children.sort(function(a, b) {
        return compare(a, b, "jira");
      });
    }
    return computed_sp;
  }

  const sp = item.estimate ?? 0;
  if (item.status === "COMPLETED") {
    item.completed = sp;
    item.remaining = 0;
  } else {
    item.remaining = sp; // Assume full estimate SP remains until item is completed!
  }

  return sp;
}

function processTeamItems(data) {
  let team = _teams[data.name];
  if (!team) {
    team = {
      name: data.name
    };
  }

  team.id = data.id ?? team.id;
  team.name = data.name ?? team.name ?? MY_TEAM;
  team.squad = data.squad ?? team.squad ?? MY_SQUAD;
  team.sp_per_day_rate = data.sp_per_day_rate ?? team.sp_per_day_rate ?? _SPDayRate ?? DEFAULT_SP_DAY_RATE;
  team.items = data.items ?? team.items;
  team.capacity = data.capacity ?? team.capacity;
  team.base = data.base ?? team.base;
  team.sprint = data.sprint ?? team.sprint;
  team.delta = data.delta;
  team.date = data.date ?? team.date;
  team.loadIcons = data.loadIcons ?? team.loadIcons;
  team.chart1 = data.chart1;
  team.chart2 = data.chart2;
  if (data.recompute && team.items) {
    team.items.forEach((feat) => {
      computeTotalSP(feat);
    });
  }
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
      item.computed_team = team.name;
      item.computed_squad = team.squad;
      updateItemForTeam(item, team);
    });
  }

  // Build teams picker
  let el = document.getElementById("teams");
  removeChildren(el);

  const numTeams = Object.keys(_teams).length;
  if (numTeams > 1) {
    createTeamMI(el, MY_TEAM, MY_SQUAD, false);
  } else if (numTeams < 1) {
    appendItem(el, `<a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#uploadFile">Upload JSON File...</a>`);
  }

  for (const key in _teams) {
    let t = _teams[key];
    createTeamMI(el, t.name, t.squad);
  };

  setTeam(team);
}

function createTeamMI(el, name, squad, removeOption = true) {
  let li = document.createElement("li");
  let a = document.createElement("a");
  a.className = "dropdown-item";
  a.href = `javascript:showTeam("${name}")`;
  a.innerHTML = removeOption ? createRemoveTeam(name, squad) : `<span class="me-1" title="Show ${name}">${squad}</span>`;
  li.appendChild(a);
  el.appendChild(li);
}

function createRemoveTeam(name, squad) {
  return `<span class="me-1" title="Show ${name}">${squad} - ${name}</span><button class="btn btn-muted mx-1" title="Remove Team" onclick="deleteTeam(\'${name}\')"><i class="material-icons custom">delete</i></button>`;
}

function showMyTeam() {
  var team = {
    name: MY_TEAM,
    squad: MY_SQUAD,
    members: {},
    items: [],
    capacity: 0,
  };

  // Combine all squads into a single team (assumes no duplicates!)
  for (const key in _teams) {
    let squad = _teams[key];
    if (!team.date) {
      team.sprint = squad.sprint;
      team.date = squad.date;
      team.sp_per_day_rate = squad.sp_per_day_rate;
    }

    if (team.sprint !== squad.sprint) {
      team.sprint = MY_TEAM;
    }

    if (squad.members) {
      for (const memberId in squad.members) {
        // Ensure PO are within their home squad
        if (!team.members[memberId] || squad.members[memberId].role === "PO") {
          team.members[memberId] = squad.members[memberId];
        }
      }
    }

    if (squad.items) {
      team.items.push(...squad.items);
    }

    if (squad.capacity && !isNaN(team.capacity)) {
      team.capacity += squad.capacity;
    }
  }

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

function setFilterKey(filterKey) {
  _filterKey = filterKey;
  const el = document.getElementById("global_search");
  el.value = _filterKey;
}

function setTeam(team) {
  let el;
  const resetUI = (_team !== team);
  _team = team;

  if (resetUI) {
    _SPDayRate = team ? team.sp_per_day_rate : DEFAULT_SP_DAY_RATE;
    _sortKey = "";
    if (!_canvasMode) {
      _filterKey = _filterKeyParam;
    }
    _refresh = true;
    _refreshMap = true;

    el = document.getElementById("user_icon");
    if (el) {
      if (_team.id) {
        el.src = `/public/assets/${_team.id.toLowerCase()}.png`;
      } else {
        el.src = "/public/usericon.png";
      }
    }
  }

  if (!team.time_zone) {
    team.time_zone = TIME_ZONE;
  }

  // Enable appropriate elements when team is loaded
  if (team.items) {
    el = document.getElementById("show_completed");
    el.classList.remove("disabled");
    el = document.getElementById("show_inprogress");
    el.classList.remove("disabled");
    el = document.getElementById("show_ready");
    el.classList.remove("disabled");
    el = document.getElementById("show_pending");
    el.classList.remove("disabled");
    el = document.getElementById("show_blocked");
    el.classList.remove("disabled");
  } else {
    el = document.getElementById("show_completed");
    el.classList.add("disabled");
    el = document.getElementById("show_inprogress");
    el.classList.add("disabled");
    el = document.getElementById("show_ready");
    el.classList.add("disabled");
    el = document.getElementById("show_pending");
    el.classList.add("disabled");
    el = document.getElementById("show_blocked");
    el.classList.add("disabled");
  }

  setFilterKey(_filterKey);

  _date = _team.date ? new Date(_team.date) : new Date(NOW);
  refreshTeamDate();
  enableDisableNavigation();
  renderItems();
  if (_canvasMode) {
    refreshMap();
  }
  updateTeamNameCapacity();
}

function updateTeamNameCapacity() {
  el = document.getElementById("team_name");
  let capacity = `SP:  ${_team.capacity ?? "Unknown"}`;
  if (_team.capacityDelta) {
    if (_team.capacityDelta > 0) {
      capacity += `, Unused: ${EFF(_team.capacityDelta)}`;
    } else {
      capacity += `, <strong class="text-danger">Over: ${EFF(-_team.capacityDelta)}</strong>`;
    }
  }
  el.innerHTML = TEAM_NAME() +" ("+ capacity +")";
  el.title = `${formatDate(NOW)} - ${_team.time_zone}`;
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
    if (_team.delta) {
      el.innerHTML = `<a class="clickable" onclick="openPIPPI(window.self)">${SPRINT(_team.sprint)}</a><br><nobr>${dateFormatted}</nobr>`;
    } else {
      el.innerHTML = `${SPRINT(_team.sprint)}<br><nobr>${dateFormatted}</nobr>`;
    }
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

    msg += `COUNT: ${_items.length}`;
    if (numCompleted > 0) {
      msg += `, Completed: ${numCompleted}`;
    }
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

function toValueSet(v, toUpperCase) {
  let result = v;
  if (v) {
    if (toUpperCase) {
      v = v.toUpperCase();
    }
    let values = v.split(',');
    if (values.length > 0) {
      result = new Set(values);
    } else {
      result =  new Set();
      result.add(v);
    }
  }
  return result;
}

function valueIn(v, set) {
  if (v === set) {
    return true;
  } else if (set instanceof Set) {
    return set.has(v);
  }
  return false;
}

function filterItems() {
  var items = _team.items;
  if (items) {
    var filterKey = _filterKey && _filterKey.toLowerCase();
    var order = _sortOrders[_sortKey] || 1;
    if (_status || _po || filterKey) {
      //console.log(`filterItems() - status=${_status}, assignee=${_po}, filter=${filterKey}`);
      items = items.filter(function (row) {
        return ((isEmpty(_status) || valueIn(row["status"], _status) || (_status === "BLOCKED" && isBlocked(row))) &&
          (isEmpty(_po) || isEmpty(row["assignee"]) || valueIn(row["assignee"], _po)) &&
          (isEmpty(filterKey) || Object.keys(row).some(function (key) {
            return String(row[key]).toLowerCase().indexOf(filterKey) > -1
          })));
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
    } else {
      items = items.slice().sort(function (a, b) {
        let result = compare(a, b, "index");
        if (result === 0) {
          result = compare(a, b, "theme");
        }
        if (result === 0) {
          result = compare(a, b, "summary");
        }
        return result;
      });
    }
  }
  return items;
}

function enableDisableNavigation() {
  let el;
  if (getNextSprint()) {
    el = document.getElementById("next_sprint_b");
    el.classList.remove("disabled");
    el = document.getElementById("next_sprint");
    el.classList.remove("disabled");
  } else {
    el = document.getElementById("next_sprint_b");
    el.classList.add("disabled");
    el = document.getElementById("next_sprint");
    el.classList.add("disabled");
  }

  if (getPreviousSprint()) {
    el = document.getElementById("previous_sprint_b");
    el.classList.remove("disabled");
    el = document.getElementById("previous_sprint");
    el.classList.remove("disabled");
  } else {
    el = document.getElementById("previous_sprint_b");
    el.classList.add("disabled");
    el = document.getElementById("previous_sprint");
    el.classList.add("disabled");
  }
}

function showCompleted(key) {
  _status = _status === "COMPLETED" ? null : "COMPLETED";
  toggleSearchKey(key, "show_completed");
  refreshMap();
}

function showInprogress(key) {
  _status = _status === "INPROGRESS" ? null : "INPROGRESS";
  toggleSearchKey(key, "show_inprogress");
  refreshMap();
}

function showReady(key) {
  _status = _status === "READY" ? null : "READY";
  toggleSearchKey(key, "show_ready");
  refreshMap();
}

function showPending(key) {
  _status = (_status instanceof Set) ? null : toValueSet("PENDING,BACKLOG,N/A");
  toggleSearchKey(key, "show_pending");
  refreshMap();
}

function showBlocked(key) {
  _status = _status === "BLOCKED" ? null : "BLOCKED";
  toggleSearchKey(key, "show_blocked");
  refreshMap();
}

function isBlocked(item) {
  if (item.status === "BLOCKED") {
    return true;
  } else if (item.children) {
    for (let i=0; i<item.children.length; i++) {
      if (isBlocked(item.children[i])) {
        return true;
      }
    }
  }
  return false;
}

const _toggleButtons = ["show_completed", "show_inprogress", "show_completed", "show_ready", "show_pending", "show_blocked"];
function toggleSearchKey(key, toggleId) {
  let el = document.getElementById(key);
  el.value = "";
  _toggleButtons.forEach((buttonId) => {
    el = document.getElementById(buttonId);
    if (buttonId !== toggleId || !_status) {
      el.classList.remove("active");
    } else if (!el.classList.contains("active")) {
      el.classList.add("active");
    }
  });
  searchKey(key);
}

function loadMyTeam() {
  loadTeamItems(_teamName ?? MY_TEAM, _sprintParam);
}

function showSprint(sprint, nextFlag=true) {
  const teamName = _team.name;
  _refresh = true;
  loadTeamItems(teamName, sprint);
  _refreshMap = true;
}

function showNext() {
  const sprint = getNextSprint();
  showSprint(sprint, true);
}

function showPrevious() {
  const sprint = getPreviousSprint();
  showSprint(sprint, false);
}

function getNextSprint() {
  if (_team && _team.base && _team.base[_team.name] && _team.base[_team.name].length > 0) {
    let index;
    if (_team.sprint) {
      index = _team.base[_team.name].indexOf(_team.sprint);
    } else {
      index = 0;
    }
    if (index >= 0 && index < _team.base[_team.name].length - 1) {
      return _team.base[_team.name][index + 1];
    }
  }
  return null;
}

function getPreviousSprint() {
  if (_team.sprint) {
    if (_team && _team.base && _team.base[_team.name] && _team.base[_team.name].length > 0) {
      let index = _team.base[_team.name].indexOf(_team.sprint);
      if (index > 0) {
        return _team.base[_team.name][index - 1];
      }
    }
  }
  return null;
}

function loadTeamItems(teamName, sprint = null) {
  let url = "/items/"+ teamName;
  if (sprint) {
    url += "?" + new URLSearchParams({ sprint: sprint, delta: true }).toString();
  }
  fetch(url, {
    method: "GET",
    headers: JSON_HEADERS,
  }).then((res) => {
    if (res.status === 200) {
      res.json().then((data) => {
        if (data) {
          if (Array.isArray(data)) {
            data.forEach(team => {
              processTeamItems(team);
            });
            if (data.length > 1) {
              showTeam(MY_TEAM);
            } else if (data.length < 1) {
              refreshTeam();
            }
          } else {
            processTeamItems(data);
          }
        } else {
          refreshTeam();
        }
      });
    } else if (res.status === 204) {
      refreshTeam();
    } else if (res.status === 413 || res.status === 415 || res.status === 422) {
      res.json().then((data) => {
        window.alert(data.msg);
      });
    } else {
      window.alert("Unexpected response code " + res.status);
    }
  }).catch((error) => {
    console.error(error);
    window.alert("Unable to load team information.  Please try again.");
  });
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
  el.innerText = prefix;
}

function writeMessage(msg, consolelog=false) {
  const el = document.getElementById("message-text");
  el.value = msg;
  if (consolelog) {
    console.log(msg);
  }
}

function writeStats(stats, title="") {
  const el = document.getElementById("message-stats");
  el.innerText = stats;
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
    if (res.status === 200) {
      res.json().then((data) => {
        processTeamItems(data);
        onSuccess();
      });
    } else if (res.status === 413 || res.status === 415 || res.status === 422) {
      res.json().then((data) => {
        window.alert(data.msg);
      });
    } else if (res.status === 401) {
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

function ESC(text) {
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
    let percent = 0;
    selection.forEach((e) => {
      count++;
      sum += convertToSP(Number(e.getAttribute("data-estimate")), e.getAttribute("data-unit"));
      percent += Number(e.getAttribute("data-team_pct"));
    });

    const title = `Total Effort (${count} selected)`;
    writeStats(EFF(sum) + " SP", title);
    writePercent(`${PCT(percent)} %`, "Team %");
  }
}

function createSelectionCheck(item) {
  let markup = `<input class="form-check-input" name="selectTeam" data-estimate="${item.computed_effort ?? 0}" data-unit="${item.unit}" data-team_pct="${item.computed_team_pct ?? 0}" title="Stats" onchange="computeStats()" type="checkbox" value="" />`;
  return markup;
}

function createDeltaDiv(item) {
  let markup = null;
  if (item.computed_notes) {
    markup = "";
    if (item.delta) {
      markup +=
      `<div class="col-auto">
        <a tabindex="0" title="${item.jira ?? ""} ${item.delta.toUpperCase()}" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-content="${ESC(item.computed_notes)}">
          <i class="material-icons row" style="opacity: 0.5;">${item.delta === "new" ? "add" : "emergency"}</i>
        </a>
      </div>`;
    } else {
      markup +=
      `<div class="col-auto">
        <a tabindex="0" title="${item.jira ?? ""} Notes" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-content="${ESC(item.computed_notes)}">
          <i class="material-icons row">event_note</i>
        </a>
      </div>`;
    }
  }
  return markup;
}

function createPriorityNotes(item) {
  let markup = `<div class="row">`;
  markup += `<div class="col">${(item.priority >= 0) ? item.priority: ""}</div>`;
  const delta = createDeltaDiv(item);
  if (delta) {
    markup += delta;
  }
  markup += `</div>`;
  return markup;
}

function createDeltaNotes(item, n) {
  let markup = `<div class="row">`;
  markup += `<div class="col">${n}</div>`;
  const delta = createDeltaDiv(item);
  if (delta) {
    markup += delta;
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

function createIssueLink(item, showDelta=false, description=null) {
  let markup = `<div class="row">`;
  if (showDelta) {
    const delta = createDeltaDiv(item);
    if (delta) {
      markup += delta;
    }
  }
  if (item.jira) {
    markup += `<div class="col-auto">${createIssueAnchor(item)}</div>`;
  }
  if (item.due) {
    const due = new Date(item.due);
    let icon = "event";
    if (item.status !== "COMPLETED") {
      if (due.getTime() < NOW.getTime()) {
        icon = "alarm";
      }  
    } else {
      icon = "check";
    }
    markup += `<div class="col-auto" title="Due: ${formatDate(due)}"><i class="material-icons row">${icon}</i></div>`;
  }
  if (description) {
    markup += `<div class="col-auto">${description}</div>`;
  }
  markup += `</div>`;
  return markup;
}

function createSummaryLink(item, prefixSquad=null) {
  let markup = `<div class="row">`;
  if (item.children) {
    let className = "text-primary";
    markup += `<div class="col"><a class="${className} text-decoration-none" href="javascript:showChildren('${item.jira}')">${prefixSquad ? prefixSquad+" - ":""}${ESC(item.summary)}</a>
    </div>`;
  } else {
    markup += `<div class="col"><nobr>${prefixSquad ? prefixSquad+" - ":""}${ESC(item.summary)}</nobr></div>`;
  }
  markup += `</div>`;

  return markup;
}

const RED = "color:#F93154";
const GREEN = "color:#00B74A";
const AMBER = "color:#FFA900";
const BLUE = "color:#0D6EFD";

function lookupTeamMember(memberID, short=false) {
  let memberName = memberID;
  if (_team.members && memberID) {
    const member = _team.members[memberID];
    if (member) {
      if (short) {
        memberName = member.name;
      } else {
        memberName = `${member.name} (${memberID})`;
      }
    }
  }
  return memberName ?? "(unknown)";
}

function lookupMemberIcon(member) {
  if (_team.loadIcons & !member.icon) {
    let character = member.name.replaceAll(' ', '');
    if (character.indexOf(".") > 0) {
      character = character.substring(0, character.indexOf("."));
    }
    if (character.indexOf("/") > 0) {
      character = character.substring(0, character.indexOf("/"));
    }
    member.icon = `icon_${character}`;
  }

  if (!member.icon || member.icon === "default") {
    return `/public/usericon.png`;
  }
  return `/public/assets/${member.icon}.png`;
}

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
      item.computed_remaining = convertToSP(item.remaining, item.unit);

      let row = document.createElement("tr");
      let cell;

      cell = renderCell(row, n);
      cell.className = "text-muted";
      if (item.release) {
        cell.title = item.release;
      }

      cell = renderCell(row, createSelectionCheck(item));
      cell.className = "text-muted";

      cell = renderCell(row, item.theme);
      if (item.theme) {
        cell.title = item.theme;
      }

      cell = renderCell(row, createPriorityNotes(item));
      if (item.client) {
        cell.title = item.client;
      }

      cell = renderCell(row, createIssueLink(item));
      cell.setAttribute("data-type", "jira");
      cell.setAttribute("data-value", item.jira);

      cell = renderCell(row, createSummaryLink(item, _teamName === MY_TEAM ? item.computed_squad : null));
      if (item.description) {
        cell.title = item.description;
      }

      cell = renderCell(row, item.type);
      if (item.estimate) {
        let estimate = "Estimate: " + item.estimate + " " + (item.unit ?? "SP");
        if (item.unit && item.unit !== "SP") {
          estimate += " (" + EFF(convertToSP(item.estimate, item.unit)) + " SP)";
        }
        cell.title = estimate;
      } else {
        cell.title = item.t_shirt_size;
      }

      if (item.progress) {
        const completed = EFF(convertToSP(item.completed, item.unit));
        cell = renderCell(row, `${PCT(item.progress)}%`);
        cell.title = `Completed: ${completed} SP`;
        if (item.progress > 50) {
          if (item.status === "COMPLETED") {
            cell.style = GREEN;
          } else {
            cell.style = AMBER;
          }
        }
      } else {
        cell = renderCell(row, "");
      }

      if (item.computed_remaining) {
        cell = renderCell(row, `${EFF(item.computed_remaining)} SP`);
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
      } else if (item.status === "INPROGRESS" || item.status === "PENDING") {
        cell.style = AMBER;
      } else if (item.status === "READY") {
        cell.style = BLUE;
      } else if (item.status === "BLOCKED") {
        cell.style = RED;
        hasBlockers = true;
      }
      cell.title = noteTitle;
      cell.setAttribute("data-type", "status");
      cell.setAttribute("data-value", item.status);

      if (item.computed_effort > 0) {
        cell = renderCell(row, `${PCT(item.computed_team_pct)}% (${effort} SP)`);
      } else {
        cell = renderCell(row, "");
      }
      if (item.assignee) {
        const assigneeName = lookupTeamMember(item.assignee);
        cell.title = "Assignee: " + assigneeName;
        item.computed_unassigned = assigneeName;
      } else {
        cell.title = "Unassigned";
        item.computed_unassigned = "Unassigned";
      }
      cell.setAttribute("data-type", "assignee");

      mytable.appendChild(row);
      n++;
    });

    if (_refresh) {
      // Cache computed values to support subsequent rendering (e.g. filtering or sorting)
      _team.computed_effort = teamTotalEffort;
      _team.completed = totalCompleted;
      _team.remaining = totalRemaining;
      if (_team.capacity) {
        _team.capacityDelta = _team.capacity - _team.computed_effort;
      } else {
        delete _team.capacityDelta;
      }
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
    renderCell(row, msg, 11);
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
    const label = writeTeam("All Items Completed!", "team_status");
    label.title = "Please schedule demos for completed items!";
    el.style = GREEN;
  } else if (totalRemaining > 0) {
    let label;
    if (hasBlockers) {
      label = writeTeam(`Remaining Effort ⛔`, "team_status");
      label.title = "Please resolve blockers!";
      el.style = RED;
    } else {
      if (_team.capacityDelta) {
        if (_team.capacityDelta < 0) {
          label = writeTeam(`Remaining Effort ⚠️`, "team_status");
          label.title = "Please review team capacity & buffer";
          el.style = AMBER;
        } else {
          label = writeTeam(`Remaining Effort ✅`, "team_status");
        }
      } else {
        label = writeTeam(`Remaining Effort`, "team_status");
      }
    }
  } else {
    writeTeam("", "team_status");
  }
  el.title = EFF(convertToDay(totalRemaining)) + " DAY";

  writeSummary();
  computeStats();
}

var _summaryItems = [];
var _summarySortKey = null;
var _summarySortOrder = {};

function showSummaryItems() {
  const options = { backdrop: "static" };
  const modal = new bootstrap.Modal(document.getElementById('itemSummary'), options);

  const label = document.getElementById("summaryItemsLabel");
  removeChildren(label);

  _summaryItems = computeSummaryItems();
  const totalEstimate = _summaryItems.reduce((sum, i) => sum + convertToSP(Number(i["estimate"] ?? 0), i["unit"]), 0.0);
  const totalEffort = _summaryItems.reduce((sum, i) => sum + convertToSP(Number(i["computed_effort"] ?? 0), i["unit"]), 0.0);

  let headerSuffix = `<div class="col text-end">Total Effort: ${totalEffort ?? "Unknown"} SP</div>`;
  let headerContent = `<i class="material-icons">analytics</i> PI Summary (Total Estimate: ${totalEstimate ?? ""} SP)`;
  label.innerHTML = `<div class="container mx-0"><div class="d-flex"><div class="col-auto">${headerContent}</div>${headerSuffix}</div>`;
 
  const statusEl = document.getElementById("summaryItemLabel");
  removeChildren(statusEl);

  let diffPct = "";
  if (totalEffort > 0 && totalEstimate > 0) {
    const computed_diff = totalEffort - totalEstimate;
    if (computed_diff) {
      const diff_pct = computed_diff * 100 / totalEstimate;
      diffPct = `${PCT(diff_pct)}% (${computed_diff} SP)`;
    }
  }
  statusEl.innerHTML = `Total Difference: ${diffPct}`;

  renderSummaryItems();

  modal.show();
}

function renderSummaryItems() {
  const mytable = document.getElementById("summary_items");
  removeChildren(mytable);

  const items = filterSummaryItems();
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

    cell = renderCell(row, ESC(item.summary));
    if (item.description) {
      cell.title = item.description;
    }

    cell = renderCell(row, item.type);

    cell = renderCell(row, item.status);
    if (item.status === "COMPLETED") {
      cell.style = GREEN;
    } else if (item.status === "INPROGRESS" || item.status === "PENDING") {
      cell.style = AMBER;
    } else if (item.status === "READY") {
      cell.style = BLUE;
    } else if (item.status === "BLOCKED") {
      cell.style = RED;
      hasBlockers = true;
    }

    let estimate = 0;
    if (item.estimate) {
      estimate = convertToSP(item.estimate, item.unit);
      cell = renderCell(row, EFF(estimate));
    } else {
      cell = renderCell(row, "");
    }

    const effort = convertToSP(item.computed_effort, item.unit);
    cell = renderCell(row, EFF(effort));

    // Re-compute
    if (effort > 0 && estimate > 0) {
      item.computed_diff = effort - estimate;
      if (item.computed_diff) {
        const diff_pct = item.computed_diff * 100 / estimate;
        cell = renderCell(row, `${PCT(diff_pct)}% (${item.computed_diff} SP)`);
      } else {
        cell = renderCell(row, "");
      }
    } else {
      delete item.computed_diff;
      cell = renderCell(row, "");
    }

    mytable.appendChild(row);
    n++;
  });
}

function computeSummaryItems() {
  return _items;
}

function filterSummaryItems() {
  const sortKey = _summarySortKey;
  var order = _summarySortOrder[sortKey] || 1;
  var items = _summaryItems;

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

function sortSummaryBy(key) {
  _summarySortKey = key;
  _summarySortOrder[key] = (!_summarySortOrder[key] ? 1 : _summarySortOrder[key]) * -1;
  renderSummaryItems();
}

var _childrenItems = [];
var _childrenFilterKey = null;
var _childrenSortKey = null;
var _childrenSortOrder = {};

function findItemByJira(jira, items=_team.items) {
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

  let remainingSP = `<div class="col text-end">Remaining: ${parent.remaining ?? "Unknown"} ${parent.unit ?? "SP"}</div>`;
  let headerContent = createIssueLink(parent, true, `(${parent.t_shirt_size ?? ""}: ${parent.computed_effort ?? ""} ${parent.unit ?? "SP"}) - ${parent.summary}`);
  label.innerHTML = `<div class="container mx-0"><div class="d-flex"><div class="col-auto">${headerContent}</div>${remainingSP}</div>`;
  
  const statusEl = document.getElementById("parentItemLabel");
  removeChildren(statusEl);

  let progress = "";
  if (parent.progress) {
    const completed = EFF(convertToSP(parent.completed, parent.unit));
    let suffix = (parent.status !== "COMPLETED") ? " Completed" : "";
    progress = ` - ${PCT(parent.progress)}% (${completed} SP)${suffix}`;
  }

  let icon = "";
  if (parent.status === "COMPLETED") {
    statusEl.style = GREEN;
    icon = "check_circle";
  } else if (parent.status === "INPROGRESS") {
    statusEl.style = AMBER;
    icon = "hourglass_empty";
  } else if (parent.status === "PENDING") {
    statusEl.style = AMBER;
    icon = "pending";
  } else if (parent.status === "READY") {
    statusEl.style = BLUE;
    icon = "calendar_today";
  } else if (parent.status === "BLOCKED") {
    statusEl.style = RED;
    icon = "block";
  } else {
    icon = "schedule";
  }
  statusEl.innerHTML = `<i class="material-icons">${icon}</i> ${parent.status}${progress}`;

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
    updateItemForTeam(item, _team);

    row = document.createElement("tr");
    cell = renderCell(row, createDeltaNotes(item, n));
    cell.className = "text-muted";

    cell = renderCell(row, createIssueLink(item));
    if (item.parent_jira) {
      cell.title = `Parent: ${item.parent_jira}`;
    }

    cell = renderCell(row, ESC(item.summary));
    if (item.description) {
      cell.title = item.description;
    }

    if (Array.isArray(item.sprint) && item.sprint.length > 1) {
      cell = renderCell(row, `[${item.sprint[0]} -> ${item.sprint[item.sprint.length - 1]}]`);
      if (item.type !== "EPIC") {
        cell.style = AMBER;
      }
    } else {
      cell = renderCell(row, item.sprint);
    }
    if (item.computed_squad) {
      cell.title = item.computed_squad;
    }
    if (item.type === "EPIC") {
      cell.className = "text-muted";
    }

    cell = renderCell(row, item.type);
    if (item.type === "EPIC") {
      cell.className = "text-muted";
    }
    if (item.depends_on) {
      cell.title = `Depends on: ${item.depends_on}`;
    }

    if (item.assignee) {
      let assigneeName = lookupTeamMember(item.assignee, true);
      /*if (_team.members) {
        const m = _team.members[item.assignee];
        if (m && m.icon) {
          assigneeName = `<img src="${lookupMemberIcon(m)}" alt="member icon" width="24" height="24"/> ${assigneeName}`;
        }
      }*/

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
    } else if (item.status === "INPROGRESS" || item.status === "PENDING") {
      cell.style = AMBER;
    } else if (item.status === "READY") {
      cell.style = BLUE;
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

  // Warning: may not be performant
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl, { html: true });
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

  if (_assignee || filterKey) {
    //console.log(`filterChildrenItems() - status=${_status}, assignee=${_assignee}, filter=${filterKey}`);
    items = items.filter(function (row) {
      return ((isEmpty(_assignee) || valueIn(row["assignee"], _assignee) || valueIn(row["assignee"], _po)) &&
        (isEmpty(filterKey) || Object.keys(row).some(function (key) {
          return String(row[key]).toLowerCase().indexOf(filterKey) > -1
        })));
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

function compare(a, b, attr) {
  a = a[attr];
  b = b[attr];
  if (!a) a = "";
  if (!b) b = "";
  return (a === b ? 0 : a > b ? 1 : -1);
}

function SPRINT(sprint, esc=true) {
  if (!sprint || sprint === "BASE") {
    sprint = "<PI PLANNING>";
  }
  return esc ? ESC(sprint) : sprint;
}

function TEAM_NAME() {
  return _team.squad ?? _team.name ?? MY_TEAM;
}

function loadJSSync(url, onload = null) {
  //console.log(`loading ${url}...`);
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  script.async = false;
  if (onload) {
    script.onload = onload;
  }
  document.head.appendChild(script);
}

var _canvasMap = null;
var _refreshMap = false;
var show = function(el,v) { el.style.display = v ? "" : "none"; }

function clearCanvasMap() {
  if (_canvasMap) {
    _canvasMap.clear();
    _canvasMap.dispose();
    _canvasMap = null;
  }
}

function refreshMap() {
  if (_refreshMap) {
    clearCanvasMap();
    _refreshMap = false;
  }
  if (!_canvasMap) {
    showTeamMap();
  }
}

function fitToCanvas() {
  if (_canvasMap) {
    if (_refreshMap) {
      let headerEl = document.getElementById("header");
      let footerEl = document.getElementById("footer");
      let adjustHeight = headerEl.offsetHeight + footerEl.offsetHeight;
      _canvasMap.setWidth(window.innerWidth);
      _canvasMap.setHeight(window.innerHeight - adjustHeight);
    }

    _fitToCanvas(_canvasMap);
    _canvasMap.requestRenderAll();
  }
}

var _canvasMode = false;
function toggleItemMap() {
  const canvasEl = document.getElementById("canvas-div");
  const tableEl = document.getElementById("table-div");
  const toggleEl = document.getElementById("item_map");
  if (canvasEl.style.display) {
    _canvasMode = true;
    show(canvasEl, true);
    show(tableEl, false);
    refreshMap();
    if (!toggleEl.classList.contains("active")) {
      toggleEl.classList.add("active");
    }
  } else {
    _canvasMode = false;
    show(canvasEl, false);
    show(tableEl, true);
    enableDisableNavigation();
    toggleEl.classList.remove("active");
  }
  show(document.getElementById("upload"), !_canvasMode);
  show(document.getElementById("copy_to_clipboard"), !_canvasMode);
  show(document.getElementById("fit_canvas"), _canvasMode);
  show(document.getElementById("download"), _canvasMode);
}

var _fabricJSLoaded = false;
var _fabricJSLoading = false;
function showTeamMap(data=null, items=_items, hook=null) {
  if (_fabricJSLoading) {
    return;
  }
  let callback = function() {
    _fabricJSLoading = false;
    _fabricJSLoaded = true;
    _showTeamMap(data, items, hook !== null);
    if (hook) {
      hook(_canvasMap);
    }
  };
  if (!_fabricJSLoaded) {
    _fabricJSLoading = true;
    loadJSSync("/public/fabric.min.js");
    loadJSSync("/public/draw.js");
    loadJSSync("/public/team.js");
    loadJSSync("/public/custom.js", callback);
  } else {
    callback();
  }
}

function _showTeamMap(data, items, renderImmediate=false) {
  const headerEl = document.getElementById("header");
  const footerEl = document.getElementById("footer");
  const adjustHeight = headerEl.offsetHeight + footerEl.offsetHeight;
  const map = { canvasData: data };
  clearCanvasMap();
  _canvasMap = _initDraw(window.innerWidth, window.innerHeight - adjustHeight, map);
  enableDisableNavigation();

  _renderTeamDate(canvas);
  if (_team.members && SHOW_TEAM) {
    _renderTeamCanvas(_canvasMap, _team.members);
  } else if (!data && items) {
    _renderItemsCanvas(_canvasMap, items);
  }

  _fitToCanvas(_canvasMap);
  if (renderImmediate) {
    _canvasMap.renderAll();
  } else {
    _canvasMap.requestRenderAll();
  }
}

const MAX_SELECTION = 20;
function updateCanvasSelection(canvas=_canvasMap) {
  if (_filterKey && _filterKey.length > 2 && canvas) {
    var filterKey = _filterKey && _filterKey.toLowerCase();
    let objects = canvas.getObjects();
    const keys = ['id', 'summary', 'text'];
    objects = objects.filter(function (row) {
      return keys.some(function (key) {
        if (key === 'id') {
          return String(row[key]).toLowerCase() === filterKey;
        }
        return String(row[key]).toLowerCase().indexOf(filterKey) > -1;
      });
    });

    canvas.discardActiveObject();
    let message = "";
    if (objects.length > 0) {
      let sel = objects[0];
      if (objects.length > 1) {
        message = `Found ${objects.length} matching objects`;
        if (objects.length > MAX_SELECTION) {
          objects = objects.slice(0, MAX_SELECTION);
          message += ` (selection limited to ${objects.length})`;
        }
        sel = new fabric.ActiveSelection(objects, {
          canvas: canvas,
        });
      } else {
        message = `Found [${sel.id}] - "${sel.summary}"`;
      }

      sel.borderColor = 'red';
      sel.borderScaleFactor = 4;
      sel.borderDashArray = [8, 8];
      sel.hasControls = false;
      canvas.setActiveObject(sel);
    }
    writeMessage(message);
    canvas.requestRenderAll();
  }
}

function openPIPPI(parent=window, showAll=false, showAdded=true, showStories=true, completedOnly=true, speed=ANIMATE_SPEED, fullscreen=false) {
  if (speed <= 0) {
    speed = _animateSpeedParam;
  }
  const url = `/public/pippi.html?speed=${speed}&show_all=${showAll}&show_added=${showAdded}&show_stories=${showStories}&completed_only=${completedOnly}&team=${encodeURIComponent(_team.name)}&sprint=${encodeURIComponent(_team.sprint)}`;
  let win;
  if (fullscreen) {
    win = parent.open(url, "pippi", `directories=no,menubar=no,toolbar=no,location=no,scrollbars=no,status=no,resizable=yes,copyhistory=no,fullscreen=yes`);
    if (win.outerWidth < screen.width || win.outerHeight < screen.height) {
      let width = screen.width;
      let height = width * 0.6;
      if (height > screen.height) {
        height = screen.height;
      }
      const top = (screen.height - height) / 2;
      const left = (screen.width - width) / 2;
      win.moveTo(left, top);
      win.resizeTo(screen.width, height);
    }
  } else {
    const width = 1024;
    const height = 576;
    const top = parent.top.outerHeight / 2 + parent.top.screenY - (height / 2);
    const left = parent.top.outerWidth / 2 + parent.top.screenX - (width / 2);
    win = parent.open(url, "pippi", `directories=no,menubar=no,toolbar=no,location=no,scrollbars=no,status=no,resizable=yes,copyhistory=no,fullscreen=no,width=${width},height=${height},top=${top},left=${left}`);
  }
  win.focus();
}

function addPIDemoMenuItem(menu, className) {
  mi = document.createElement("a");
  mi.className = className;
  mi.href = "#";
  mi.target = "pippi";
  //parent=window, showAll=false, showAdded=true, showStories=true, showCompleted=true, speed=ANIMATE_SPEED, fullscreen=false
  mi.setAttribute("onclick", `openPIPPI(window, true, true, false, false, ANIMATE_SPEED, true); return false;`);
  mi.innerHTML = `👏 PI Demo 🎉`;
  menu.appendChild(mi);  
}
