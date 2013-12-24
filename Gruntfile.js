var path = require('path');
var spawn = require('child_process').spawn;
var util = require('util');

module.exports = function(grunt) {
    var connect = require('connect');
    var path = require('path');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'gh-pages': {
            options: {
                base: 'public'
            },
            src: ['**']
        }
    });

    grunt.registerTask('compile', 'Compile the C libraries with emscripten.', function(outfile) {
        var cb = this.async();

        var emcc = process.env.EMCC_BIN || grunt.option('emcc') || 'emcc';
        var gme_dir = path.join('src', 'game_music_emu', 'gme');
        var gme_files = grunt.file.expand(gme_dir + '/*.cpp');

        var import_flags = [];
        var source_files = ['src/meatamp.c'].concat(gme_files);
        outfile = outfile || 'public/js/meatamp.js';
        var flags = [
            '-s', 'ASM_JS=1',
            '-s', 'EXPORTED_FUNCTIONS=@src/exported_functions.json',
            '-O1',
            '-I' + gme_dir,
            '-o',  outfile,

            // GCC/Clang arguments to shut up about warnings in code I didn't
            // write. :D
            '-Wno-deprecated',
            '-Qunused-arguments',
            '-Wno-logical-op-parentheses'
        ];
        var args = [].concat(flags, source_files);

        grunt.log.writeln('Compiling via emscripten to ' + outfile);
        var build_proc = spawn(emcc, args, {stdio: 'inherit'});
        build_proc.on('exit', function() {
            cb();
        });
    });

    grunt.registerTask('runserver', 'Start the development server.', function(port) {
        this.async();
        port = port || 8000;

        connect()
            .use(connect.static('public'))
            .use(connect.directory('public', {icons: true}))
            .use(connect.logger())
            .listen(port)
            .on('listening', function() {
                grunt.log.writeln('Starting static web server on port ' + port + '.');
            })
            .on('error', function(err) {
                if (err.code === 'EADDRINUSE') {
                    grunt.fatal('Port ' + port + ' is already in use by another process.');
                } else {
                    grunt.fatal(err);
                }
            });
    });

    grunt.loadNpmTasks('grunt-gh-pages');
    grunt.loadNpmTasks('grunt-shell');
    grunt.registerTask('deploy', ['gh-pages']);
    grunt.registerTask('default', ['runserver']);
};
