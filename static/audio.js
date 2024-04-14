class AudioPlayer {
  constructor() {
    this.playing = false;
    this.sounds = {};
    this.setDefaultVolume(0.4);
    const sounds = ["cheer", "clean", "fanfare", "gain", "glad", "happy", "intro", "rock", "tada"];
    sounds.forEach((sound) => {
      this.sounds[sound] = this.loadSoundFile(sound, `assets/audio/${sound}.mp3`);
    });
    this.setVolume(0.4);
  }

  loadSoundFile(name, path) {
    //console.log(`AudioPlayer.loadSoundFile("${name}")`);
    let sound = document.createElement("audio");
    sound.preload = "auto";
    var src = document.createElement("source");
    src.src = path;
    sound.appendChild(src);
    sound.load();
    sound.volume = this.volume;
    return sound;
  }

  playSound(name, play=true, duration=0) {
    console.log(`AudioPlayer.playSound(${name}, ${play}) - duration=${duration}`);
    if (play) {
      const sound = this.sounds[name];
      if (!sound) {
        console.log(`AudioPlayer.playSound(${name}) - not found!`);
        return;
      }

      sound.currentTime = 0.01;
      sound.loop = this.loop;
      sound.volume = this.volume;

      this.playing = true;
      sound.play();

      if (duration) {
        setTimeout(function(){ stopSound(name); }, duration);
      }
    } else {
      this.stopSound(name);
    }
  }

  stopSound(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
      this.playing = false;  
    }
  }

  setVolume(name, volume) {
    const sound = this.sounds[name];
    if (sound) {
      sound.volume  = volume;
    }
  }

  setDefaultVolume(volume) {
    this.volume = volume;
  }

  setLoop(loop) {
    this.loop = loop;
  }

  playTada(play=true, duration=0) {
    this.playSound("tada", play, duration);
  }
}
