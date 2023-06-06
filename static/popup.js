function closePopupMenu() {
  const menu = document.getElementById("context-menu");
  menu.style.display = 'none';
}

function openPopupMenu(e) {
  const menu = document.getElementById("context-menu");
  if (_canvasMap && _canvasMode) {
    handleCanvasPopupMenu(_canvasMap, menu, e);
    return;
  }

  let el = document.elementFromPoint(e.x, e.y);
  let assigneeColumn = false;

  if (el) {
    // Navigate to table row with holding data
    while (el && !el.getAttribute('data-type')) {
      el = el.parentElement;
    }

    // Navigate to last table column and scan backwards
    while (el && el.nextElementSibling) {
      el = el.nextElementSibling;
    }
    while (el) {
      if (el.getAttribute('data-type') === "assignee") {
        assigneeColumn = true;
      }
      el = el.previousElementSibling;
    }
  }
  
  removeChildren(menu);
  if (assigneeColumn) {
    buildAssigneePopupMenu(menu);
  } else {
    buildSprintPopupMenu(menu);
  }
  menu.style.display = 'block';
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";

  return false;
}

function configurePopupListener() {
  document.onclick = closePopupMenu; 
  document.oncontextmenu = openPopupMenu;  
}

function addMenuItem(menu, caption, icon, onClick=null, className) {
  let mi;
  if (onClick) {
    mi = document.createElement("a");
    mi.className = className;
    mi.href = "#";
    mi.setAttribute("onclick", onClick);
    mi.innerHTML = `<i class="material-icons">${icon}</i> ${caption}`;
  } else {
    mi = document.createElement("span");
    mi.className = className ?? "list-group-item menuitem-padding";
    if (caption === "separator") {
      mi.innerHTML = `<hr class="dropdown-divider">`;
    } else {
      mi.innerHTML = `<i class="material-icons">${icon}</i> ${caption}`;
    }
  }
  menu.appendChild(mi);
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

function buildSprintPopupMenu(menu) {
  if (!_team.base) {
    return;
  }

  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${_team.name ?? _team.squad} Sprint</span></h5>`;
  menu.appendChild(mi);

  const className = "list-group-item list-group-item-action menuitem-padding";

  // PI Summary
  mi = document.createElement("a");
  mi.className = className;
  mi.href = "#";
  mi.setAttribute("onclick", `showSummaryItems(); return false;`);
  mi.innerHTML = `<i class="material-icons">analytics</i> PI Summary`;
  menu.appendChild(mi);

  // PI Demo
  mi = document.createElement("a");
  mi.className = className;
  mi.href = "#";
  mi.target = "pippi";
  mi.setAttribute("onclick", `openPIPPI(window, true, true, true, true, ANIMATE_SPEED, true); return false;`);
  mi.innerHTML = `👏 PI Demo 🎉`;
  menu.appendChild(mi);

  // Show sprints
  const sprints = _team.base[_team.name];
  sprints.forEach((v) => {
    let caption = SPRINT(v);
    if (v !== _team.sprint) {
      addMenuItem(menu, caption, "view_kanban", `showSprint("${v}"); return false;`, className);
    } else {
      addMenuItem(menu, caption, "view_kanban", null, "list-group-item active menuitem-padding");
    }
  });
}

function buildAssigneePopupMenu(menu) {
  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">Filter by Assignee</span></h5>`;
  menu.appendChild(mi);

  const className = "list-group-item list-group-item-action menuitem-padding";
  if (!_team.members) {
    addMenuItem(menu, "No team members", "error", null);
    return;
  }

  const initPOSet = !_po;
  const poMembers = [];
  const members = [];
  if (initPOSet) {
    _po = new Set();
  }
  Object.keys(_team.members).forEach((id) => {
    const m = _team.members[id];
    if (m.role === "PO") {
      poMembers.push(m);
      if (initPOSet) {
        _po.add(m.id);
      }
    }
    members.push(m);
  });

  addMenuItem(menu, "Clear All", "clear", `clearAssigneeFilter(); return false;`, className);

  poMembers.sort(function (a, b) {
    return compare(a, b, "name");
  });
  poMembers.forEach((m) => {
    let caption = `${m.name}/${m.id} (${m.role})`;
    mi.href = "#";
    mi = document.createElement("a");
    if (valueIn(m.id, _po)) {
      mi.className = className +" active";
    } else {
      mi.className = className;
    }
    mi.href = "#";
    mi.setAttribute("onclick", `filterByPO("${m.id}"); return false;`);
    mi.innerHTML = `<i class="material-icons">person</i> ${caption}`;
    menu.appendChild(mi);
  });

  let itemsHTML = "";
  members.sort(function (a, b) {
    return compare(a, b, "name");
  });

  if (members.length <= 10) {
    members.forEach((m) => {
      let onClick = `filterByAssignee("${m.id}")`;
      let caption = `${m.name}/${m.id} (${m.role})`;
      let check = valueIn(m.id, _assignee);
      let li = `<li><a class="dropdown-item" href='javascript:${onClick}'>${caption}${check ? ' <i class="material-icons">check</i>':''}</a></li>`;
      itemsHTML += li;
    });
    addDropdownMenu(menu, "Team Members", itemsHTML, "engineering");
  } else {
    addMenuItem(menu, "Team Members", "engineering", null, "list-group-item menuitem-padding");
    while (members.length > 0) {
      let count = 0;
      let caption = `${members[0].name} ...`;
      itemsHTML = "";
      while (count < 10 && members.length > 0) {
        let m = members.shift();
        let onClick = `filterByAssignee("${m.id}")`;
        let caption = `${m.name}/${m.id} (${m.role})`;
        let check = valueIn(m.id, _assignee);
        let li = `<li><a class="dropdown-item" href='javascript:${onClick}'>${caption}${check ? ' <i class="material-icons">check</i>':''}</a></li>`;
        itemsHTML += li;
        count++;
      }
      addDropdownMenu(menu, caption, itemsHTML, "engineering");
    }
  }
}

function filterByPO(assigneeId) {
  if (!(_po instanceof Set)) {
    _po = new Set();
  }
  if (_po.has(assigneeId)) {
    _po.delete(assigneeId);
  } else {
    _po.add(assigneeId);
  }
  searchKey();
  refreshMap();
}

function filterByAssignee(assigneeId) {
  if (!(_assignee instanceof Set)) {
    _assignee = new Set();
  }

  if (_ctrl) {
    if (_assignee.has(assigneeId)) {
      _assignee.delete(assigneeId);
    } else {
      _assignee.add(assigneeId);
    }
  } else {
    _assignee.clear();
    _assignee.add(assigneeId);
  }
  searchKey();
  refreshMap();
}

function clearAssigneeFilter() {
  _po = null;
  _assignee = null;
  searchKey();
  refreshMap();
}
