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
    app = new PIXI.Application({ width: data.canvasWidth ?? 1920, height: data.canvasHeight ?? 1080,
      resolution: 1, clearBeforeRender: true, autoResize: true, backgroundColor: 0x212529 });
    app.context = { data: data };
    canvas.appendChild(app.view);
    _app = app;
  } else {
    app.stage.removeChildren();
  }

  let scale = data.stageScale;
  if (!scale) {
    scale = bgWidth / app.view.width;
    let scaleY = bgHeight / app.view.height;
    if (scale > scaleY) {
      scale = scaleY;
    }
  }
  app.stage.scale.x = scale;
  app.stage.scale.y = scale;

  // Load sprint charts (if any)
  const chart1 = data.chart1;
  if (chart1 && SHOW_CHARTS) {
    let image1 = new Image();
    image1.onload = function() {
      const base1 = new PIXI.BaseTexture(image1);
      const texture1 = new PIXI.Texture(base1);
      const chart2 = data.chart2;
      if (chart2) {
        let image2 = new Image();
        image2.onload = function() {
          const base2 = new PIXI.BaseTexture(image2);
          const texture2 = new PIXI.Texture(base2);
          setupReview(app, data, texture2, texture1, callback);
        };
        image2.src = `/render/${encodeURIComponent(chart2)}?team=${encodeURIComponent(data.name)}&sprint=NONE`;
      } else {
        setupReview(app, data, texture1, null, callback);
      }
    };
    image1.src = `/render/${encodeURIComponent(chart1)}?team=${encodeURIComponent(data.name)}&sprint=NONE`;
  } else {
    setupReview(app, data, null, null, callback);
  }

  return app;
}

async function fetchBlob(url) {
  const response = await fetch(url);
  if (response.status === 200) {
    return response.blob();
  }
  return null;
}

function renderDefaultTexture(item, callback) {
  let texture = null;
  if (item.type === "FEAT") {
    texture = PIXI.Texture.from(`assets/feat.png`);
  } else {
    texture = PIXI.Texture.from(`assets/story.png`);
  }
  callback(texture ?? PIXI.Texture.WHITE);
}

function renderTexture(item, callback) {
  if (!RENDER_ITEM) {
    renderDefaultTexture(item, callback);
    return;
  }

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
      renderDefaultTexture(item, callback);
    }
  });
}

function getSpeed() {
  if (!DEMO_ACTIVE || ANIMATE_SPEED < 0) {
    cancelQueue();
    DEMO_ACTIVE = false;
    ANIMATE_SPEED = _animateSpeedParam;
    writeMessage(`Demo stopped.  Please press refresh to restart.`);
    throw new Error("Abort");
  }
  return ((ANIMATE_SPEED > 0) ? ANIMATE_SPEED : 1);
}

function setupReview(app, data, bgTexture, bgPrevTexture=null, callback) {
  DEMO_ACTIVE = true;
  ANIMATE_SPEED = ANIMATE_SPEED < 0 ? _animateSpeedParam : ANIMATE_SPEED;
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
      queueFunction(() => { showMessage(app, `Steady`); }, 2000 / getSpeed());
      if (bgPrevTexture) {
        bgSprite.texture = bgTexture;
        fadeSprite(bgSprite, 2000 / getSpeed(), null, true, 1);
      }
    }, false, 0, 3000 / getSpeed());
  showMessage(app, `${data.squad ?? "My Team"}`);

  // Animate sprint delta
  if (PIXI.Assets.cache.get(`assets/spritesheet/pippi_run.json`)) {
    startReview(app, data, callback);
  } else {
    if (_team.members && _team.loadIcons) {
      Object.keys(_team.members).forEach((memberID) => {
        let data = lookupSprite(memberID);
        if (data.character && data.character.startsWith("icon_")) {
          ASSETS.push(`assets/${data.character}.png`);
        }
      });
    }
    PIXI.Assets.load(ASSETS).then(() => {
      startReview(app, data, callback);
    });
  }
}

function startReview(app, data, callback) {
  writeMessage("");
  writeStats("Statistics");
  writeSP("");
  animateSPSprint(app, data, function() {
    document.title = TEAM_NAME();
    writePrefix(SPRINT(data.sprint));
    showMessage(app, `${SPRINT(data.sprint)}!!`);
    setTimeout(() => { animateDelta(app, data, callback); }, 2000 / getSpeed());
  }, { count: 2 });
}

function positionSprite(pippi, dim, sprite, factor) {
  sprite.position.set(pippi.x + (pippi.width/2) + (dim.width/2) - factor.xOffset, pippi.y + (dim.height/2) - (sprite.height/2));
}

function createAnimatedSprite(name, asset, frames) {
  console.log(`createAnimatedSprite("${name}", "${frames}")`, asset.data.animations);
  let animations = asset.data.animations;
  return PIXI.AnimatedSprite.fromFrames(animations[frames]);
}

function randomChoice(choices) {
  let index = randomInt(0, choices.length-1);
  //console.log(`randomChoice() =`, index);
  return choices[index];
}

