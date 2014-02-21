;(function($, key) {
    'use strict';
    // Wrapped C functions for making the playback happen.
    var meatOpenFile = Module.cwrap('meat_open_file', null, ['string', 'number']);
    var meatGenerateSoundData = Module.cwrap('meat_generate_sound_data', 'number');
    var meatSongInfo = Module.cwrap('meat_song_info', 'string', ['number']);
    var meatStartTrack = Module.cwrap('meat_start_track', null, ['number']);


    var BUFFER_SIZE = 8192;
    var GAME_AUDIO_MAX_VOLUME = 0.0001;
    var GAME_AUDIO_FORMATS = ['ay', 'gbs', 'gym', 'hes', 'kss', 'nsf', 'nsfe',
                              'sap', 'spc', 'vgm', 'vyz'];


    function GameMediaFile(context, file) {
        var self = this;
        this.context = context;
        this.silent = false;
        this.track = 0;
        this.name = file.name;

        this.load = $.Deferred();
        var reader = new FileReader();
        reader.onloadend = function(e) {
            FS.writeFile(self.name, new Int8Array(reader.result), {flags: 'w', encoding: 'binary'});
            self.createAudioNodes();
            self.load.resolve(self);
        };
        reader.readAsArrayBuffer(file);
    }

    GameMediaFile.prototype = {
        createAudioNodes: function() {
            var self = this;

            this.scriptProcessor = this.createScriptProcessor();
            this.scriptProcessor.onaudioprocess = function(e) {
                var left = e.outputBuffer.getChannelData(0);
                var right = e.outputBuffer.getChannelData(1);

                if (self.silent) {
                    for (var k = 0; k < BUFFER_SIZE; k++) {
                        left[k] = 0;
                        right[k] = 0;
                    }
                } else {
                    var ptr = meatGenerateSoundData();
                    for (var i = 0; i < BUFFER_SIZE; i++) {
                        left[i] = Module.getValue(ptr + (i * 4), 'i16');
                        right[i] = Module.getValue(ptr + (i * 4) + 2, 'i16');
                    }
                }
            };

            this.gain = this.createGain();
            this.setVolume(0.5);

            this.scriptProcessor.connect(this.gain);
        },

        createScriptProcessor: function() {
            var func = (this.context.createScriptProcessor ||
                        this.context.createJavaScriptNode ||
                        noop);
            return func.call(this.context, BUFFER_SIZE, 1, 2);
        },

        createGain: function() {
            var func = (this.context.createGain ||
                        this.context.createGainNode ||
                        noop);
            return func.call(this.context);
        },

        setVolume: function(volume) {
            this.gain.gain.value = volume * GAME_AUDIO_MAX_VOLUME;
        },

        getInfo: function() {
            return JSON.parse(meatSongInfo(this.track));
        },

        play: function() {
            meatOpenFile(this.name, this.track);
            this.gain.connect(this.context.destination);
        },

        pause: function() {
            this.silent = !this.silent;
        },

        stop: function() {
            this.gain.disconnect();
        },

        setTrack: function(track) {
            this.track = track;
            meatStartTrack(track);
        }
    };


    var meatamp = {
        CHOOSE_FILE_INDEX: 0,
        INFO_INDEX: 1,
        METADATA_INDEX: 2,

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

        mediaFile: null,
        dom: {}, // Stores jQuery objects for dom manipulation.

        init: function() {
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
            meatamp.dom.metadataButton = $('#metadata-button');
            meatamp.dom.infoButton = $('#info-button');
            meatamp.dom.install = $('#install-button');
            meatamp.dom.alert = $('#alert');
            meatamp.dom.mainDeck = $('#main-deck')[0];

            // Hide stuff until needed.
            meatamp.dom.pause.hide();
            meatamp.dom.alert.hide();

            if (window.AudioContext) {
                meatamp.context = new AudioContext();
            } else if (window.webkitAudioContext) {
                meatamp.context = new webkitAudioContext();
            } else {
                meatamp.alert('Web Audio Support not found!');
            }
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
            meatamp.dom.metadataButton.click(meatamp.controls.showMetadata);
            meatamp.dom.infoButton.click(meatamp.controls.showInfo);
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
            key('h', meatamp.controls.showInfo);

            // Capture key events even when inputs are focused.
            // This is not great for accessibility, and I am a bad person for
            // doing this. :(
            key.filter = function() {
                return true;
            };
        },

        updateInfo: function() {
            var info = meatamp.mediaFile.getInfo();
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
        },

        controls: {
            prev: function() {
                meatamp.mediaFile.setTrack(meatamp.mediaFile.track - 1);
                meatamp.updateInfo();
            },

            next: function() {
                meatamp.mediaFile.setTrack(meatamp.mediaFile.track + 1);
                meatamp.updateInfo();
            },

            pause: function() {
                meatamp.mediaFile.pause();
            },

            play: function() {
                meatamp.mediaFile.load.then(function(mediaFile) {
                    mediaFile.play();
                });
                meatamp.dom.play.hide();
                meatamp.dom.pause.show();
            },

            chooseFile: function(e) {
                var input = this;
                if (input.files.length < 1) {
                    return;
                }

                // Load file.
                var file = input.files[0];
                meatamp.mediaFile = new GameMediaFile(meatamp.context, file);
            },

            showInfo: function(e) {
                e.preventDefault();
                meatamp.dom.mainDeck.shuffleTo(meatamp.INFO_INDEX);
            },

            showMetadata: function(e) {
                e.preventDefault();
                meatamp.dom.mainDeck.shuffleTo(meatamp.METADATA_INDEX);
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

    function noop() {
        return null;
    }

    $(document).on('DOMComponentsLoaded', function() {
        meatamp.init();
        meatamp.bindControls();
    });
})(window.jQuery, window.keymaster);
