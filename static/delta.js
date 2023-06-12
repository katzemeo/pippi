function animateDelta(app, data, callback) {
  const nextFn = function() {
    animateUpdatedItems(app, data, function() {
      const nextSprint = getNextSprint();
      //console.log(`animateUpdatedItems() - nextSprint=${nextSprint}`, data);
      if (nextSprint && (SHOW_ALL || !data.autoClose)) {
        const fn = function() { loadTeamItems(_teamName ?? "MY_TEAM", nextSprint); };
        if (!callback) {
          callback = fn;
        }
        showMessage(app, `NEXT: ${nextSprint}`, SHOW_ALL ? null : fn);
      } else {
        showMessage(app, `Thank You!!!`);
      }
      if (callback) {
        setTimeout(() => { callback(); }, 3000 / getSpeed());
      }
    });
  };

  if (SHOW_ADDED) {
    animateAddedItems(app, data, nextFn);
  } else {
    nextFn();
  }
}

// Note: sort in reverse since pop() is used!
function sortByProgress(items) {
  items.sort(function (a, b) {
    a = a["item"];
    b = b["item"];
    let result = compare(a, b, "status") * -1;
    if (result === 0) {
      result = compare(a, b, "estimate") * -1;
    }
    if (result === 0) {
      result = compare(a, b, "jira") * -1;
    }
    return result;
  });
}

function animateAddedItems(app, data, callback) {
  if (data && (data.sprint === "BASE" || (data.delta && data.delta.added))) {
    let stories = [];
    let feats = [];
    if (data.sprint === "BASE") {
      data.items.forEach((feat) => {
        if (feat.status !== "BACKLOG" && feat.status !== "PENDING" && (!COMPLETED_ONLY || feat.status === "COMPLETED")) {
          feats.push({item: feat});
        }
      });
    } else {
      Object.keys(data.delta.added).forEach((id) => {
        let item = findItemByJira(id);
        if (item) {
          item.new = true;
          if (item.type === "STORY" || item.type === "SPIKE") {
            if ((!COMPLETED_ONLY || item.status === "COMPLETED")) {
              stories.push({item: item});
            }
          } else if (item.type === "FEAT") {
            if (item.status !== "BACKLOG" && item.status !== "PENDING" && (!COMPLETED_ONLY || item.status === "COMPLETED")) {
              feats.push({item: item});
            }
          }
        } else {
          console.log(`Unknown new item ${id}!`);
        }
      });
    }

    sortByProgress(stories);
    sortByProgress(feats);

    if (SHOW_STORIES) {
      app.context.type = `New Stories ${COMPLETED_ONLY ? "Completed" : "Added"}`;
      app.context.total = stories.length;
      cycleAddedItems(app, stories, function() {
        app.context.type = `New Feats ${COMPLETED_ONLY ? "Closed" : "Added"}`;
        app.context.total = feats.length;
        cycleAddedItems(app, feats, callback);
      });
    } else {
      app.context.type = `New Feats ${COMPLETED_ONLY ? "Closed" : "Added"}`;
      app.context.total = feats.length;
      cycleAddedItems(app, feats, callback);
    }
  } else {
    callback();
  }
}

