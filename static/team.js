const _img_active = document.createElement('img');
const _img_inactive = document.createElement('img');
const _img_group = document.createElement('img');
_img_active.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJtNDIxIDc1OCAyODMtMjgzLTQ2LTQ1LTIzNyAyMzctMTIwLTEyMC00NSA0NSAxNjUgMTY2Wm01OSAyMThxLTgyIDAtMTU1LTMxLjV0LTEyNy41LTg2UTE0MyA4MDQgMTExLjUgNzMxVDgwIDU3NnEwLTgzIDMxLjUtMTU2dDg2LTEyN1EyNTIgMjM5IDMyNSAyMDcuNVQ0ODAgMTc2cTgzIDAgMTU2IDMxLjVUNzYzIDI5M3E1NCA1NCA4NS41IDEyN1Q4ODAgNTc2cTAgODItMzEuNSAxNTVUNzYzIDg1OC41cS01NCA1NC41LTEyNyA4NlQ0ODAgOTc2Wm0wLTYwcTE0MiAwIDI0MS05OS41VDgyMCA1NzZxMC0xNDItOTktMjQxdC0yNDEtOTlxLTE0MSAwLTI0MC41IDk5VDE0MCA1NzZxMCAxNDEgOTkuNSAyNDAuNVQ0ODAgOTE2Wm0wLTM0MFoiLz48L3N2Zz4=";
_img_inactive.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMjY2LjExOCA2MjZRMjg3IDYyNiAzMDEuNSA2MTEuMzgycTE0LjUtMTQuNjE3IDE0LjUtMzUuNVEzMTYgNTU1IDMwMS4zODIgNTQwLjVxLTE0LjYxNy0xNC41LTM1LjUtMTQuNVEyNDUgNTI2IDIzMC41IDU0MC42MThxLTE0LjUgMTQuNjE3LTE0LjUgMzUuNVEyMTYgNTk3IDIzMC42MTggNjExLjVxMTQuNjE3IDE0LjUgMzUuNSAxNC41Wm0yMTQgMFE1MDEgNjI2IDUxNS41IDYxMS4zODJxMTQuNS0xNC42MTcgMTQuNS0zNS41UTUzMCA1NTUgNTE1LjM4MiA1NDAuNXEtMTQuNjE3LTE0LjUtMzUuNS0xNC41UTQ1OSA1MjYgNDQ0LjUgNTQwLjYxOHEtMTQuNSAxNC42MTctMTQuNSAzNS41UTQzMCA1OTcgNDQ0LjYxOCA2MTEuNXExNC42MTcgMTQuNSAzNS41IDE0LjVabTIxMyAwUTcxNCA2MjYgNzI4LjUgNjExLjM4MnExNC41LTE0LjYxNyAxNC41LTM1LjVRNzQzIDU1NSA3MjguMzgyIDU0MC41cS0xNC42MTctMTQuNS0zNS41LTE0LjVRNjcyIDUyNiA2NTcuNSA1NDAuNjE4cS0xNC41IDE0LjYxNy0xNC41IDM1LjVRNjQzIDU5NyA2NTcuNjE4IDYxMS41cTE0LjYxNyAxNC41IDM1LjUgMTQuNVpNNDgwLjI2NiA5NzZxLTgyLjczNCAwLTE1NS41LTMxLjV0LTEyNy4yNjYtODZxLTU0LjUtNTQuNS04Ni0xMjcuMzQxUTgwIDY1OC4zMTkgODAgNTc1LjVxMC04Mi44MTkgMzEuNS0xNTUuNjU5UTE0MyAzNDcgMTk3LjUgMjkzdDEyNy4zNDEtODUuNVEzOTcuNjgxIDE3NiA0ODAuNSAxNzZxODIuODE5IDAgMTU1LjY1OSAzMS41UTcwOSAyMzkgNzYzIDI5M3Q4NS41IDEyN1E4ODAgNDkzIDg4MCA1NzUuNzM0cTAgODIuNzM0LTMxLjUgMTU1LjVUNzYzIDg1OC4zMTZxLTU0IDU0LjMxNi0xMjcgODZRNTYzIDk3NiA0ODAuMjY2IDk3NlptLjIzNC02MFE2MjIgOTE2IDcyMSA4MTYuNXQ5OS0yNDFRODIwIDQzNCA3MjEuMTg4IDMzNSA2MjIuMzc1IDIzNiA0ODAgMjM2cS0xNDEgMC0yNDAuNSA5OC44MTJRMTQwIDQzMy42MjUgMTQwIDU3NnEwIDE0MSA5OS41IDI0MC41dDI0MSA5OS41Wm0tLjUtMzQwWiIvPjwvc3ZnPg==";
_img_group.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgLTk2MCA5NjAgOTYwIiB3aWR0aD0iNDgiPjxwYXRoIGQ9Ik0zOC0xNjB2LTk0cTAtMzUgMTgtNjMuNXQ1MC00Mi41cTczLTMyIDEzMS41LTQ2VDM1OC00MjBxNjIgMCAxMjAgMTR0MTMxIDQ2cTMyIDE0IDUwLjUgNDIuNVQ2NzgtMjU0djk0SDM4Wm03MDAgMHYtOTRxMC02My0zMi0xMDMuNVQ2MjItNDIzcTY5IDggMTMwIDIzLjV0OTkgMzUuNXEzMyAxOSA1MiA0N3QxOSA2M3Y5NEg3MzhaTTM1OC00ODFxLTY2IDAtMTA4LTQydC00Mi0xMDhxMC02NiA0Mi0xMDh0MTA4LTQycTY2IDAgMTA4IDQydDQyIDEwOHEwIDY2LTQyIDEwOHQtMTA4IDQyWm0zNjAtMTUwcTAgNjYtNDIgMTA4dC0xMDggNDJxLTExIDAtMjQuNS0xLjVUNTE5LTQ4OHEyNC0yNSAzNi41LTYxLjVUNTY4LTYzMXEwLTQ1LTEyLjUtNzkuNVQ1MTktNzc0cTExLTMgMjQuNS01dDI0LjUtMnE2NiAwIDEwOCA0MnQ0MiAxMDhaTTk4LTIyMGg1MjB2LTM0cTAtMTYtOS41LTMxVDU4NS0zMDZxLTcyLTMyLTEyMS00M3QtMTA2LTExcS01NyAwLTEwNi41IDExVDEzMC0zMDZxLTE0IDYtMjMgMjF0LTkgMzF2MzRabTI2MC0zMjFxMzkgMCA2NC41LTI1LjVUNDQ4LTYzMXEwLTM5LTI1LjUtNjQuNVQzNTgtNzIxcS0zOSAwLTY0LjUgMjUuNVQyNjgtNjMxcTAgMzkgMjUuNSA2NC41VDM1OC01NDFabTAgMzIxWm0wLTQxMVoiLz48L3N2Zz4=";
const _team_status = { active:_img_active, inactive:_img_inactive };