function lookupAttack(first, item, totalSP, defaultAttack) {
  //console.log(`lookupAttack() - ${item.jira}, ${totalSP}`);
  let attack = defaultAttack;
  if (item) {
    if (item.type === "FEAT" && first && (item.estimate > 8 || totalSP > 5)) {
      attack = "juggle";
    } else {
      if (item.unblocked) {
        attack = "keyboard";
      } else if (item.new) {
        attack = randomChoice(["coffee", "pop", "purple"]);
      }
    }
  }
  return attack;
}

function createCharacterAnimation(animations, character, item, data) {
  let pippi;
  let charScale = 1;
  texture = PIXI.Texture.from(`assets/${character}.png`);
  if (!texture) {
    texture = PIXI.Texture.from(`assets/pippi.png`);
  }

  // Lookup custom attack animation or use default
  const attack = lookupAttack(animations.length === 0, item, data.totalSP, data.attack ?? "attack");
  asset = PIXI.Assets.cache.get(`assets/spritesheet/${attack}.json`);
  if (asset) {
    const attackData = ANIMATIONS[attack];
    if (attackData) {
      Object.assign(data, attackData);
    }      

    speedDenominator = 12;
    animationScale = (data.attackScale !== undefined) ? data.attackScale : 1;
    speedDenominator /= (data.attackSpeed !== undefined) ? data.attackSpeed : 1;
    charScale = (data.scale !== undefined) ? data.scale : charScale;
    animation = createAnimatedSprite(attack, asset, `${attack}_sprite`);
    animation.x += (data.attackXOffset !== undefined) ? data.attackXOffset : 10;
    animation.y += (data.attackYOffset !== undefined) ? data.attackYOffset : -35;
    animation.scale.x = animationScale;
    animation.scale.y = animationScale;

    const charSprite = new PIXI.Sprite(texture);
    
    charSprite.x += (data.xOffset !== undefined) ? data.xOffset : -7;
    charSprite.y += (data.yOffset !== undefined) ? data.yOffset : 0;
    charSprite.scale.x = charScale * (data.dir ?? 1);
    charSprite.scale.y = charScale;
    pippi = new PIXI.Container();
    pippi.addChild(charSprite);
    pippi.addChild(animation);
    animations.push(animation);
    configureAnimationSpeed(animation, item, speedDenominator);
  } else {
    applyAffects = true;
    pippi = new PIXI.Sprite(texture);
  }
  return pippi;
}

function configureAnimationSpeed(animation, item, speedDenominator) {
  // Setup animation at 6 fps.
  if (animation) {
    let speed = 1;
    if (item) {
      const est = item.estimate ?? 1;
      if (est >= 8) {
        speed = 4;
      } else if (est >= 5) {
        speed = 3;
      } else if (est >= 3) {
        speed = 2;
      }
    }
    animation.animationSpeed = speed / speedDenominator;
  }
}

function animateSPSprint(app, data, callback, options={count: 1, drop: false}) {
  let character = "pippi";
  let frames = null;
  let itemSprite = null;
  if (data) {
    const spriteData = data.sprite;
    if (spriteData) {
      character = spriteData.character ?? character;
      frames = spriteData.frames ?? character + "_run";
    }
    if (data.itemTexture) {
      itemSprite = new PIXI.Sprite(data.itemTexture);
      scaleItem(itemSprite, data.item);
    }
  }
  if (!frames) {
    frames = character + "_run";
  }
  let asset = null;
  if (frames.endsWith("_run")) {
    asset = PIXI.Assets.cache.get(`assets/spritesheet/${character}_run.json`);
  } else if (!character.startsWith("icon_") && frames !== "icon") {
    asset = PIXI.Assets.cache.get(`assets/spritesheet/${character}.json`);
  }

  let pippi = null;
  let animation = null;
  let applyAffects = false;
  let speedDenominator = 6;
  if (asset) {
    pippi = createAnimatedSprite(character, asset, frames);
    animation = pippi;
    if (data) {
      configureAnimationSpeed(animation, data.item, speedDenominator);
    }
  } else {
    const animations = [];
    pippi = createCharacterAnimation(animations, character, data.item, data);
    character = "custom";
    if (animations.length > 0) {
      animation = animations[0];
    }
  }

  if (!pippi) {
    callback();
    return;
  }

  let charDim = null;
  if (data && data.size) {
    charDim = { width: data.size.width ?? pippi.width, height: data.size.height ?? pippi.height };
  }

  const factor = getSpriteFactor(character, character !== "custom" ? data : null);
  const bgWidth = app.screen.width;
  const bgHeight = app.screen.height;

  //console.log(factor);
  pippi.position.set(50, bgHeight - 180);
  pippi.scale.x = factor.scale * factor.dir;
  pippi.scale.y = factor.scale;
  pippi.x -= factor.xOffset;
  pippi.y -= factor.yOffset;

  const drop = options.drop === true;
  if (itemSprite) {
    positionSprite(pippi, charDim ?? pippi, itemSprite, factor);
    if (drop) {
      itemSprite.y = -25;
    }
    app.stage.addChild(itemSprite);
  }
  app.stage.addChild(pippi);

  let multi = data ? data.multi ?? 1 : 1;
  let count = options.count ?? 1;
  let speed = 8 * getSpeed() * multi;
  let scaleCount = 0;
  const tickerCB = delta => {
    if (pippi.x > bgWidth + 200) {
      pippi.x = 50 - factor.xOffset;
      if (itemSprite) {
        positionSprite(pippi, charDim ?? pippi, itemSprite, factor);
      }
      count--;
      if (count <= 0) {
        app.ticker.remove(tickerCB);
        if (animation) {
          animation.stop();
        }
        app.stage.removeChild(pippi);
        if (itemSprite) {
          app.stage.removeChild(itemSprite);
        }
        callback();
      }
    } else {
      if (applyAffects) {
        scaleCount += 0.04;
        pippi.scale.set(factor.scale + Math.sin(scaleCount) * 0.4);
      }
      pippi.x = pippi.x + speed * delta;
      if (itemSprite) {
        itemSprite.x = itemSprite.x + speed * delta;
      }
    }
  }

  const t2bTickerCB = delta => {
    if (itemSprite.y > bgHeight - itemSprite.height - 50) {
      app.ticker.remove(t2bTickerCB);
      positionSprite(pippi, charDim ?? pippi, itemSprite, factor);
      speed = 8 * getSpeed() * multi;
      if (animation) {
        animation.play();
      }
      app.ticker.add(tickerCB);
    } else {
      itemSprite.y = itemSprite.y + speed * delta;
      speed += 1;
    }
  }

  if (itemSprite && drop) {
    app.ticker.add(t2bTickerCB);
  } else {
    if (animation) {
      animation.play();
    }
    app.ticker.add(tickerCB);
  }
}

