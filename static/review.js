function fadeSprite(sprite, duration, callback=null, fadeIn=true, cycles=0, initDelay=0, cycleDelay=2000) {
  sprite.alpha = fadeIn ? 0 : 1;
  const ticker = PIXI.Ticker.shared;
  const onTick = (deltaTime) => {
    const deltaMS = deltaTime / PIXI.settings.TARGET_FPMS;
    let completed = false;
    if (fadeIn) {
      sprite.alpha += deltaMS / duration;
      if (sprite.alpha >= 1) {
        ticker.remove(onTick);
        completed = true;
      }
    } else {
      sprite.alpha -= deltaMS / duration;
      if (sprite.alpha <= 0) {
        ticker.remove(onTick);
        completed = true;
      }
    }

    if (completed) {
      if (cycles > 0) {
        if (cycleDelay > 0) {
          setTimeout(() => {
            fadeSprite(sprite, duration, callback, !fadeIn, cycles - 1, 0, cycleDelay);
          }, cycleDelay);
        } else {
          fadeSprite(sprite, duration, callback, !fadeIn, cycles - 1, 0, cycleDelay);
        }
      } else if (callback) {
        callback();
      }
    }
  }

  if (initDelay > 0) {
    queueFunction(() => { ticker.add(onTick); }, initDelay);
  } else {
    ticker.add(onTick);
  }
}

function playReview(canvas, data, callback) {
  const bgWidth = window.innerWidth;
  const bgHeight = window.innerHeight;

  let app = _app;
  if (!app) {
    app = new PIXI.Application({ width: 1920, height: 1080,
      resolution: 1, clearBeforeRender: true, autoResize: true, backgroundColor: 0x212529 });
    canvas.appendChild(app.view);  
  }

  let scaleX = bgWidth / app.view.width;
  let scaleY = bgHeight / app.view.height;
  if (scaleX > scaleY) {
    scaleX = scaleY;
  }
  app.stage.scale.x = scaleX;
  app.stage.scale.y = scaleX;

  let image = new Image();
  image.onload = function() {
    const base = new PIXI.BaseTexture(image);
    const texture = new PIXI.Texture(base);
    setupReview(app, data, texture, null, callback)
  };
  // TODO - load sprint charts
  image.src = `/public/assets/spritesheet/pippi_run.png`;
  return app;
}

async function fetchBlob(url) {
  const response = await fetch(url);
  if (response.status === 200) {
    return response.blob();
  }
  return null;
}

function renderTexture(item, callback) {
  let url = `/render/${item.jira}`;
  if (_team && _team.sprint) {
    url += "?" + new URLSearchParams({ sprint: _team.sprint }).toString();
  }
  fetchBlob(url).then((blob) => {
    if (blob && blob.size > 0) {
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      const base = new PIXI.BaseTexture(image);
      const texture = new PIXI.Texture(base);
      callback(texture);
    } else {
      callback(PIXI.Texture.WHITE);
    }
  });
}

function getAnimateSpeed() {
  return ((ANIMATE_SPEED > 0) ? ANIMATE_SPEED : 1);
}

function setupReview(app, data, bgTexture, bgPrevTexture=null, callback) {
  app.stage.interactive = true;
  app.stage.hitArea = app.screen;

  const bgWidth = app.screen.width;
  const bgHeight = app.screen.height;
  app.renderer.resize(bgWidth, bgHeight);

  // Intro animation
  const bgSprite = new PIXI.Sprite(bgPrevTexture ?? bgTexture);
  bgSprite.scale.x = bgWidth / bgSprite.width;
  bgSprite.scale.y = bgHeight / bgSprite.height;
  app.stage.addChild(bgSprite);
  fadeSprite(bgSprite, 2000, function() {
      showMessage(app, `Ready`);
      queueFunction(() => { showMessage(app, `Steady`); }, 2000 / getAnimateSpeed());
      if (bgPrevTexture) {
        bgSprite.texture = bgTexture;
        fadeSprite(bgSprite, 2000 / getAnimateSpeed(), null, true, 1);
      }
    }, false, 0, 3000 / getAnimateSpeed());
  showMessage(app, `${data.squad ?? "My Team"}`);

  // Animate sprint delta
  if (PIXI.Assets.cache.get(`assets/spritesheet/pippi_run.json`)) {
    startReview(app, data, callback);
  } else {
    PIXI.Assets.load(ASSETS).then(() => {
      startReview(app, data, callback);
    });
  }
}

