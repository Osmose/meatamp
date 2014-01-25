;(function($, key) {
    'use strict';
    // Wrapped C functions for making the playback happen.
    var meatOpenFile = Module.cwrap('meat_open_file', null, ['string', 'number']);
    var meatGenerateSoundData = Module.cwrap('meat_generate_sound_data', 'number');
    var meatSongInfo = Module.cwrap('meat_song_info', 'string', ['number']);
    var meatStartTrack = Module.cwrap('meat_start_track', null, ['number']);

    var meatamp = {
        config: {
            systemImages: {
                'Nintendo NES': 'img/nes.png',
                'Super Nintendo': 'img/snes.png',
                'Game Boy': 'img/gameboy.png',
                'Sega Genesis': 'img/genesis.png',
                'Sega Mega Drive / Genesis': 'img/mega_drive.png',
                'Famicom': 'img/famicom.png'
            }
        },

        song: 0,
        currentFile: null,
        trackCount: 1,
        playing: false,
        dom: {}, // Stores jQuery objects for dom manipulation.

        init: function() {
            meatamp.song = 0;

            // Grab all the dom stuff we'll need.
            meatamp.dom.metadata = $('.metadata');
            meatamp.dom.chooseFileMsg = $('#choose-file-msg');
            meatamp.dom.system = $('.system');
            meatamp.dom.trackName = $('.track-name');
            meatamp.dom.track = $('.track');
            meatamp.dom.systemName = $('.system-name');
            meatamp.dom.author = $('.author');
            meatamp.dom.copyright = $('.copyright');
            meatamp.dom.dumper = $('.dumper');
            meatamp.dom.comment = $('.comment');
            meatamp.dom.prev = $('#prev');
            meatamp.dom.play = $('#play');
            meatamp.dom.pause = $('#pause');
            meatamp.dom.next = $('#next');
            meatamp.dom.chooseFile = $('#choose-file input');
            meatamp.dom.info = $('#info');
            meatamp.dom.infoButton = $('#info-button');
            meatamp.dom.install = $('#install-button');
            meatamp.dom.alert = $('#alert');

            // Hide stuff until needed.
            meatamp.dom.pause.hide();
            meatamp.dom.metadata.hide();
            meatamp.dom.info.hide();
            meatamp.dom.alert.hide();
        },

        alert: function(msg) {
            if (meatamp.dom.alert.is(':visible')) {
                meatamp.dom.alert.slideUp();
            }

            meatamp.dom.alert.promise().done(function() {
                meatamp.dom.alert.find('p').text(msg);
                meatamp.dom.alert.slideDown();
            });
        },

        bindControls: function() {
            meatamp.dom.prev.click(meatamp.controls.prev);
            meatamp.dom.next.click(meatamp.controls.next);
            meatamp.dom.pause.click(meatamp.controls.pause);
            meatamp.dom.play.click(meatamp.controls.play);
            meatamp.dom.chooseFile.change(meatamp.controls.chooseFile);
            meatamp.dom.infoButton.click(meatamp.controls.toggleInfo);
            meatamp.dom.install.click(meatamp.controls.install);
            meatamp.dom.alert.find('.dismiss').click(meatamp.controls.dismissAlert);

            // Bind keyboard shortcuts as well!
            key('p', function() {
                if (meatamp.playing) {
                    meatamp.controls.pause();
                } else {
                    meatamp.controls.play();
                }
            });
            key('right', meatamp.controls.next);
            key('left', meatamp.controls.prev);
            key('esc', meatamp.controls.dismissAlert);
            key('h', meatamp.controls.toggleInfo);

            // Capture key events even when inputs are focused.
            // This is not great for accessibility, and I am a bad person for
            // doing this. :(
            key.filter = function() {
                return true;
            };
        },

        updateInfo: function() {
            var info = JSON.parse(meatSongInfo(meatamp.song));
            meatamp.trackCount = info.trackCount;

            var songTitle = info.game;
            if (info.song) {
                songTitle += ' - ' + info.song;
            } else if (!songTitle) {
                songTitle = meatamp.currentFile;
            }
            meatamp.dom.trackName.text(songTitle);

            // When in doubt, atari!
            var systemImage = meatamp.config.systemImages[info.system] || 'img/atari.png';
            meatamp.dom.system.find('img').attr('src', systemImage);
            meatamp.dom.track.text((meatamp.song + 1) + ' / ' + info.trackCount);
            meatamp.dom.systemName.text(info.system);
            meatamp.dom.author.text(info.author);
            meatamp.dom.copyright.text(info.copyright);
            meatamp.dom.dumper.text(info.dumper);
            meatamp.dom.comment.text(info.comment);

            meatamp.dom.chooseFileMsg.hide();
            meatamp.dom.metadata.show();
        },

        synthCallback: function(left, right, bufferSize) {
            if (!meatamp.playing) {
                for (var k = 0; k < bufferSize; k++) {
                    left[k] = 0;
                    right[k] = 0;
                }
            } else {
                var ptr = meatGenerateSoundData();
                for (var i = 0; i < bufferSize; i++) {
                    left[i] = Module.getValue(ptr + (i * 4), 'i16');
                    right[i] = Module.getValue(ptr + (i * 4) + 2, 'i16');
                }
            }
        },

        controls: {
            prev: function() {
                if (meatamp.song > 0) {
                    meatamp.song--;
                }
                meatStartTrack(meatamp.song);
                meatamp.controls.play();
                meatamp.updateInfo();
            },

            next: function() {
                if (meatamp.song < meatamp.trackCount - 1) {
                    meatamp.song++;
                }
                meatStartTrack(meatamp.song);
                meatamp.controls.play();
                meatamp.updateInfo();
            },

            pause: function() {
                if (meatamp.playing) {
                    audioPlayer.paused = true;
                    meatamp.playing = false;
                    meatamp.dom.pause.hide();
                    meatamp.dom.play.show();
                }
            },

            play: function() {
                if (!meatamp.playing && meatamp.currentFile !== null) {
                    audioPlayer.paused = false;
                    meatamp.playing = true;
                    meatamp.dom.play.hide();
                    meatamp.dom.pause.show();
                }
            },

            chooseFile: function(e) {
                var input = this;
                if (input.files.length < 1) {
                    return;
                }

                // Load file.
                var file = input.files[0];
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    FS.writeFile(file.name, new Int8Array(reader.result), {flags: 'w', encoding: 'binary'});
                    meatamp.song = 0;
                    meatamp.currentFile = file.name;
                    meatOpenFile(file.name, meatamp.song);
                    meatamp.controls.play();
                    meatamp.updateInfo();
                };
                reader.readAsArrayBuffer(file);
            },

            toggleInfo: function(e) {
                e.preventDefault();
                meatamp.dom.info.slideToggle();
            },

            install: function(e) {
                e.preventDefault();
                var request = window.navigator.mozApps.install('http://meatamp.mkelly.me/manifest.webapp');
                request.onsuccess = function() {
                    meatamp.alert('Thanks for installing Meatamp!');
                };
                request.onerror = function() {
                    meatamp.alert('Error installing Meatamp: ' + this.error.name);
                };
            },

            dismissAlert: function(e) {
                e.preventDefault();
                meatamp.dom.alert.slideUp();
            }
        }
    };

    var audioPlayer = {
        MAX_VOLUME: 0.0001,

        paused: true,

        init: function(synthCallback, bufferSize) {
            audioPlayer.context = audioPlayer.createContext();
            if (audioPlayer.context === null) {
                console.log('Web Audio API support not found, audio will not play.');
                return false;
            }

            audioPlayer.scriptProcessor = audioPlayer.createScriptProcessor(bufferSize);
            audioPlayer.scriptProcessor.onaudioprocess = function(e) {
                var left = e.outputBuffer.getChannelData(0);
                var right = e.outputBuffer.getChannelData(1);
                synthCallback(left, right, bufferSize);
            };

            audioPlayer.gain = audioPlayer.createGain();
            audioPlayer.setVolume(0.5);

            audioPlayer.scriptProcessor.connect(audioPlayer.gain);
            audioPlayer.gain.connect(audioPlayer.context.destination);
        },

        setVolume: function(volume) {
            audioPlayer.gain.gain.value = volume * audioPlayer.MAX_VOLUME;
        },

        createContext: function() {
            if (window.AudioContext) {
                return new AudioContext();
            } else if (window.webkitAudioContext) {
                return new webkitAudioContext();
            } else {
                return null;
            }
        },

        createScriptProcessor: function(bufferSize) {
            var func = (audioPlayer.context.createScriptProcessor ||
                        audioPlayer.context.createJavaScriptNode ||
                        noop);
            return func.call(audioPlayer.context, bufferSize, 1, 2);
        },

        createGain: function() {
            var func = (audioPlayer.context.createGain ||
                        audioPlayer.context.createGainNode ||
                        noop);
            return func.call(audioPlayer.context);
        }
    };

    function noop() {
        return null;
    }

    $(function() {
        meatamp.init();
        audioPlayer.init(meatamp.synthCallback, 8192);
        meatamp.bindControls();
    });
})(window.jQuery, window.keymaster);