function animateGroupSPSprint(app, data, callback, options={count: 1, drop: false}) {
  const bgWidth = app.screen.width;
  const bgHeight = app.screen.height;

  let itemSprite = null;
  if (data.itemTexture) {
    itemSprite = new PIXI.Sprite(data.itemTexture);
    scaleItem(itemSprite, data.item);
  }

  let group = new PIXI.Container();
  const animations = [];
  let x = 0;
  const assignees = Object.values(data.assignees).sort(function (a, b) {
    return (b.totalSP - a.totalSP);
  });
  assignees.forEach((charData) => {
    let character = CHAR_NAME;
    let frames = null;
    const spriteData = charData.sprite;
    if (spriteData) {
      character = spriteData.character ?? CHAR_NAME;
      frames = spriteData.frames;
    }
    if (!frames) {
      frames = character + "_sprite"
    }

    let asset = null;
    if (!character.startsWith("icon_") && frames !== "icon") {
      asset = PIXI.Assets.cache.get(`assets/spritesheet/${character}.json`);
    }

    let pippi;
    if (asset) {
      pippi = createAnimatedSprite(character, asset, frames);
      animations.push(pippi);
      configureAnimationSpeed(animation, data.item, speedDenominator);
    } else {
      pippi = createCharacterAnimation(animations, character, data.item, charData);
    }
    group.addChild(pippi);
    pippi.x = x;
    pippi.y = randomInt(5, 125);
    x -= randomInt(120, 140);
  });

  const factor = {
    scale: 1,
    xOffset: 0,
    yOffset: 0,
    dir: 1
  };
  group.position.set(-group.width, bgHeight/2 - group.height);
  group.scale.x = 3;
  group.scale.y = 3;
  group.x += 0;
  group.y += 0;

  const drop = options.drop === true;
  if (itemSprite) {
    positionSprite(group, group, itemSprite, factor);
    if (drop) {
      itemSprite.y = -25;
    }
    app.stage.addChild(itemSprite);
  }
  app.stage.addChild(group);

  let speed = 8 * getSpeed();
  let count = 1;

  const tickerCB = delta => {
    if (group.x > bgWidth + group.width) {
      count--;
      if (count <= 0) {
        app.ticker.remove(tickerCB);
        animations.map(function(animation) { animation.stop(); });
        app.stage.removeChild(group);
        if (itemSprite) {
          app.stage.removeChild(itemSprite);
        }
        callback();
      }
      group.x = -group.width;
      if (itemSprite) {
        positionSprite(group, group, itemSprite, factor);
      }
    } else {
      group.x = group.x + speed * delta;
      if (itemSprite) {
        itemSprite.x = itemSprite.x + speed * delta;
      }
    }
  }

  const t2bTickerCB = delta => {
    if (itemSprite.y > bgHeight - itemSprite.height - 50) {
      app.ticker.remove(t2bTickerCB);
      positionSprite(group, group, itemSprite, factor);
      speed = 8 * getSpeed();
      animations.map(function(animation) { animation.play(); });
      app.ticker.add(tickerCB);
    } else {
      itemSprite.y = itemSprite.y + speed * delta;
      speed += 1;
    }
  }

  if (itemSprite && drop) {
    app.ticker.add(t2bTickerCB);
  } else {
    animations.map(function(animation) { animation.play(); });
    app.ticker.add(tickerCB);
  }
}
