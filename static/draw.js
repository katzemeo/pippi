function _initDraw(width, height, map) {
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

  //document.getElementById('download').onclick = saveCanvasImage;

  function saveCanvasImage(e) {
    downloadImage(this, canvas);
  }

  function downloadImage(link, target) {
    let filename = _teamName ?? 'map_canvas';
    const format = 'png';
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

  fabric.Object.prototype.selectable = false;
  fabric.Image.prototype.hoverCursor = "pointer";

  if (map.canvasData) {
    canvas.loadFromJSON(map.canvasData);
  }

  // Pan support
  canvas.on('mouse:down', function(opt) {
    const e = opt.e;
    if (e.altKey || true) {
      this.defaultCursor = 'grab';
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
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
    if (opt.target && !_targetURL) {
      const obj = opt.target;
      if (obj.url) {
        _targetURL = obj.url;
      } else if (obj.id || obj.summary) {
        if (ISSUE_WEBSITE_URL && obj.id) {
          _targetURL = `${ISSUE_WEBSITE_URL}${obj.id}`;
        }
        let assigneeText = "";
        if (obj.item && obj.item.assignee) {
          let assigneeName = obj.item.assignee;
          if (_team.members && _team.members[assigneeName]) {
            assigneeName = _team.members[assigneeName].name ?? assigneeName;
          }
          assigneeText = " ["+ assigneeName +"]";
        }
        writeMessage(`${obj.id ?? ""} [${obj.status ?? "Unknown"}] - "${obj.summary ?? ""}"${assigneeText}`);
      }

      if ((obj.parentItem) && !_tooltipGroup) {
        //const tooltip = `${obj.item.jira}: ${obj.item.summary}`;
        const tooltip = `${obj.parentItem.jira}: ${obj.parentItem.summary}`;
        const text = new fabric.Text(tooltip, {fontSize: 14, fontFamily: 'Helvetica', textAlign: 'left', top: 0, left: 5});
        const rect = new fabric.Rect({top: 0, left: 0, width: text.width + 10, height: 16, fill: 'rgba(194, 64, 64, 0.9)', rx: 4, ry: 4, transparentCorners: true});
        let left = obj.parentObject ? obj.parentObject.left : obj.left;
        _tooltipGroup = new fabric.Group([rect, text], {
          left: left, top: obj.top - rect.height - 1
        });
        canvas.add(_tooltipGroup);
        canvas.requestRenderAll();
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
  function fixZoom(zoom) {
    zoom = toFixed(zoom);
    if (zoom > 5) zoom = 5;
    else if (zoom < 0.1) zoom = 0.1;
    else if (isNaN(zoom)) zoom = 1;
    return zoom;
  }

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

  if (type === "feat" || type === "item") {
    buildCanvasPopupMenu(target, menu);
    menu.style.display = 'block';
    menu.style.left = e.pageX+"px";
    menu.style.top = e.pageY+"px";
  } else {
    menu.style.display = 'none';
  }

  return false;
};

function buildCanvasPopupMenu(target, menu) {
  removeChildren(menu);
  let mi = document.createElement("span");
  mi.className = "list-group-item list-group-item-secondary";
  mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${target.id}</span> Status</h5>`;
  menu.appendChild(mi);

  const meta = { type: "enum", values: ["backlog", "pending", "ready", "blocked", "inprogress", "completed"], captions: { inprogress: "In Progress" } };
  const value = target.status;
  meta.values.forEach((v) => {
    let caption = v;
    let icon = "";
    if (meta.captions) {
      caption = meta.captions[v] ?? toCaptionFromIdentifier(v);
    }

    let className = "list-group-item list-group-item-action";
    if (v === "backlog") {
      icon = "schedule";
    } else if (v === "pending") {
      icon = "pending";
    } else if (v === "ready") {
      icon = "calendar_today";
    } else if (v === "blocked") {
      icon = "block";
    } else if (v === "inprogress") {
      icon = "hourglass_empty";
    } else if (v === "completed") {
      icon = "check_circle";
    } else {
      console.log(`Unknown status value "${v}"`);
    }

    if (v !== value) {
      mi = document.createElement("a");
      mi.className = className;
      mi.href = "#";
      mi.setAttribute("onclick", `setObjectStatus("${target.id}", "${v}"); return false;`);
    } else {
      mi = document.createElement("span");
      mi.className = "list-group-item active";
    }
    mi.innerHTML = `<i class="material-icons">${icon}</i> ${caption}`;
    menu.appendChild(mi);
  });
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
  canvas.viewportTransform[4] = canvas.viewportTransform[5] = 0;
};

function _renderTeamDate(canvas) {
  const dateFormatted = formatDate(_date);
  const teamSprint = SPRINT(_team.sprint);
  let svgImageURL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' style='background-color:%23000000%3B%27%3E%3Cstyle type='text/css'%3E text %7B fill: gray; font-family: Avenir; opacity: 0.66; %7D%0A%3C/style%3E%3Cdefs%3E%3Cpattern id='textstripe' patternUnits='userSpaceOnUse' width='650' height='200' patternTransform='rotate(-45)'%3E%3Ctext y='40' font-family='Avenir' font-size='36'%3E${dateFormatted}%3Ctspan%20class%3D%22em%22%20dx%3D%222.0cm%22%20dy%3D%222.5cm%22%3E${teamSprint}%3C%2Ftspan%3E%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23textstripe)' /%3E%3C/svg%3E")`;
  const canvasDiv = document.getElementById('canvas-bg');
  canvasDiv.style.backgroundImage = svgImageURL;
}

function calcFeatSize(sp) {
  if (sp >= 40) {
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

function _renderItemsCanvas(canvas, items) {
  _renderTeamDate(canvas);
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
    const effort = EFF(convertToSP(item.computed_effort, item.unit));
    let feat = _createFeat(item.jira, effort, item.summary);
    feat.item = item;
    feat.estimate = item.estimate;
    feat.set({left: left, top: top, width: calcFeatSize(item.estimate ?? effort), status: item.status.toLowerCase()});
    canvas.add(feat);
    if (item.children) {
      const childrenTop = _renderChildrenItems(canvas, item, feat);
      if (childrenTop > feat.top + feat.height * feat.scaleY) {
        feat.set({height: (childrenTop - top + feat.height - 50) / feat.scaleY});
      }
    }
    if (feat.height > rowHeight) {
      rowHeight = feat.height;
    }

    left += feat.width * feat.scaleX + 50;
    if (left > canvas.width * feat.scaleX * ratio) {
      left = 50;
      top += rowHeight * feat.scaleY + 50;
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

  parentItem.children.forEach((child) => {
    // Handle nested items (i.e. epics)
    if (child.children) {
      nextColRow(item, true);
      child.children.forEach((story) => {
        item = _createItem(story.jira, story.estimate, story.summary);
        item.item = story;
        item.parentItem = child;
        item.parentObject = parentObject;
        item.set({left: left, top: top, status: story.status.toLowerCase()});
        canvas.add(item);
        nextColRow(item);
      });
    } else {
      item = _createItem(child.jira, child.estimate, child.summary);
      item.item = child;
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
