const JSON_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
};

const MAX_FRAC_DIGITS = 1;
const _percentFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: MAX_FRAC_DIGITS }).format;
const PCT = function (value) { if (!isNaN(value)) { return _percentFormat(value); } return ""; };

function toFixed(n) {
  return Number(n.toFixed(MAX_FRAC_DIGITS+2));
}

const MY_TEAM = "MY TEAM";
const EMPTY_TEAM = {
  name: MY_TEAM,
  sprint: null
};

var _teams = {};
var _teamName = null;
var _team = EMPTY_TEAM;

var ANIMATE_SPEED = 1;
var SHOW_ALL = false;
var SHOW_ADDED = true;
var SHOW_STORIES = true;
var COMPLETED_ONLY = false;
var DEMO_ACTIVE = false;
var SHOW_CHARTS = true;
var RENDER_ITEM = false;

var _animateSpeedParam = ANIMATE_SPEED;

window.onload = function () {
  const url = new URL(window.location.href);
  if (url.searchParams.has("team")) {
    _teamName = url.searchParams.get("team");
  }
  if (url.searchParams.has("show_all")) {
    SHOW_ALL = url.searchParams.get("show_all") !== "false";
  }
  if (url.searchParams.has("show_added")) {
    SHOW_ADDED = url.searchParams.get("show_added") !== "false";
  }
  if (url.searchParams.has("show_stories")) {
    SHOW_STORIES = url.searchParams.get("show_stories") !== "false";
  }
  if (url.searchParams.has("completed_only")) {
    COMPLETED_ONLY = url.searchParams.get("completed_only") !== "false";
  }

  if (url.searchParams.has("speed")) {
    _animateSpeedParam = Number(url.searchParams.get("speed"));
    if (isNaN(_animateSpeedParam)) {
      _animateSpeedParam = ANIMATE_SPEED;
    } else if (_animateSpeedParam < 1) {
      _animateSpeedParam = 1;
    } else if (_animateSpeedParam > 3) {
      _animateSpeedParam = 3;
    }
    ANIMATE_SPEED = _animateSpeedParam;
  }

  loadMyTeam();
  configurePopupListener();
};

function lookupTeamMember(memberID, short=false) {
  let memberName = memberID;
  if (_team.members && memberID) {
    const member = _team.members[memberID];
    if (member) {
      if (short) {
        memberName = member.name;
      } else {
        memberName = `${member.name}/${memberID}`;
      }
    }
  }
  return memberName ?? "(unknown)";
}

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

function compare(a, b, attr) {
  a = a[attr];
  b = b[attr];
  if (!a) a = "";
  if (!b) b = "";
  return (a === b ? 0 : a > b ? 1 : -1);
}

function isEmpty(value) {
  return !value || ((typeof value) === "string" &&  value.trim() === "");
}

function SPRINT(sprint) {
  if (isEmpty(sprint) || sprint === "BASE") {
    sprint = "<PI PLANNING>";
  }
  return sprint;
}

function TEAM_NAME() {
  return _team.squad ?? _team.name ?? MY_TEAM;
}

function loadMyTeam() {
  let sprint = null;
  const url = new URL(window.location.href);
  if (url.searchParams.has("sprint")) {
    sprint = url.searchParams.get("sprint");
  }
  loadTeamItems(_teamName ?? "MY_TEAM", sprint);
}