fabric.Squad = fabric.util.createClass(fabric.Rect, {
  type: 'squad',

  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('lockScalingFlip', true);
    this.set('name', options.name || '');
    this.set('capacity', options.capacity || NaN);
    this.set('status', options.status || 'active');
    this.set('borderColor', 'green');
    this.set('borderScaleFactor', 2);
    this.set('borderDashArray', [4, 4]);
  },

  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      name: this.get('name'),
      capacity: Number(this.get('capacity')),
      status: this.get('status')
    });
  },

  _set: function(key, value) {
    fabric.Rect.prototype._set.call(this, key, value);
    if (key === 'status') {
      this.dirty = true;
      if (this.status === "pending") {
        this.fill = "#EBDA24";
        this.stroke = "#B2A515";
      } else if (this.status === "active") {
        this.fill = "#00873E";
        this.stroke = "#01740F";
      } else {
        this.fill = "#9A9790";
        this.stroke = "#000000";
      }
    }
  },

  _render: function(ctx) {
    if (!_canvasMap) {
      return;
    }

    const size = 18;
    this.callSuper('_render', ctx);

    ctx.font = '10px Helvetica';
    ctx.fillStyle = '#000';
    const name = `${this.name ?? ""}`;
    const text = `${name}: ${this.capacity ? this.capacity + "SP" : ""}`;
    const startX = -this.width/2 + 3;
    const startY = -this.height/2 + 12;
    ctx.fillText(text, startX, startY);
    const textMeasurement = ctx.measureText(name);
    ctx.fillRect(startX, startY + 1, textMeasurement.width, 1);
    if (this.effort >= 0) {
      ctx.font = 'bold 12px Courier';
      ctx.fillText(`${this.effort.toString().padStart(3,' ')} SP`, this.width/2 - 48, -this.height/2 + 12);
    }
    if (_canvasMap.getZoom() * this.height * this.scaleY >= 50) {
      ctx.drawImage(_img_group, this.width/2-size, this.height/2 - size, size, size);
    }
  }
});

