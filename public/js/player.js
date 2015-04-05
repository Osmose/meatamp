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
})(window.jQuery, window.keymaster);
