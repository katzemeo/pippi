const ASSETS = [
  "assets/story.png",
  "assets/feat.png",
  "assets/pippi.png",  
  "assets/spritesheet/pippi_run.json",
  /*"assets/spritesheet/toni.json",
  "assets/spritesheet/shay.json",
  "assets/spritesheet/seru.json",
  "assets/spritesheet/radi.json",
  "assets/spritesheet/defe.json",
  "assets/spritesheet/cricut.json",*/
  "assets/spritesheet/attack.json"
];

var _pixiJSLoaded = false;
var _app = null;
var _canvas = null;

var _pippiScale = 2.2;
var _pippiXOffset = 200;
var _pippiYOffset = 578;

function getSpriteFactor(character) {
  let scale = 1;
  let xOffset = -20;
  let yOffset = 0;
  let dir = 1;
  if (character !== "character") {
    if (character === "pippi") {
      scale = 2.2;
      xOffset = 200;
      yOffset = 578;  
    } else {
      scale = 3.5;
      yOffset = 500;
      if (character === "seru" || character === "radi") {
        dir = -1;
        if (character === "seru") {
          xOffset = 150;
        }
      } else if (character === "shay" || character === "defe") {
        xOffset = -50;
      } else if (character === "toni") {
        xOffset = -40;
      } else if (character === "attack") {
        xOffset = -40;
      }
    }
  }

  return {
    scale: scale,
    xOffset: xOffset,
    yOffset: yOffset,
    dir: dir
  };
}

function scaleItem(sprite, item) {
  if (sprite.width < 100) {
    let factor = 1.5;
    let scale = factor * Math.sqrt(item.estimate ?? 3);
    if (scale > 5) {
      scale = 5;
    } else if (scale < 0.5) {
      scale = 0.5;
    }
    sprite.scale.x = sprite.scale.y = scale;
  } else {
    sprite.scale.x = sprite.scale.y = 0.5;
  }
}

function setSpeed(speed) {
  ANIMATE_SPEED = speed;
}

function loadAndPlayReview(canvas, data, callback) {
  _canvas = canvas;
  if (!_pixiJSLoaded) {
    _pixiJSLoaded = true;
    loadJSSync("/public/pixi.min.js");
    loadJSSync("/public/review.js");
    loadJSSync("/public/delta.js", function() {
      _app = playReview(_canvas, data, callback);
    });
  } else {
    _app = playReview(_canvas, data, callback);
  }
}

function stopAndDestroy(app) {
  app.stop();
  app.destroy();
}

function unloadJS(app) {
  if (app) {
    stopAndDestroy(app);
  }

  PIXI.Assets.unload(ASSETS);
}

function stopAnimation() {
  if (_app) {
    stopAndDestroy(_app);
    _app = null;
  }
}

var _queueTimeoutHandler = null;
function queueFunction(fn, timeout) {
  cancelQueue();
  _queueTimeoutHandler = setTimeout(() => { _queueTimeoutHandler = null; fn(); }, timeout);
}

function cancelQueue() {
  if (_queueTimeoutHandler) {
    clearTimeout(_queueTimeoutHandler);
    _queueTimeoutHandler = null;
    return true;
  }
  return false;
}

var _message = null;
function showMessage(app, message, callback, options={}, transition=false) {
  let fontSize = 48;
  if (!options.fontSize) {
    fontSize = 64 - Math.round(message.length / 3.2);
    if (fontSize > 48) {
      fontSize = 48;
    } else if (fontSize < 18) {
      fontSize = 18;
    }
  }

  const style = new PIXI.TextStyle(Object.assign(
    {
      fontFamily: 'Arial',
      fontSize: fontSize,
      fontStyle: 'italic',
      fontWeight: 'bold',
      fill: ['#ffffff', '#50C878'],
      stroke: '#001a33',
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
      wordWrap: true,
      wordWrapWidth: 440,
      lineJoin: 'round'
    }, options));

  if (!app.stage) {
    return;
  }

  const richText = new PIXI.Text(message, style);
  richText.x = 250;
  richText.y = 100;
  richText.scale.x = 3;
  richText.scale.y = 3;

  if (callback) {
    richText.interactive = true;
    richText.cursor = 'pointer';  
    richText.on('pointerdown', callback);  
  }

  if (_message) {
    app.stage.removeChild(_message);
  }
  _message = richText;
  app.stage.addChild(_message);
}
