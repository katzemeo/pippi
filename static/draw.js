_teamIcons = { };

function _loadTeamIcons(members) {
  Object.keys(members).forEach((id) => {
    const m = members[id];
    if ((_team.loadIcons || m.icon) && !_teamIcons[m.id]) {
      var image = new Image();
      image.onload = function() {
        _teamIcons[m.id] = image;
      };
      image.src = lookupMemberIcon(m);
      /*
      fabric.Image.fromURL(`/public/assets/${m.icon}.png`, function(image) {
        _teamIcons[m.id] = image;
      });
      */
    }
  });
}

function _initDraw(width, height, map) {
  if (_team.members) {
    _loadTeamIcons(_team.members);
  }

  //console.log(`_initDraw(${width}, ${height})...`);
  var canvas = new fabric.Canvas('canvas', {
    width: width,
    height: height,
    isDrawingMode: false,
    fireRightClick: true,
    selection: false,
    defaultCursor: 'default',
    hoverCursor: 'default',
    moveCursor: 'default',
    backgroundColor: null
  });

  fabric.Object.prototype.transparentCorners = false;

  document.getElementById('download').onclick = function() {
    downloadImage(this, canvas);
  };

  fabric.Object.prototype.selectable = false;
  fabric.Image.prototype.hoverCursor = "pointer";

  if (map.canvasData) {
    canvas.loadFromJSON(map.canvasData);
  }

  // Pan support
  canvas.on('mouse:down', function(opt) {
    const e = opt.e;
    if (opt.button === 1 && (e.altKey || true)) {
      this.defaultCursor = 'grab';
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:move', function(opt) {
    if (opt.button === 1 && this.isDragging) {
      const e = opt.e;
      var vpt = this.viewportTransform;
      vpt[4] += e.clientX - this.lastPosX;
      vpt[5] += e.clientY - this.lastPosY;
      this.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:up', function(opt) {
    // Open URL in view mode (if set)
    if (opt.e.altKey && opt.button === 1) {
      if (_targetURL) {
        try {
          if (Boolean(new URL(_targetURL))) {
            window.open(_targetURL, "stella_link");
          }
        } catch (e) { }
        _targetURL = null;
      }
    }

    // On mouse up recalculate new interaction for all objects
    this.setViewportTransform(this.viewportTransform);
    this.defaultCursor = 'default';
    this.isDragging = false;
    this.selection = false;
  });

  let _targetURL = null;
  let _tooltipGroup = null;
  canvas.on('mouse:over', function(opt) {
    if (opt.target && opt.target.type !== "group" && !_targetURL) {
      const obj = opt.target;
      if (obj.url) {
        _targetURL = obj.url;
      } else if (obj.id || obj.summary) {
        if (ISSUE_WEBSITE_URL && obj.id) {
          _targetURL = `${ISSUE_WEBSITE_URL}${obj.id}`;
        }
        let assigneeText = "";
        if (obj.myitem && obj.myitem.assignee) {
          const assigneeName = lookupTeamMember(obj.myitem.assignee);
          assigneeText = " ["+ assigneeName +"]";
        }
        let progress = "";
        if (obj.myitem && obj.myitem.progress) {
          progress = ` ${PCT(obj.myitem.progress)}%`;
        }
        writeMessage(`${obj.id ?? ""} [${obj.status ? obj.status.toUpperCase() : "Unknown"}${progress}] - "${obj.summary ?? obj.name ?? ""}"${assigneeText}`);
      }

      if (obj.myitem && !_tooltipGroup || _tooltipGroup.myitem != obj.myitem) {
        if (_tooltipGroup) {
          canvas.remove(_tooltipGroup);
        }

        let fontSize = 24 - Math.round(5*canvas.getZoom());
        if (fontSize > 18) {
          fontSize = 18;
        } else if (fontSize < 8) {
          fontSize = 8;
        }

        //const tooltip = `${obj.myitem.jira}: ${obj.myitem.summary}`;
        tooltip = obj.myitem.summary;
        if (tooltip) {
          const text = new fabric.Text(tooltip, {fontSize: fontSize, fontFamily: 'Helvetica', textAlign: 'left', top: 0, left: 5});
          const rect = new fabric.Rect({top: 0, left: 0, width: text.width + 10, height: fontSize+2, fill: 'rgba(194, 64, 64, 0.9)', rx: 4, ry: 4, transparentCorners: true});
          let left = obj.parentObject ? obj.parentObject.left : obj.left;
          _tooltipGroup = new fabric.Group([rect, text], {
            left: left, top: obj.top - rect.height - 1
          });
          _tooltipGroup.myitem = obj.myitem;
          canvas.add(_tooltipGroup);
          canvas.requestRenderAll();  
        }
      }
    }
  });

  canvas.on('mouse:out', function(opt) {
    if (_targetURL) {
      _targetURL = null;
      writeMessage("");
      if (_tooltipGroup) {
        canvas.remove(_tooltipGroup);
        canvas.requestRenderAll();
        _tooltipGroup = null;
      }
    }
  });

  // Zoom support
  canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, fixZoom(zoom));
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  return canvas;
};

function downloadImage(link, target, format="png") {
  let filename = _team.name ?? 'map_canvas';
  if (filename.indexOf('.') < 0) {
    filename = `${filename}.${format}`;
  }
  if (format === "jpeg" || format === "png") {
    link.href = target.toDataURL({
      format: format,
      quality: 0.8
    });  
  } else if (format === "svg") {
    const data = target.toSVG(); 
    link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  } else {
    const data = JSON.stringify(target.toJSON());
    link.href = 'data:application/json,' + encodeURIComponent(data);
  }
  link.download = filename;
}

function handleCanvasPopupMenu(canvas, menu, e) {
  let target = canvas.findTarget(e, false);
  let type = null;
  if (target) {
    type = target.type;
  } else {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
  e.preventDefault();

  removeChildren(menu);
  if (type === "feat" || type === "epic" || type === "item") {
    buildTargetPopupMenu(target, menu);
  } else {
    let el = document.elementFromPoint(e.x, e.y);
    if (el) {
      // Navigate to parent element specifying data
      while (el && !el.getAttribute('data-type')) {
        el = el.parentElement;
      }
    }

    if (el && el.getAttribute('data-type') === "assignee") {
      buildAssigneePopupMenu(menu);
    } else {
      buildCanvasPopupMenu(canvas, menu);
    }
  }
  menu.style.display = 'block';
  menu.style.left = e.pageX+"px";
  menu.style.top = e.pageY+"px";

  return false;
};

function buildCanvasPopupMenu(canvas, menu) {
  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${_team.name ?? _team.squad} Map</span></h5>`;
  menu.appendChild(mi);

  const className = "list-group-item list-group-item-action menuitem-padding";

  // PI Demo
  addPIDemoMenuItem(menu, className);

  // Toggle Team/Items Mode
  if (_team.members) {
    mi = document.createElement("a");
    mi.className = className;
    mi.href = "#";
    mi.onclick = function() {
      SHOW_TEAM = !SHOW_TEAM;
      showTeamMap();
    };
    if (SHOW_TEAM) {
      mi.innerHTML = `<i class="material-icons">category</i> Show Items`;
    } else {
      mi.innerHTML = `<i class="material-icons">group</i> Show Team`;
    }
    menu.appendChild(mi);  
  }

  // Toggle UNPLANNED/PLANNED Feats
  mi = document.createElement("a");
  mi.className = className;
  mi.href = "#";
  mi.onclick = function() {
    SHOW_UNPLANNED = !SHOW_UNPLANNED;
    showTeamMap();
  };
  if (SHOW_UNPLANNED) {
    mi.innerHTML = `<i class="material-icons">filter_list</i> Show Planned Only`;
  } else {
    mi.innerHTML = `<i class="material-icons">filter_list_off</i> Show All Items`;
  }
  menu.appendChild(mi);

  // Download Map
  if (true) {
    mi = document.createElement("a");
    mi.className = className;
    mi.href = "#";
    mi.onclick = function() {
      downloadImage(this, canvas, "json");
    };
    mi.innerHTML = `<i class="material-icons">download</i> Download as JSON...`;
    menu.appendChild(mi);
  }
}

function buildTargetPopupMenu(target, menu) {
  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${target.id} Item</span></h5>`;
  menu.appendChild(mi);

  const className = "list-group-item list-group-item-action menuitem-padding";

  // Show item children
  if (target.myitem && target.myitem.children) {
    mi = document.createElement("a");
    mi.className = className;
    mi.href = "#";
    mi.setAttribute("onclick", `showChildren("${target.id}"); return false;`);
    mi.innerHTML = `<i class="material-icons">table_rows</i> Show Children...`;
    menu.appendChild(mi);
  }

  // Open item external
  if (target.myitem && ISSUE_WEBSITE_URL) {
    const item = target.myitem;
    mi = document.createElement("a");
    mi.className = className;
    mi.href = `${ISSUE_WEBSITE_URL}${item.jira}`;
    mi.setAttribute("target", "item_jira");
    mi.innerHTML = `<i class="material-icons">open_in_browser</i> ${item.jira}...`;
    menu.appendChild(mi);
  }
}

function findObjectById(itemId) {
  const objects = _canvasMap.getObjects();
  for (let i=0; i<objects.length; i++) {
    if (objects[i].id === itemId) {
      return objects[i];
    }
  }
  return null;
}

function setObjectStatus(itemId, itemStatus) {
  const item = findObjectById(itemId);
  if (item) {
    item.set({status: itemStatus});
    _canvasMap.requestRenderAll();
  }
  closePopupMenu();
}

function fixZoom(zoom) {
  zoom = toFixed(zoom);
  if (zoom > 5) zoom = 5;
  else if (zoom < 0.1) zoom = 0.1;
  else if (isNaN(zoom)) zoom = 1;
  return zoom;
}

function updateZoomValues(canvas) {
  canvas.viewportTransform[4] = 0;
  canvas.viewportTransform[5] = 0;
  canvas.setViewportTransform(canvas.viewportTransform);
}

function _fitToCanvas(canvas) {
  canvas.discardActiveObject();
  const activeObj = new fabric.ActiveSelection(canvas.getObjects(), {
    canvas: canvas
  });
  canvas.setActiveObject(activeObj);
  const margin = 10;
  let scaleX = (canvas.width - margin*2) / activeObj.width;
  let scaleY = (canvas.height - margin*2) / activeObj.height;
  if (scaleX > scaleY) {
    scaleX = scaleY;
  }
  activeObj.set({
    top: margin,
    left: margin,
    scaleY: scaleX,
    scaleX: scaleX
  });
  canvas.setZoom(1);
  canvas.discardActiveObject();
  updateZoomValues(canvas);
};

function _renderTeamDate(canvas) {
  const dateFormatted = formatDate(_date);
  const teamSprint = SPRINT(_team.sprint);
  let svgImageURL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' style='background-color:%23000000%3B%27%3E%3Cstyle type='text/css'%3E text %7B fill: gray; font-family: Avenir; opacity: 0.66; %7D%0A%3C/style%3E%3Cdefs%3E%3Cpattern id='textstripe' patternUnits='userSpaceOnUse' width='650' height='200' patternTransform='rotate(-45)'%3E%3Ctext y='40' font-family='Avenir' font-size='36'%3E${dateFormatted}%3Ctspan%20class%3D%22em%22%20dx%3D%222.0cm%22%20dy%3D%222.5cm%22%3E${teamSprint}%3C%2Ftspan%3E%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23textstripe)' /%3E%3C/svg%3E")`;
  const canvasDiv = document.getElementById('canvas-bg');
  canvasDiv.style.backgroundImage = svgImageURL;
}

function calcFeatSize(sp) {
  // width = (N * 170 + 50) / 4
  if (sp >= 80) {
    return 607.5;
  } else if (sp >= 40) {
    return 310;
  } else if (sp >= 21) {
    return 267.5;
  } else if (sp >= 13) {
    return 225;
  } else if (sp >= 8) {
    return 182.5
  }
  return 140;
}

function _getStatusStroke(status) {
  if (status === "backlog") {
    return "#000000";
  } else if (status === "pending") {
    return "#B2A515";
  } else if (status === "ready") {
    return "#06168E";
  } else if (status === "blocked") {
    return "#C16767";
  } else if (status === "inprogress") {
    return "#EBDA24";
  } else if (status === "completed") {
    return "#01740F";
  }
  return "#000000";
}

function _renderItemsCanvas(canvas, items) {
  let left = 50;
  let top = 50;
  let rowHeight = 0;
  let ratio = canvas.height / canvas.width - 0.1;
  if (ratio > 1) {
    ratio = canvas.width / canvas.height - 0.1;
  }
  if (ratio < 0.7) {
    ratio = 0.7;
  }

  items.forEach((item) => {
    if (!SHOW_UNPLANNED && item.status === "BACKLOG") {
      return;
    }

    const effort = EFF(convertToSP(item.computed_effort, item.unit));
    let obj;
    if (item.type === "FEAT") {
      obj = _createFeat(item.jira, effort, item.summary);
    } else {
      obj = _createItem(item.jira, effort, item.summary);
    }
    obj.myitem = item;
    obj.estimate = item.estimate;
    obj.set({left: left, top: top, width: calcFeatSize(item.estimate ?? effort), status: item.status.toLowerCase()});
    canvas.add(obj);
    if (item.children) {
      const childrenTop = _renderChildrenItems(canvas, item, obj);
      if (childrenTop > obj.top + obj.height * obj.scaleY) {
        obj.set({height: (childrenTop - top + obj.height - 50) / obj.scaleY});
      }
    }
    if (obj.height > rowHeight) {
      rowHeight = obj.height;
    }

    left += obj.width * obj.scaleX + 50;
    if (left > canvas.width * obj.scaleX * ratio) {
      left = 50;
      top += rowHeight * obj.scaleY + 50;
      rowHeight = 0;
    }
  });
}

function _renderChildrenItems(canvas, parentItem, parentObject) {
  let left = parentObject.left + 50;
  let top = parentObject.top + 100;
  let item = null;

  function nextColRow(item, newline = false) {
    if (item) {
      left += item.width * item.scaleX + 50;
    }
    
    if (newline || left > parentObject.left + parentObject.width * parentObject.scaleX - 120) {
      left = parentObject.left + 50;
      if (item) {
        top += item.height * item.scaleY + 50;
      }
      item = null;
    }
  }

  let items = parentItem.children;
  if (_assignee) {
    items = items.filter(function (row) {
      return (isEmpty(_assignee) || isEmpty(row["assignee"]) || valueIn(row["assignee"], _assignee) || valueIn(row["assignee"], _po));
    });
  }

  items.forEach((child) => {
    // Handle nested items (i.e. epics)
    if (child.children) {
      nextColRow(item, true);
      let x = left - 8;
      let y = top - 8;
      let width = 0;
      let height = 0;
      let index = canvas.size();

      let children = child.children;
      if (_assignee) {
        children = children.filter(function (row) {
          return (isEmpty(_assignee) || valueIn(row["assignee"], _assignee));
        });
      }

      children.sort(function (a, b) {
        let result = compare(a, b, "status") * -1;
        if (result === 0) {
          result = compare(a, b, "estimate");
        }
        if (result === 0) {
          result = compare(a, b, "jira");
        }
        return result;
      });

      children.forEach((story) => {
        item = _createItem(story.jira, story.estimate, story.summary);
        item.myitem = story;
        item.parentItem = child;
        item.set({left: left, top: top, status: story.status.toLowerCase()});
        canvas.add(item);
        width = Math.max(width, item.left + item.width - x);
        height = item.top + item.height - y;
        nextColRow(item);
      });

      if (width > 0) {
        const epicRect = new fabric.Rect();
        epicRect.type = child.type.toLowerCase();
        epicRect.summary = child.summary;
        epicRect.id = child.jira;
        epicRect.sp = child.estimate;
        epicRect.status = child.status.toLowerCase();
        epicRect.myitem = child;
        epicRect.parentItem = parentItem;
        epicRect.set({
          left: x, top: y, width: width + 8, height: height + 8, rx: 10, ry: 10, fill: null,
            stroke: _getStatusStroke(epicRect.status), strokeDashArray: [5, 5], strokeWidth: 2, opacity: 1, padding: 0
        });
        canvas.insertAt(epicRect, index);
      }
    } else {
      item = _createItem(child.jira, child.estimate, child.summary);
      item.myitem = child;
      item.parentItem = parentItem;
      item.parentObject = parentObject;      
      item.set({left: left, top: top, status: child.status.toLowerCase()});
      canvas.add(item);
      nextColRow(item);
    }
  });

  nextColRow(item, true);
  return top;
}

function _renderTeamCanvas(canvas, members) {
  let left = 50;
  let top = 50;
  let rowHeight = 0;
  let ratio = canvas.height / canvas.width - 0.1;
  if (ratio > 1) {
    ratio = canvas.width / canvas.height - 0.1;
  }
  if (ratio < 0.7) {
    ratio = 0.7;
  }

  let membersArray = [];
  Object.keys(members).forEach((id) => {
    membersArray.push(members[id]);
  });
  membersArray = membersArray.sort(function (a, b) {
    let result = compare(a, b, "squad");
    if (result === 0) {
      result = compare(a, b, "role");
    }
    if (result === 0) {
      result = compare(a, b, "name");
    }
    return result;
  });

  const squads = [];
  const sharedSquad = { name: "FLOATERS", members: [] };
  const squadMap = { "FLOATERS" : sharedSquad };
  membersArray.forEach((member) => {
    let squad;
    if (member.squad) {
      squad = squadMap[member.squad];
      if (!squad) {
        squad = { name: member.squad, members: [] };
        squadMap[member.squad] = squad;
        squads.push(squad);
      }
    } else {
      squad = sharedSquad;
    }
    squad.members.push(member);
  });
  if (sharedSquad.members.length > 0) {
    squads.push(sharedSquad);
  }

  squads.forEach((squad) => {
    let obj = _createSquad(squad.name, squad.capacity ?? 0);
    obj.myitem = squad;
    obj.set({left: left, top: top, width: calcFeatSize(squad.capacity ?? squad.members.length)});
    canvas.add(obj);
    if (squad.members) {
      const childrenTop = _renderChildrenMembers(canvas, squad, obj);
      if (childrenTop > obj.top + obj.height * obj.scaleY) {
        obj.set({height: (childrenTop - top + obj.height - 50) / obj.scaleY});
      }
    }
    if (obj.height > rowHeight) {
      rowHeight = obj.height;
    }

    left += obj.width * obj.scaleX + 50;
    if (left > canvas.width * obj.scaleX * ratio) {
      left = 50;
      top += rowHeight * obj.scaleY + 50;
      rowHeight = 0;
    }
  });
}

function _renderChildrenMembers(canvas, parentItem, parentObject) {
  let left = parentObject.left + 50;
  let top = parentObject.top + 100;
  let item = null;

  function nextColRow(item, newline = false) {
    if (item) {
      left += item.width * item.scaleX + 50;
    }
    
    if (newline || left > parentObject.left + parentObject.width * parentObject.scaleX - 120) {
      left = parentObject.left + 50;
      if (item) {
        top += item.height * item.scaleY + 50;
      }
      item = null;
    }
  }

  let members = parentItem.members;
  members.forEach((member) => {
    item = _createMember(member.id, member.role, member.name);
    item.myitem = member;
    item.parentItem = parentItem;
    item.parentObject = parentObject;      
    item.set({left: left, top: top});
    canvas.add(item);
    nextColRow(item);
  });

  nextColRow(item, true);
  return top;
}
