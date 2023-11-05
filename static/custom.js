const _img_completed = document.createElement('img');
const _img_inprogress = document.createElement('img');
const _img_blocked = document.createElement('img');
const _img_ready = document.createElement('img');
const _img_pending = document.createElement('img');
const _img_backlog = document.createElement('img');
_img_completed.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJtNDIxIDc1OCAyODMtMjgzLTQ2LTQ1LTIzNyAyMzctMTIwLTEyMC00NSA0NSAxNjUgMTY2Wm01OSAyMThxLTgyIDAtMTU1LTMxLjV0LTEyNy41LTg2UTE0MyA4MDQgMTExLjUgNzMxVDgwIDU3NnEwLTgzIDMxLjUtMTU2dDg2LTEyN1EyNTIgMjM5IDMyNSAyMDcuNVQ0ODAgMTc2cTgzIDAgMTU2IDMxLjVUNzYzIDI5M3E1NCA1NCA4NS41IDEyN1Q4ODAgNTc2cTAgODItMzEuNSAxNTVUNzYzIDg1OC41cS01NCA1NC41LTEyNyA4NlQ0ODAgOTc2Wm0wLTYwcTE0MiAwIDI0MS05OS41VDgyMCA1NzZxMC0xNDItOTktMjQxdC0yNDEtOTlxLTE0MSAwLTI0MC41IDk5VDE0MCA1NzZxMCAxNDEgOTkuNSAyNDAuNVQ0ODAgOTE2Wm0wLTM0MFoiLz48L3N2Zz4=";
_img_inprogress.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMzE2IDkxNmgzMjhWNzg5cTAtNzAtNDcuNS0xMjAuNVQ0ODAgNjE4cS02OSAwLTExNi41IDUwLjVUMzE2IDc4OXYxMjdabTE2NC0zODJxNjkgMCAxMTYuNS01MC41VDY0NCAzNjJWMjM2SDMxNnYxMjZxMCA3MSA0Ny41IDEyMS41VDQ4MCA1MzRaTTE2MCA5NzZ2LTYwaDk2Vjc4OXEwLTcwIDM2LjUtMTI4LjVUMzk0IDU3NnEtNjUtMjYtMTAxLjUtODVUMjU2IDM2MlYyMzZoLTk2di02MGg2NDB2NjBoLTk2djEyNnEwIDcwLTM2LjUgMTI5VDU2NiA1NzZxNjUgMjYgMTAxLjUgODQuNVQ3MDQgNzg5djEyN2g5NnY2MEgxNjBaIi8+PC9zdmc+";
_img_blocked.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNNDgwIDk3NnEtODMgMC0xNTYtMzEuNVQxOTcgODU5cS01NC01NC04NS41LTEyN1Q4MCA1NzZxMC04MyAzMS41LTE1NlQxOTcgMjkzcTU0LTU0IDEyNy04NS41VDQ4MCAxNzZxODMgMCAxNTYgMzEuNVQ3NjMgMjkzcTU0IDU0IDg1LjUgMTI3VDg4MCA1NzZxMCA4My0zMS41IDE1NlQ3NjMgODU5cS01NCA1NC0xMjcgODUuNVQ0ODAgOTc2Wm0wLTYwcTE0Mi4zNzUgMCAyNDEuMTg4LTk4LjgxMlE4MjAgNzE4LjM3NSA4MjAgNTc2cTAtNjAuNjYyLTIxLTExNi44MzFRNzc4IDQwMyA3NDAgMzU3TDI2MSA4MzZxNDUgMzkgMTAxLjQ5MyA1OS41UTQxOC45ODcgOTE2IDQ4MCA5MTZaTTIyMSA3OTVsNDc4LTQ3OHEtNDYtMzktMTAyLjE2OS02MFQ0ODAgMjM2cS0xNDIuMzc1IDAtMjQxLjE4OCA5OC44MTJRMTQwIDQzMy42MjUgMTQwIDU3NnEwIDYxLjAxMyAyMiAxMTcuNTA2UTE4NCA3NTAgMjIxIDc5NVoiLz48L3N2Zz4=";
_img_ready.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMTgwIDk3NnEtMjQgMC00Mi0xOHQtMTgtNDJWMjk2cTAtMjQgMTgtNDJ0NDItMThoNjV2LTYwaDY1djYwaDM0MHYtNjBoNjV2NjBoNjVxMjQgMCA0MiAxOHQxOCA0MnY2MjBxMCAyNC0xOCA0MnQtNDIgMThIMTgwWm0wLTYwaDYwMFY0ODZIMTgwdjQzMFptMC00OTBoNjAwVjI5NkgxODB2MTMwWm0wIDBWMjk2djEzMFoiLz48L3N2Zz4=";
_img_pending.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMjY2LjExOCA2MjZRMjg3IDYyNiAzMDEuNSA2MTEuMzgycTE0LjUtMTQuNjE3IDE0LjUtMzUuNVEzMTYgNTU1IDMwMS4zODIgNTQwLjVxLTE0LjYxNy0xNC41LTM1LjUtMTQuNVEyNDUgNTI2IDIzMC41IDU0MC42MThxLTE0LjUgMTQuNjE3LTE0LjUgMzUuNVEyMTYgNTk3IDIzMC42MTggNjExLjVxMTQuNjE3IDE0LjUgMzUuNSAxNC41Wm0yMTQgMFE1MDEgNjI2IDUxNS41IDYxMS4zODJxMTQuNS0xNC42MTcgMTQuNS0zNS41UTUzMCA1NTUgNTE1LjM4MiA1NDAuNXEtMTQuNjE3LTE0LjUtMzUuNS0xNC41UTQ1OSA1MjYgNDQ0LjUgNTQwLjYxOHEtMTQuNSAxNC42MTctMTQuNSAzNS41UTQzMCA1OTcgNDQ0LjYxOCA2MTEuNXExNC42MTcgMTQuNSAzNS41IDE0LjVabTIxMyAwUTcxNCA2MjYgNzI4LjUgNjExLjM4MnExNC41LTE0LjYxNyAxNC41LTM1LjVRNzQzIDU1NSA3MjguMzgyIDU0MC41cS0xNC42MTctMTQuNS0zNS41LTE0LjVRNjcyIDUyNiA2NTcuNSA1NDAuNjE4cS0xNC41IDE0LjYxNy0xNC41IDM1LjVRNjQzIDU5NyA2NTcuNjE4IDYxMS41cTE0LjYxNyAxNC41IDM1LjUgMTQuNVpNNDgwLjI2NiA5NzZxLTgyLjczNCAwLTE1NS41LTMxLjV0LTEyNy4yNjYtODZxLTU0LjUtNTQuNS04Ni0xMjcuMzQxUTgwIDY1OC4zMTkgODAgNTc1LjVxMC04Mi44MTkgMzEuNS0xNTUuNjU5UTE0MyAzNDcgMTk3LjUgMjkzdDEyNy4zNDEtODUuNVEzOTcuNjgxIDE3NiA0ODAuNSAxNzZxODIuODE5IDAgMTU1LjY1OSAzMS41UTcwOSAyMzkgNzYzIDI5M3Q4NS41IDEyN1E4ODAgNDkzIDg4MCA1NzUuNzM0cTAgODIuNzM0LTMxLjUgMTU1LjVUNzYzIDg1OC4zMTZxLTU0IDU0LjMxNi0xMjcgODZRNTYzIDk3NiA0ODAuMjY2IDk3NlptLjIzNC02MFE2MjIgOTE2IDcyMSA4MTYuNXQ5OS0yNDFRODIwIDQzNCA3MjEuMTg4IDMzNSA2MjIuMzc1IDIzNiA0ODAgMjM2cS0xNDEgMC0yNDAuNSA5OC44MTJRMTQwIDQzMy42MjUgMTQwIDU3NnEwIDE0MSA5OS41IDI0MC41dDI0MSA5OS41Wm0tLjUtMzQwWiIvPjwvc3ZnPg==";
_img_backlog.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJtNjI3IDc2OSA0NS00NS0xNTktMTYwVjM2M2gtNjB2MjI1bDE3NCAxODFaTTQ4MCA5NzZxLTgyIDAtMTU1LTMxLjV0LTEyNy41LTg2UTE0MyA4MDQgMTExLjUgNzMxVDgwIDU3NnEwLTgyIDMxLjUtMTU1dDg2LTEyNy41UTI1MiAyMzkgMzI1IDIwNy41VDQ4MCAxNzZxODIgMCAxNTUgMzEuNXQxMjcuNSA4NlE4MTcgMzQ4IDg0OC41IDQyMVQ4ODAgNTc2cTAgODItMzEuNSAxNTV0LTg2IDEyNy41UTcwOCA5MTMgNjM1IDk0NC41VDQ4MCA5NzZabTAtNDAwWm0wIDM0MHExNDAgMCAyNDAtMTAwdDEwMC0yNDBxMC0xNDAtMTAwLTI0MFQ0ODAgMjM2cS0xNDAgMC0yNDAgMTAwVDE0MCA1NzZxMCAxNDAgMTAwIDI0MHQyNDAgMTAwWiIvPjwvc3ZnPg==";
const _img_status = { completed:_img_completed, inprogress:_img_inprogress, blocked:_img_blocked, ready:_img_ready, pending:_img_pending, backlog:_img_backlog };

