const ASSETS = [
  "assets/story.png",
  "assets/feat.png",
  "assets/pippi.png",
  "assets/spritesheet/pippi_run.json",
  "assets/spritesheet/attack.json",
  "assets/spritesheet/peppi.json",
  /*"assets/spritesheet/water.json",
  "assets/spritesheet/coffee.json",
  "assets/spritesheet/pop.json",
  "assets/spritesheet/purple.json",
  "assets/spritesheet/guitar.json",
  "assets/spritesheet/keyboard.json",
  "assets/spritesheet/broom.json",
  "assets/spritesheet/juggle.json"*/
];

const ANIMATIONS = {
  attack: {
    "attackScale": 1,
    "attackSpeed": 1,
    "attackXOffset": 0,
    "attackYOffset": 0
  },
  water: {
    "attack": "water",
    "attackScale": 1,
    "attackXOffset": 80,
    "attackYOffset": 0,
    "attackSpeed": 0.9,
    "size": {
      "width": 64,
      "height": 64
    }
  },
  coffee: {
    "attack": "coffee",
    "attackScale": 1,
    "attackXOffset": 80,
    "attackYOffset": 30,
    "attackSpeed": 0.9,
    "size": {
      "width": 64,
      "height": 64
    }
  },
  pop: {
    "attack": "pop",
    "attackScale": 1,
    "attackXOffset": 80,
    "attackYOffset": 30,
    "attackSpeed": 0.9,
    "size": {
      "width": 64,
      "height": 64
    }
  },
  purple: {
    "attack": "purple",
    "attackScale": 1,
    "attackXOffset": 80,
    "attackYOffset": 30,
    "attackSpeed": 0.9,
    "size": {
      "width": 64,
      "height": 64
    }
  },
  guitar: {
    "attack": "guitar",
    "attackScale": 0.5,
    "attackSpeed": 0.8,
    "attackXOffset": 20,
    "attackYOffset": 10,
    "size": {
      "width": 64,
      "height": 192
    }
  },
  keyboard: {
    "attack": "keyboard",
    "attackScale": 0.5,
    "attackXOffset": 0,
    "attackYOffset": 0,
    "size": {
      "width": 64,
      "height": 192
    }
  },
  broom: {
    "attackScale": 1,
    "attackSpeed": 1,
    "attackXOffset": 0,
    "attackYOffset": 0
  },
  juggle: {
    "attack": "juggle",
    "attackScale": 0.8,
    "attackXOffset": 35,
    "attackYOffset": 0,
    "attackSpeed": 1,
    "size": {
      "width": 64,
      "height": 64
    }
  }
};

const INTRO_FADE_DURATION = 800;

var _pixiJSLoaded = false;
var _app = null;
var _canvas = null;

var _pippiScale = 2.2;
var _pippiXOffset = 200;
var _pippiYOffset = 578;

const _audio = new AudioPlayer();

function getSpriteFactor(character, data) {
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
        xOffset = 150;
      } else if (character === "shay" || character === "defe") {
        xOffset = -50;
      } else if (character === "toni") {
        xOffset = -40;
      }
    }
  }

  return {
    scale: (data && data.scale !== undefined) ? data.scale : scale,
    xOffset: (data && data.xOffset !== undefined) ? data.xOffset : xOffset,
    yOffset: (data && data.yOffset !== undefined) ? data.yOffset : yOffset,
    dir: (data && data.dir !== undefined) ? data.dir : dir
  };
}

function scaleItem(sprite, item) {
  if (sprite.width <= 256) {
    let factor = 1.2;
    let scale = factor * Math.sqrt(item.estimate ?? 3);
    if (scale > 5) {
      scale = 5;
    } else if (scale < 1) {
      scale = 1;
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
    console.log(`Stopping animation and destroying app...`);
    const cancelled = cancelQueue();
    if (cancelled) {
      console.log(`Cancelled queue, event=`, event);
    }
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
