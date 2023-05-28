const JSON_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
};

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

window.onload = function () {
  const url = new URL(window.location.href);
  if (url.searchParams.has("team")) {
    _teamName = url.searchParams.get("team");
  }
  if (url.searchParams.has("show_all")) {
    SHOW_ALL = url.searchParams.get("show_all") === "true";
  }
  if (url.searchParams.has("speed")) {
    ANIMATE_SPEED = Number(url.searchParams.get("speed"));
    if (ANIMATE_SPEED < 1) {
      ANIMATE_SPEED = 1;
    } else if (ANIMATE_SPEED > 3) {
      ANIMATE_SPEED = 3;
    }
  }
  loadMyTeam();
};

function writeMessage(msg) {
  console.log(msg);
}

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

function SPRINT(sprint) {
  if (!sprint || sprint === "BASE") {
    sprint = "<PI PLANNING>";
  }
  return sprint;
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
  processTeamMembers(data, team);

  if (!_teams[team.name] || team.squad !== _teams[team.name].squad) {
    _teamName = team.name;
    _teams[team.name] = team;
  }

  refreshTeam(team);
    
  return team;
}

function refreshTeam(team, showNext=SHOW_ALL) {
  if (team) {
    //console.log(`refreshTeam() - ${team.name}/${team.sprint}, showNext=${showNext}`);
    _team = team;
    document.title = SPRINT(_team.sprint);
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
      }
    };
    loadAndPlayReview(pixiParent, _team, callback);
  }
}