fabric.Squad.fromObject = function(object, callback) {
  return fabric.Object._fromObject('Squad', object, callback);
}
fabric.Squad.prototype.hoverCursor = "pointer";

function _createSquad(name, capacity) {
  const squad = new fabric.Squad({
    left: 50,
    top: 50,
    width: 200,
    height: 110,
    strokeWidth: 2,
    rx: 10,
    ry: 10,
    scaleX: 4,
    scaleY: 4,
    opacity: 0.9,
    name: name,
    capacity: capacity
  });
  return squad;
}

fabric.Member = fabric.util.createClass(fabric.Rect, {
  type: 'member',

  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('lockScalingFlip', true);
    this.set('name', options.name || '');
    this.set('id', options.id || '');
    this.set('role', options.role || 'TM');
    this.set('status', options.status || 'active');
    this.set('borderColor', 'green');
    this.set('borderScaleFactor', 2);
    this.set('borderDashArray', [4, 4]);
  },

  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      name: this.get('name'),
      id: this.get('id'),
      role: this.get('role'),
      status: this.get('status')
    });
  },

  _set: function(key, value) {
    fabric.Rect.prototype._set.call(this, key, value);
    if (key === 'status') {
      this.dirty = true;
      if (this.status === "pending") {
        this.fill = "#EBDA24";
        this.stroke = "#B2A515";
      } else if (this.status === "active") {
        this.fill = "#00873E";
        this.stroke = "#01740F";
      } else {
        this.fill = "#9A9790";
        this.stroke = "#000000";
      }
    }
  },

  _render: function(ctx) {
    if (!_canvasMap) {
      return;
    }
    const effHeight = _canvasMap.getZoom() * this.height * this.scaleY;
    const details = (effHeight >= 40);
    const size = 24;
    this.callSuper('_render', ctx);

    ctx.fillStyle = '#000';
    const text = `${this.name ?? this.id ?? ""}`;
    const startX = -this.width/2 + (details ? 3 : 20);
    const startY = details ? 6 : -25;

    if (effHeight >= 40 && this.myitem && this.myitem.id) {
      if (_teamIcons[this.myitem.id]) {
        ctx.drawImage(_teamIcons[this.myitem.id], startX - 4, -this.height + 49, 32, 32);
      } else {
        ctx.font = '14px Helvetica';
        ctx.fillText(lookupTeamMember(this.myitem.id, true), startX + 1, -this.height + 72);
      }
    }

    if (details) {
      ctx.font = '20px Helvetica';
      ctx.fillText(text, startX, startY);
    }

    ctx.font = '32px Helvetica';
    if (this.role) {
      ctx.fillText(`${this.role}`, startX, startY + 40);
    }

    if (details) {
      if (_team_status[this.status]) {
        ctx.drawImage(_team_status[this.status], this.width/2-size, this.height/2 - size, size, size);
      } else {
        console.log(`Unknown status "${this.status}" in Member._render(${this.id})`);
      }
    }
  }
});

fabric.Member.fromObject = function(object, callback) {
  return fabric.Object._fromObject('Member', object, callback);
}
fabric.Member.prototype.hoverCursor = "pointer";

function _createMember(id, role, name = null) {
  const member = new fabric.Member({
    left: 50,
    top: 50,
    width: 120,
    height: 100,
    strokeWidth: 2,
    rx: 10,
    ry: 10,
    name: name ?? "My Member",
    id: id,
    role: role,
    status: "active"
  });
  return member;
}
