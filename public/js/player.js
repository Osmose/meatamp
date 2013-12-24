;(function($) {
    'use strict';
    // Wrapped C functions for making the playback happen.
    var meatInit = Module.cwrap('meatInit', null, ['number', 'number']);
    var meatExit = Module.cwrap('meatExit', null);
    var meatPlay = Module.cwrap('meatPlay', null, ['string', 'number']);
    var meatChangeTrack = Module.cwrap('meatChangeTrack', null, ['number']);
    var meatInfo = Module.cwrap('meatInfo', 'string', ['number']);
    var meatPause = Module.cwrap('meatPause', null);
    var meatUnpause = Module.cwrap('meatUnpause', null);

    var meatamp = {
        config: {
            frequency: 48000,
            samples: 8192,
            systemImages: {
                'Nintendo NES': 'img/nes.png',
                'Super Nintendo': 'img/snes.png',
                'Game Boy': 'img/gameboy.png',
                'Sega Genesis': 'img/genesis.png',
                'Sega Mega Drive / Genesis': 'img/mega_drive.png'
            }
        },

        song: 0,
        currentFile: null,
        trackCount: 1,
        playing: false,
        dom: {}, // Stores jQuery objects for dom manipulation.

        init: function() {
            meatamp.song = 0;
            meatInit(meatamp.config.frequency, meatamp.config.samples);

            // Grab all the dom stuff we'll need.
            meatamp.dom.metadata = $('.metadata');
            meatamp.dom.chooseFileMsg = $('.choose-file-msg');
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
            meatamp.dom.info = $('.info');
            meatamp.dom.infoButton = $('#info-button');

            // Hide stuff until playback begins.
            meatamp.dom.pause.hide();
            meatamp.dom.metadata.hide();
            meatamp.dom.info.hide();
        },

        bindControls: function() {
            meatamp.dom.prev.click(meatamp.controls.prev);
            meatamp.dom.next.click(meatamp.controls.next);
            meatamp.dom.pause.click(meatamp.controls.pause);
            meatamp.dom.play.click(meatamp.controls.play);
            meatamp.dom.chooseFile.change(meatamp.controls.chooseFile);
            meatamp.dom.infoButton.click(meatamp.controls.toggleInfo);
        },

        updateInfo: function() {
            var info = JSON.parse(meatInfo(meatamp.song));
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

        controls: {
            prev: function() {
                if (meatamp.song > 0) {
                    meatamp.song--;
                }
                meatChangeTrack(meatamp.song);
                meatamp.controls.play();
                meatamp.updateInfo();
            },

            next: function() {
                if (meatamp.song < meatamp.trackCount - 1) {
                    meatamp.song++;
                }
                meatChangeTrack(meatamp.song);
                meatamp.controls.play();
                meatamp.updateInfo();
            },

            pause: function() {
                if (meatamp.playing) {
                    meatPause();
                    meatamp.playing = false;
                    meatamp.dom.pause.hide();
                    meatamp.dom.play.show();
                }
            },

            play: function() {
                if (!meatamp.playing && meatamp.currentFile !== null) {
                    meatUnpause();
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
                    meatPlay(file.name, meatamp.song);
                    meatamp.controls.play();
                    meatamp.updateInfo();
                };
                reader.readAsArrayBuffer(file);
            },

            toggleInfo: function() {
                meatamp.dom.info.slideToggle();
            }
        }
    };

    $(function() {
        meatamp.init();
        meatamp.bindControls();
    });
})(window.jQuery);