function animateUpdatedItems(app, data, callback) {
  if (data && (data.delta && data.delta.updated)) {
    let stories = [];
    let feats = [];
    Object.keys(data.delta.updated).forEach((id) => {
      let item = findItemByJira(id);
      let updated = data.delta.updated[id];
      if (item) {
        if (item.type === "STORY" || item.type === "SPIKE") {
          if ((!COMPLETED_ONLY || item.status === "COMPLETED")) {
            stories.push({item: item, diffs: updated.diffs });
          }
        } else if (item.type === "FEAT") {
          if ((!COMPLETED_ONLY || item.status === "COMPLETED")) {
            feats.push({item: item, diffs: updated.diffs });
          }
        }
      } else {
        console.log(`Unknown updated item ${id}!`);
      }
    });

    sortByProgress(stories);
    sortByProgress(feats);
    if (SHOW_STORIES) {
      app.context.type = `Stories ${COMPLETED_ONLY ? "Completed" : "Updated"}`;
      app.context.total = stories.length;
      cycleMessages(app, stories, function() {
        app.context.type = `Feats ${COMPLETED_ONLY ? "Closed" : "Updated"}`;
        app.context.total = feats.length;      
        cycleMessages(app, feats, callback);
      });
    } else {
      app.context.type = `Feats ${COMPLETED_ONLY ? "Closed" : "Updated"}`;
      app.context.total = feats.length;      
      cycleMessages(app, feats, callback);
    }
  } else {
    callback();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animateNewItem(app, item, callback, options) {
  let itemRendered = function(texture) {
    const sprite = new PIXI.Sprite(texture);

    const bgWidth = app.screen.width;
    const bgHeight = app.screen.height;
    scaleItem(sprite, item);
    sprite.y = -25;
    if (options && options.forward) {
      sprite.x = 50;
    } else {
      sprite.x = randomInt(50, bgWidth - sprite.width*2);
    }
    app.stage.addChild(sprite);

    sprite.dx = 2;
    sprite.dy = -20;

    let count = 1;
    let bounce = 0;
    let speed = 20 * getSpeed();
    let distance = sprite.x + randomInt(300, 500);
    let acceleration = 0;
    const l2rTickerCB = delta => {
      if (sprite.x > distance || bounce > 1) {
        sprite.x = 50;
        count--;
        if (count <= 0 || bounce > 1) {
          app.ticker.remove(l2rTickerCB);
          app.stage.removeChild(sprite);
          if (callback) {
            callback();
          }
        }
      } else {
        sprite.x = sprite.x + speed * delta;
        speed += acceleration;

        if (sprite.x >= bgWidth - sprite.width || sprite.x < sprite.width) {
          sprite.dx *= -1;
        }
        if (sprite.y >= bgHeight - sprite.height) {
          bounce++;
          sprite.dy = -20 + bounce*4;
        }

        sprite.x += sprite.dx;
        sprite.dy += .5;
        sprite.y += sprite.dy;
      }
    }

    const t2bTickerCB = delta => {
      if (sprite.y > bgHeight - sprite.height - 50) {
        app.ticker.remove(t2bTickerCB);
        if (options && options.forward) {
          speed = 10 * getSpeed();
          distance = bgWidth + 200;
          acceleration = 0.25
        } else {
          speed = 4 * getSpeed();
        }
        app.ticker.add(l2rTickerCB);
      } else {
        sprite.y = sprite.y + speed * delta;
        speed += 1;
      }
    }
    app.ticker.add(t2bTickerCB);
  };
  renderTexture(item, itemRendered);
}

function cycleAddedItems(app, messages, callback) {
  if (messages.length > 0) {
    const m = messages.pop();
    const ctx = app.context.type;
    const total = app.context.total;
    const title = `${ctx} in Sprint`;
    writeStats(`${total - messages.length} of ${total} ${ctx}`, title);
    writeSP(m.item.estimate);
    let status = m.item.status;
    let options = {};
    if (status === "INPROGRESS" && (m.item.type === "STORY" || m.item.type === "SPIKE")) {
      writeMessage(`${lookupTeamMember(m.item.assignee)} working on (NEW) ${m.item.jira} - ${m.item.summary}`, true);
      showMessage(app, `✱ ${m.item.jira} ⇨ ${m.item.summary}`, null, options);
      animateNewItem(app, m.item, function() {
        queueFunction(() => { cycleAddedItems(app, messages, callback); }, 500 / getSpeed());
      }, { forward: true });
    } else if (status === "COMPLETED") {
      options = { fill: ['#ffffff', '#008800'], stroke: '#001a33'};
      let data;
      if (m.item.type === "FEAT") {
        writeMessage(`${lookupTeamMember(m.item.assignee)} CLOSED (NEW) ${m.item.jira} - ${m.item.summary}`, true);
        const spritesMap = getItemAssignees(m.item);
        const assignees = Object.keys(spritesMap);
        if (assignees.length > 1) {
          data = { assignees: spritesMap };
        } else {
          if (assignees.length > 1) {
            data = spritesMap[spritesMap[assignees[0]]];
          } else {
            data = lookupSprite(m.item.assignee);
          }
        }
      } else {
        writeMessage(`${lookupTeamMember(m.item.assignee)} ✔ COMPLETED (NEW) ${m.item.jira} - ${m.item.summary}`, true);
        data = lookupSprite(m.item.assignee);
      }

      showMessage(app, `✱ ${m.item.jira} ✔ ${m.item.summary}`, null, options);      
      data.multi = 1;
      data.filter = false;
      data.item = m.item;
      const itemRendered = function(texture) {
        data.itemTexture = texture;
        const fn = function() {
          let symbols = getCompletedSymbols(m.item, true);
          showMessage(app, `${m.item.type} ✱ ${m.item.jira} ✔ COMPLETED!\n${symbols}`, null, options);
          queueFunction(() => { cycleAddedItems(app, messages, callback); }, 3000 / getSpeed());
        };
        if (data.assignees) {
          animateGroupSPSprint(app, data, fn, { drop: true });
        } else {
          animateSPSprint(app, data, fn, { drop: true });
        }
      }
      renderTexture(m.item, itemRendered);
    } else {
      let symbol = "☕";
      let time = 1000;
      if (status === "READY") {
        symbol = "⚡";
        options = { fill: ['#ffffff', '#0000ff'], stroke: '#001a33'};
      } else if (status === "BLOCKED") {
        symbol = "⛔";
        time *= 2.5;
        options = { fill: ['#440000', '#ff0000'], stroke: '#001a33'};
      } else if (status === "PENDING" || status === "BACKLOG") {
        symbol = "✍";
        options = { fill: ['#9A9790'], stroke: '#000000'};
      } else if (status === "INPROGRESS") {
        symbol = "⌛";
      }
      writeMessage(`[${status}] ${symbol} (NEW) ${m.item.jira} - ${m.item.summary}`, true);
      showMessage(app, `✱ ${m.item.jira} ${symbol} ${m.item.summary}`, null, options);
      animateNewItem(app, m.item, function() {
        queueFunction(() => { cycleAddedItems(app, messages, callback); }, time / getSpeed());
      });
    }
  } else if (callback) {
    callback();
  }
}

function getCompletedSymbols(item, newItem=false) {
  let symbols = "👏";
  if (item.type === "FEAT") {
    symbols += "🎉";
  }

  if (newItem) {
    symbols += "🔥";
  }
  return symbols;
}

function lookupSprite(memberID) {
  let sprite = { };
  if (_team.members && memberID) {
    const member = _team.members[memberID];
    if (member) {
      if (member.icon) {
        sprite.character = member.icon;
        if (member.animate) {
          sprite.frames = (member.animate.attack ?? sprite.character) +"_sprite";
          Object.assign(sprite, member.animate);
        } else {
          sprite.frames = sprite.character +"_sprite";
        }
      } else if (_team.loadIcons) {
        let character = member.name.replaceAll(' ', '');
        if (character.indexOf(".") > 0) {
          character = character.substring(0, character.indexOf("."));
        }
        if (character.indexOf("/") > 0) {
          character = character.substring(0, character.indexOf("/"));
        }
        sprite.character = `icon_${character}`;
        sprite.frames = "icon";
      }
    }
  }

  if (!sprite.character) {
    sprite.character = "pippi";
    sprite.frames = "icon";
  }
  return sprite;
}

function cycleMessages(app, messages, callback) {
  if (messages.length > 0) {
    const m = messages.pop();
    const ctx = app.context.type;
    const total = app.context.total;
    const title = `${ctx} in Sprint`;
    writeStats(`${total - messages.length} of ${total} ${ctx}`, title);
    writeSP(m.item.estimate);
    let status = "";
    for (let i=0; i < m.diffs.length; i++) {
      if (m.diffs[i].key === "status") {
        status = m.diffs[i].new;
        if (m.diffs[i].old === "BLOCKED") {
          m.item.unblocked = true;
        }
        break;
      }
    }

    let options = {};
    if (status === "INPROGRESS" && (m.item.type === "STORY" || m.item.type === "SPIKE")) {
      writeMessage(`${lookupTeamMember(m.item.assignee)} ⌛ working on ${m.item.jira} - ${m.item.summary}`, true);
      showMessage(app, `${m.item.jira} ⇨ ${m.item.summary}`, null, options);
      queueFunction(() => { cycleMessages(app, messages, callback); }, 1000 / getSpeed());
    } else if (status === "COMPLETED") {
      options = { fill: ['#ffffff', '#008800'], stroke: '#001a33'};
      let data;
      if (m.item.type === "FEAT") {
        writeMessage(`${lookupTeamMember(m.item.assignee)} ✔ CLOSED ${m.item.jira} - ${m.item.summary}`, true);
        const spritesMap = getItemAssignees(m.item);
        const assignees = Object.keys(spritesMap);
        if (assignees.length > 1) {
          data = { assignees: spritesMap };
        } else {
          if (assignees.length > 1) {
            data = spritesMap[spritesMap[assignees[0]]];
          } else {
            data = lookupSprite(m.item.assignee);
          }
        }
      } else {
        writeMessage(`${lookupTeamMember(m.item.assignee)} ✔ COMPLETED ${m.item.jira} - ${m.item.summary}`, true);
        data = lookupSprite(m.item.assignee);
      }

      showMessage(app, `${m.item.jira} ✔ ${m.item.summary}`, null, options);
      data.multi = 1;
      data.filter = false;
      data.item = m.item;
      const itemRendered = function(texture) {
        data.itemTexture = texture;
        const fn = function() {
          let symbols = getCompletedSymbols(m.item, true);
          showMessage(app, `${m.item.type} ${m.item.jira} ✔ COMPLETED!\n${symbols}`, null, options);
          queueFunction(() => { cycleAddedItems(app, messages, callback); }, 3000 / getSpeed());
        };
        if (data.assignees) {
          animateGroupSPSprint(app, data, fn, { drop: true });
        } else {
          animateSPSprint(app, data, fn, { drop: true });
        }
      }
      renderTexture(m.item, itemRendered);
    } else {
      let symbol = "☕";
      let time = 1000;
      status = m.item.status;
      if (status === "READY") {
        symbol = "⚡";
        options = { fill: ['#ffffff', '#0000ff'], stroke: '#001a33'};
      } else if (status === "BLOCKED") {
        symbol = "⛔";
        time *= 2.5;
        options = { fill: ['#440000', '#ff0000'], stroke: '#001a33'};
      } else if (status === "PENDING" || status === "BACKLOG") {
        symbol = "✍";
        options = { fill: ['#9A9790'], stroke: '#000000'};
      } else if (status === "INPROGRESS") {
        symbol = "⌛";
      }
      writeMessage(`[${status}] ${symbol} ${m.item.jira} - ${m.item.summary}`, true);
      showMessage(app, `${m.item.jira} ${symbol} ${m.item.summary}`, null, options);
      queueFunction(() => { cycleMessages(app, messages, callback); }, time / getSpeed());
    }
  } else if (callback) {
    callback();
  }
}

function getItemAssignees(item, assignees=null) {
  if (!assignees) {
    assignees = {};
  }
  if ((item.type === "STORY" || item.type === "SPIKE") &&
      (item.status === "COMPLETED" || item.status === "INPROGRESS") &&
      item.assignee && !assignees[item.assignee]) {
    const data = lookupSprite(item.assignee);
    if (data) {
      assignees[item.assignee] = data;
    }
  }

  if (item.children) {
    item.children.forEach((child) => {
      getItemAssignees(child, assignees);
    });
  }

  return assignees;
}