const _img_asterisk = document.createElement('img');
const _img_add = document.createElement('img');
_img_asterisk.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNNDI2IDkyMFY2NzBMMjEwIDc5NWwtNTUtOTMgMjE3LTEyNi0yMTYtMTI1IDU0LTkzIDIxNiAxMjVWMjMyaDEwOHYyNTFsMjE2LTEyNSA1NCA5My0yMTYgMTI1IDIxNyAxMjYtNTUgOTMtMjE2LTEyNXYyNTBINDI2WiIvPjwvc3ZnPg==";
_img_add.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNNDUwIDg1NlY2MDZIMjAwdi02MGgyNTBWMjk2aDYwdjI1MGgyNTB2NjBINTEwdjI1MGgtNjBaIi8+PC9zdmc+"

fabric.Feat = fabric.util.createClass(fabric.Rect, {
  type: 'feat',

  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('lockScalingFlip', true);
    this.set('summary', options.summary || '');
    this.set('id', options.id || '');
    this.set('sp', options.sp || NaN);
    this.set('status', options.status || 'pending');
    this.set('borderColor', 'green');
    this.set('borderScaleFactor', 2);
    this.set('borderDashArray', [4, 4]);
  },

  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      summary: this.get('summary'),
      id: this.get('id'),
      sp: Number(this.get('sp')),
      status: this.get('status')
    });
  },

  _set: function(key, value) {
    fabric.Rect.prototype._set.call(this, key, value);
    if (key === 'summary' || key === 'id' || key === 'sp' || key === 'status') {
      this.dirty = true;
      if (this.status === "backlog") {
        this.fill = "#9A9790";
        this.stroke = "#000000";
        this.strokeDashArray = [5, 5];
      } else {
        delete this.strokeDashArray;
        if (this.status === "pending") {
          this.fill = "#EBDA24";
          this.stroke = "#B2A515";
        } else if (this.status === "ready") {
          this.fill = "#085ADD";
          this.stroke = "#06168E";
        } else if (this.status === "blocked") {
          const gradient = new fabric.Gradient({
            type: 'radial',
            gradientUnits: 'pixels', // or 'percentage'
            coords: {
              x1: this.width / 2,
              y1: this.height / 2,
              x2: this.width / 2,
              y2: this.height / 2,
              r1: this.width / 6, // inner circle radius
              r2: this.width / 2, // outer circle radius
            },
            colorStops:[
              { offset: 0, color: '#BF4040' },
              { offset: 0.5, color: '#C16767' },
              { offset: 1, color: '#BF4040'}
            ]
          });
          this.fill = gradient;
          this.stroke = "#C16767";          
        } else if (this.status === "inprogress") {
          const gradient = new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'pixels', // or 'percentage'
            coords: { x1: 0, y1: 0, x2: this.width, y2: this.height },
            colorStops:[
              { offset: 0, color: '#9A9790' },
              { offset: 0.5, color: '#EBDA24' },
              { offset: 1, color: '#01740F'}
            ]
          });
          this.fill = gradient;
          this.stroke = "#01740F";
        } else if (this.status === "completed") {
          this.fill = "#00873E";
          this.stroke = "#01740F";
        } else {
          this.fill = "#9A9790";
          this.stroke = "#000000";
        }
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
    const featId = `${this.id ?? ""}`;
    const text = `${featId}: ${this.estimate ? this.estimate + "SP" : ""}`;
    const startX = -this.width/2 + 3;
    const startY = -this.height/2 + 12;
    ctx.fillText(text, startX, startY);
    const textMeasurement = ctx.measureText(featId);
    ctx.fillRect(startX, startY + 1, textMeasurement.width, 1);
    if (this.sp >= 0) {
      ctx.font = 'bold 12px Courier';
      ctx.fillText(`${this.sp.toString().padStart(3,' ')} SP`, this.width/2 - 48, -this.height/2 + 12);
    }
    ctx.font = '8px Helvetica';
    ctx.fillText(`${this.summary}`, startX, this.height/2 - 4, this.width - size - 2);
    if (_canvasMap.getZoom() * this.height * this.scaleY >= 50) {
      if (_img_status[this.status]) {
        ctx.drawImage(_img_status[this.status], this.width/2-size, this.height/2 - size, size, size);
      } else {
        console.log(`Unknown status "${this.status}" in Feat._render(${this.id})`);
      }  
    }

    const item = this.myitem;
    if (item && item.delta) {
      const delta = item.delta;
      ctx.save();
      ctx.globalAlpha = 0.5;
      if (delta === "new") {
        ctx.drawImage(_img_add, this.width/2-size, -this.height/2 + size - 7, size, size);
      } else if (delta === "updated") {
        ctx.drawImage(_img_asterisk, this.width/2-size, -this.height/2 + size - 7, size, size);
      }
      ctx.restore();
    }

    if (item && item.progress) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.font = '24px Helvetica';
      const text = `${PCT(item.progress)}%`;
      const textMeasurement = ctx.measureText(text);
      ctx.fillText(text, this.width/2 - textMeasurement.width - size, this.height/2 - 1);
      ctx.restore();
    }
  }
});