function startReview(app, data, callback) {
  animateSPSprint(app, data, function() {
    showMessage(app, `${SPRINT(data.sprint)}!!`);
    setTimeout(() => { animateDelta(app, data, callback); }, 2000 / getAnimateSpeed());
  }, { count: 2 });
}

function positionSprite(pippi, sprite, factor) {
  sprite.position.set(pippi.x + pippi.width - factor.xOffset, pippi.y - 100);
}

function animateSPSprint(app, data, callback, options={count: 1, drop: false}) {
  let character = "pippi";
  let frames = null;
  let sprite = null;
  if (data) {
    character = data.character ?? "pippi";
    frames = data.frames ?? character + "_run";
    if (data.itemTexture) {
      sprite = new PIXI.Sprite(data.itemTexture);
    }
  }
  if (!frames) {
    frames = character + "_run";
  }
  let animations = null;
  let asset;
  if (frames.endsWith("_run")) {
    asset = PIXI.Assets.cache.get(`assets/spritesheet/${character}_run.json`);
  } else {
    asset = PIXI.Assets.cache.get(`assets/spritesheet/${character}.json`);
  }

  let pippi = null;
  if (asset) {
    animations = asset.data.animations;
    pippi = PIXI.AnimatedSprite.fromFrames(animations[frames]);
  } else {
    const frames = [];
    const texture = PIXI.Texture.from(`assets/pippi.png`);
    frames.push(texture);
    /*
    const D8 = PIXI.groupD8;
    for (let rotate=0; rotate < 16; rotate++) {
      const h = D8.isVertical(rotate) ? texture.frame.width : texture.frame.height;
      const w = D8.isVertical(rotate) ? texture.frame.height : texture.frame.width;
      const { frame } = texture;
      const crop = new PIXI.Rectangle(texture.frame.x, texture.frame.y, w, h);
      const trim = crop;
      let rotatedTexture;
      if (rotate % 2 === 0) {
        rotatedTexture = new PIXI.Texture(texture.baseTexture, frame, crop, trim, rotate);
      } else {
        rotatedTexture = new PIXI.Texture(texture.baseTexture, frame, crop, trim, rotate - 1);
        rotatedTexture.rotate++;
      }
      frames.push(rotatedTexture);
    }
    */
    pippi = new PIXI.AnimatedSprite(frames);
  }

  if (!pippi) {
    callback();
    return;
  }

  const factor = getSpriteFactor(character);

  const bgWidth = app.screen.width;
  const bgHeight = app.screen.height;

  // Setup animation at 6 fps.
  pippi.animationSpeed = 1 / 6;
  pippi.position.set(50, bgHeight - 180);
  pippi.scale.x = factor.scale * factor.dir;
  pippi.scale.y = factor.scale;
  pippi.x -= factor.xOffset;
  pippi.y -= factor.yOffset;

  app.stage.addChild(pippi);

  const drop = options.drop === true;
  if (sprite) {
    positionSprite(pippi, sprite, factor);
    if (drop) {
      sprite.y = -25;
    }
    sprite.scale.x = sprite.scale.y = 0.5;
    app.stage.addChild(sprite);
  }
  let multi = data ? data.multi ?? 1 : 1;
  let count = options.count ?? 1;
  let speed = 8 * getAnimateSpeed() * multi;
  let scaleCount = 0;
  const tickerCB = delta => {
    if (pippi.x > bgWidth + 200) {
      pippi.x = 50 - factor.xOffset;
      if (sprite) {
        positionSprite(pippi, sprite, factor);
      }
      count--;
      if (count <= 0) {
        app.ticker.remove(tickerCB);
        pippi.stop();
        app.stage.removeChild(pippi);
        if (sprite) {
          app.stage.removeChild(sprite);
        }
        callback();
      }
    } else {
      if (character !== "pippi") {
        scaleCount += 0.04;
        pippi.scale.set(factor.scale + Math.sin(scaleCount) * 0.4);
      }
      pippi.x = pippi.x + speed * delta;
      if (sprite) {
        sprite.x = sprite.x + speed * delta;
      }
    }
  }

  const t2bTickerCB = delta => {
    if (sprite.y > bgHeight - sprite.height - 50) {
      app.ticker.remove(t2bTickerCB);
      positionSprite(pippi, sprite, factor);
      speed = 8 * getAnimateSpeed() * multi;
      pippi.play();
      app.ticker.add(tickerCB);
    } else {
      sprite.y = sprite.y + speed * delta;
      speed += 1;
    }
  }

  if (sprite && drop) {
    app.ticker.add(t2bTickerCB);
  } else {
    pippi.play();
    app.ticker.add(tickerCB);
  }
}