function processTeamMembers(data, team) {
  if (data.members) {
    if (!team.members) {
      team.members = {};
    }
    data.members.forEach((member) => {
      team.members[member.id] = member;
      if (!member.role) {
        member.role = "TM";
      }
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

  team.id = data.id ?? team.id;
  team.name = team.name ?? MY_TEAM;
  team.squad = data.squad ?? team.squad ?? "My Squad";
  team.items = data.items ?? team.items;
  team.capacity = data.capacity ?? team.capacity;
  team.base = data.base ?? team.base;
  team.sprint = data.sprint ?? team.sprint;
  team.delta = data.delta;
  team.date = data.date ?? team.date;
  team.loadIcons = data.loadIcons ?? team.loadIcons;
  team.chart1 = data.chart1;
  team.chart2 = data.chart2;
  processTeamMembers(data, team);

  if (!_teams[team.name] || team.squad !== _teams[team.name].squad) {
    _teamName = team.name;
    _teams[team.name] = team;
  }

  refreshTeam(team);
    
  return team;
}

function refreshTeam(team=_team, showNext=SHOW_ALL) {
  if (team) {
    //console.log(`refreshTeam() - ${team.name}/${team.sprint}, showNext=${showNext}`);
    _team = team;
    showReviewCanvas(showNext);
  }
}

function pingServer() {
  writeMessage("");
  fetch("/ping", {
    method: "GET",
    headers: JSON_HEADERS,
  }).then((response) =>
    response.json().then((data) => ({
      data: data,
      status: response.status,
    })).then((res) => {
      //console.log(res.status);
      if (res.status == 200) {
        //console.log(res.data);
        if (res.data.api !== "UP") {
          writeMessage(`API: ${res.data.apiURL} status is ${res.data.api}`);
        } else {
          writeMessage("OK");
        }
      } else {
        writeMessage("ERR");
        window.alert(res.data.msg);
      }
    }).catch((error) => {
      window.alert(error);
    })
  );
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
    if (res.status == 200) {
      res.json().then((data) => {
        if (data) {
          if (Array.isArray(data)) {
            data.forEach(team => {
              processTeamItems(team);
            });
          } else {
            processTeamItems(data);
          }
        } else {
          refreshTeam();
        }        
      });
    } else if (res.status == 204) {
      refreshTeam();
    } else if (res.status == 413 || res.status == 415 || res.status == 422) {
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

function writeSP(sp, title="Estimate") {
  const el = document.getElementById("message-sp");
  el.innerText = `${sp ?? "?"} SP`;
  el.title = title;
}

function loadJSSync(url, onload = null) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  script.async = false;
  if (onload) {
    script.onload = onload;
  }
  document.head.appendChild(script);
}

function getNextSprint() {
  if (_team && _team.base && _team.base[_team.name].length > 0) {
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

function showReviewCanvas(showNext) {
  const pixiParent = document.getElementById("pixi");
  if (pixiParent) {
    let callback = function() {
      const nextSprint = getNextSprint();
      if (nextSprint && showNext) {
        loadTeamItems(_teamName ?? "MY_TEAM", nextSprint);
      } else {
        DEMO_ACTIVE = false;
      }
    };
    loadAndPlayReview(pixiParent, _team, callback);
  }
}

function toggleShowAdded() {
  SHOW_ADDED = !SHOW_ADDED;
}

function toggleShowStories() {
  SHOW_STORIES = !SHOW_STORIES;
}

function toggleCompletedOnly() {
  COMPLETED_ONLY = !COMPLETED_ONLY;
}

function closePopupMenu() {
  const menu = document.getElementById("context-menu");
  menu.style.display = 'none';
}

function openPopupMenu(e) {
  const menu = document.getElementById("context-menu"); 
  removeChildren(menu);
  buildDemoPopupMenu(menu);
  menu.style.display = 'block';
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";

  return false;
}

function configurePopupListener() {
  document.onclick = closePopupMenu; 
  document.oncontextmenu = openPopupMenu;  
}

function buildDemoPopupMenu(menu) {
  if (!_team.base) {
    return;
  }

  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${TEAM_NAME()} Demo</span></h5>`;
  menu.appendChild(mi);

  const className = "list-group-item list-group-item-action menuitem-padding";

  // Redirect to Server URL
  mi = document.createElement("a");
  mi.className = className;
  mi.href = `/redirect?sprint=${encodeURIComponent(_team.sprint)}`;
  mi.target = "pippi";
  mi.innerHTML = `<i class="material-icons">open_in_browser</i> Open Server`;
  menu.appendChild(mi);

  // Show demo options
  let toggles = [ {caption: `Show Added`, method: `toggleShowAdded()`, value: SHOW_ADDED},
    {caption: `Show Stories`, method: `toggleShowStories()`, value: SHOW_STORIES},
    {caption: `Completed Only`, method: `toggleCompletedOnly()`, value: COMPLETED_ONLY} ];
  for (let i=0; i<toggles.length; i++) {
    mi = document.createElement("a");
    mi.href = "#";
    if (toggles[i].value) {
      mi.className = className +" active";
    } else {
      mi.className = className;
    }
    mi.href = "#";
    mi.setAttribute("onclick", `${toggles[i].method}; return false;`);
    mi.innerHTML = `<i class="material-icons">visibility</i> ${toggles[i].caption}`;
    menu.appendChild(mi);  
  }

  let itemsHTML = `<li><a class="dropdown-item" href="javascript:setSpeed(1)">Play 1x ${ANIMATE_SPEED === 1 ? '<i class="material-icons">check</i>':''}</a></li>
  <li><a class="dropdown-item" href="javascript:setSpeed(2)">Play 2x ${ANIMATE_SPEED === 2 ? '<i class="material-icons">check</i>':''}</a></li>
  <li><a class="dropdown-item" href="javascript:setSpeed(3)">Play 3x ${ANIMATE_SPEED === 3 ? '<i class="material-icons">check</i>':''}</a></li>`;
  if (DEMO_ACTIVE && ANIMATE_SPEED > 0) {
    itemsHTML += `<li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item" href="javascript:setSpeed(-1)"><i class="material-icons">cancel</i> Abort Demo</a></li>`;
  } else {
    itemsHTML += `<li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item" href="javascript:refreshTeam()"><i class="material-icons">play_circle</i> Start Demo</a></li>`;
  }
  addDropdownMenu(menu, "Animation Speed", itemsHTML);
}

function addDropdownMenu(menu, caption, itemsHTML, icon=null) {
  let iconHTML = "";
  if (icon) {
    iconHTML = `<i class="material-icons">${icon}</i> `;
  }
  let mi = document.createElement("div");
  mi.className = "nav-item dropdown list-group-item list-group-item-action dropend";
  mi.innerHTML = `<a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">${iconHTML}${caption}</a><ul class="dropdown-menu">${itemsHTML}</ul>`;
  menu.appendChild(mi);
}