fabric.Feat.fromObject = function(object, callback) {
  return fabric.Object._fromObject('Feat', object, callback);
}
fabric.Feat.prototype.hoverCursor = "pointer";

function _createFeat(id, sp, summary = null) {
  const feat = new fabric.Feat({
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
    summary: summary ?? "My Feature",
    id: id,
    sp: sp,
    status: "backlog"
  });
  return feat;
}

fabric.Item = fabric.util.createClass(fabric.Rect, {
  type: 'item',

  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('lockScalingFlip', true);
    this.set('summary', options.summary || '');
    this.set('id', options.id || '');
    this.set('sp', options.sp || NaN);
    this.set('status', options.status || 'pending');
    this.set('borderColor', 'green');
    this.set('borderScaleFactor', 2);
    this.set('borderDashArray', [4, 4]);
  },

  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      summary: this.get('summary'),
      id: this.get('id'),
      sp: Number(this.get('sp')),
      status: this.get('status')
    });
  },

  _set: function(key, value) {
    fabric.Rect.prototype._set.call(this, key, value);
    if (key === 'summary' || key === 'id' || key === 'sp' || key === 'status') {
      this.dirty = true;
      if (this.status === "backlog") {
        this.fill = "#9A9790";
        this.stroke = "#000000";
        this.strokeDashArray = [5, 5];
      } else {
        delete this.strokeDashArray;
        if (this.status === "pending") {
          this.fill = "#EBDA24";
          this.stroke = "#B2A515";
        } else if (this.status === "ready") {
          this.fill = "#085ADD";
          this.stroke = "#06168E";
        } else if (this.status === "blocked") {
          const gradient = new fabric.Gradient({
            type: 'radial',
            gradientUnits: 'pixels', // or 'percentage'
            coords: {
              x1: this.width / 2,
              y1: this.height / 2,
              x2: this.width / 2,
              y2: this.height / 2,
              r1: this.width / 6, // inner circle radius
              r2: this.width / 2, // outer circle radius
            },
            colorStops:[
              { offset: 0, color: '#BF4040' },
              { offset: 0.5, color: '#C16767' },
              { offset: 1, color: '#BF4040'}
            ]
          });
          this.fill = gradient;
          this.stroke = "#C16767";          
        } else if (this.status === "inprogress") {
          const gradient = new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'pixels', // or 'percentage'
            coords: { x1: 0, y1: 0, x2: this.width, y2: this.height },
            colorStops:[
              { offset: 0, color: '#9A9790' },
              { offset: 0.5, color: '#EBDA24' },
              { offset: 1, color: '#01740F'}
            ]
          });
          this.fill = gradient;
          this.stroke = "#01740F";
        } else if (this.status === "completed") {
          this.fill = "#0CB620";
          this.stroke = "#01740F";
        } else {
          this.fill = "#9A9790";
          this.stroke = "#000000";
        }
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
    const text = `${this.id ?? ""}`;
    const startX = -this.width/2 + (details ? 3 : 20);
    const startY = details ? 6 : -25;

    if (effHeight >= 40 && this.myitem && this.myitem.assignee) {
      if (_teamIcons[this.myitem.assignee]) {
        ctx.drawImage(_teamIcons[this.myitem.assignee], startX - 4, -this.height + 49, 32, 32);
      } else {
        ctx.font = '14px Helvetica';
        ctx.fillText(lookupTeamMember(this.myitem.assignee, true), startX + 1, -this.height + 72);
      }
    }

    if (details) {
      ctx.font = '20px Helvetica';
      ctx.fillText(text, startX, startY);
      //const textMeasurement = ctx.measureText(text);
      //ctx.fillRect(startX, startY + 1, textMeasurement.width, 1);
    }

    ctx.font = '32px Helvetica';
    if (this.sp >= 0) {
      ctx.fillText(`${this.sp} SP`, startX, startY + 40);
    }

    if (details) {
      if (_img_status[this.status]) {
        ctx.drawImage(_img_status[this.status], this.width/2-size, this.height/2 - size, size, size);
      } else {
        console.log(`Unknown status "${this.status}" in Item._render(${this.id})`);
      }
    }

    if (this.myitem && this.myitem.delta) {
      const delta = this.myitem.delta;
      ctx.save();
      ctx.globalAlpha = 0.7;
      if (delta === "new") {
        ctx.drawImage(_img_add, this.width/2-size, -this.height/2, size, size);
      } else if (delta === "updated") {
        ctx.drawImage(_img_asterisk, this.width/2-size, -this.height/2, size, size);
      }
      ctx.restore();  
    }
  }
});

fabric.Item.fromObject = function(object, callback) {
  return fabric.Object._fromObject('Item', object, callback);
}
fabric.Item.prototype.hoverCursor = "pointer";

function _createItem(id, sp, summary = null) {
  const feat = new fabric.Item({
    left: 50,
    top: 50,
    width: 120,
    height: 100,
    strokeWidth: 2,
    rx: 10,
    ry: 10,
    summary: summary ?? "My Item",
    id: id,
    sp: sp,
    status: "ready"
  });
  return feat;
}
