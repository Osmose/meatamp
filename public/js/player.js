;(function($, key) {
    'use strict';

    // Wrapped C functions for making the playback happen.
    /*
    let meatOpenFile = Module.cwrap('meat_open_file', null, ['string', 'number']);
    let meatGenerateSoundData = Module.cwrap('meat_generate_sound_data', 'number');
    let meatSongInfo = Module.cwrap('meat_song_info', 'string', ['number']);
    let meatStartTrack = Module.cwrap('meat_start_track', null, ['number']);
    */

    let systemImages = {
        'Nintendo NES': 'img/nes.png',
        'Super Nintendo': 'img/snes.png',
        'Game Boy': 'img/gameboy.png',
        'Sega Genesis': 'img/genesis.png',
        'Sega Mega Drive / Genesis': 'img/mega_drive.png',
        'Famicom': 'img/famicom.png'
    };

    // Capture key events even when inputs are focused.
    // This is not great for accessibility, and I am a bad person for
    // doing this. :(
    key.filter = function() {
        return true;
    };

    class Player {
        constructor() {
            this._ctx = new AudioContext();
            this._gainNode = this._ctx.createGain();
            this._gainNode.connect(this._ctx.destination);

            this._currentSource = null;
            this._paused = false;
            this._buffer = null;
            this._startTime = 0;
            this._startOffset = 0;
        }

        get volume() {
            return this._gainNode.gain.value;
        }

        set volume(volume) {
            this._gainNode.gain.value = volume;
        }

        get currentSource() {
            return this._currentSource;
        }

        set currentSource(source) {
            if (this._currentSource) {
                this._currentSource.disconnect();
            }
            this._currentSource = source;
            this._currentSource.connect(this._gainNode);
        }

        get paused() {
            return this._paused;
        }

        set paused(paused) {
            if (paused != this._paused) {
                this._paused = paused;
                if (paused) {
                    this.currentSource.stop();
                    this._startOffset += this._ctx.currentTime - this._startTime;
                } else {
                    this.playAudioBuffer();
                }
            }
        }

        playArrayBuffer(arrayBuffer) {
            this._ctx.decodeAudioData(arrayBuffer, (audioBuffer) => {
                this.playAudioBuffer(audioBuffer);
            });
        }

        playAudioBuffer(buffer) {
            if (buffer) {
                this._buffer = buffer;
                this._startOffset = 0;
            }

            this._startTime = this._ctx.currentTime;
            this.currentSource = this._ctx.createBufferSource();
            this.currentSource.buffer = this._buffer;
            this.currentSource.start(0, this._startOffset % this._buffer.duration);
        }
    }

    $(function() {
        let player = new Player();

        $('#load').change((e) => {
            let file = e.target.files[0];
            let reader = new FileReader();
            reader.onload = (e) => {
                player.playArrayBuffer(e.target.result);
            };
            reader.readAsArrayBuffer(file);
        });

        $('#pause').click((e) => {
            player.paused = !player.paused;
        });
    });
})(window.jQuery, window.keymaster);
