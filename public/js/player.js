;(function() {
    'use strict';
    var song = 0;
    var songElem = document.getElementById('song');
    var fileList = document.getElementById('files');

    var meatInit = Module.cwrap('meatInit', null, ['number', 'number']);
    var meatExit = Module.cwrap('meatExit', null);
    var meatPlay = Module.cwrap('meatPlay', null, ['string', 'number']);
    var meatChangeTrack = Module.cwrap('meatChangeTrack', null, ['number']);

    var files = [];

    meatInit(48000, 8192);

    document.getElementById('stop').addEventListener('click', function() {
        meatExit();
    });

    document.getElementById('next').addEventListener('click', function() {
        song++;
        meatChangeTrack(song);
        songElem.innerHTML = song;
    });

    document.getElementById('prev').addEventListener('click', function() {
        if (song > 0) {
            song--;
        }
        meatChangeTrack(song);
        songElem.innerHTML = song;
    });

    document.getElementById('add').addEventListener('click', function() {
        var input = document.getElementById('upload');
        if (input.files.length < 1) {
            return;
        }

        // Load file.
        var file = input.files[0];
        var reader = new FileReader();
        reader.onloadend = function(e) {
            FS.writeFile(file.name, new Int8Array(reader.result), {flags: 'w', encoding: 'binary'});
            var li = document.createElement('li');
            li.innerHTML = '<a href="#' + file.name + '">' + file.name + '</a>';
            fileList.appendChild(li);
            li.querySelector('a').addEventListener('click', function() {
                song = 0;
                meatPlay(this.getAttribute('href').substring(1), song);
            });
        };
        reader.readAsArrayBuffer(file);
    });
})();
