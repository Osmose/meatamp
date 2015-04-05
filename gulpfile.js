var addsrc = require('gulp-add-src');
var argv = require('yargs').argv;
var babel = require('gulp-babel');
var del = require('del');
var deploy = require('gulp-gh-pages');
var gitRev = require('git-rev');
var glob = require('glob');
var gulp = require('gulp');
var gutil = require('gulp-util');
var myth = require('gulp-myth');
var path = require('path');
var plumber = require('gulp-plumber');
var serve = require('gulp-serve');
var spawn = require('child_process').spawn;


/**
 * Run a local development server. The site is re-generated automatically when
 * changes are made.
 */
gulp.task('serve', ['build'], function() {
    var watcher = gulp.watch(['./src/**/*', './public/**/*'], ['build']);
    watcher.on('change', function(event) {
        gutil.log(gutil.colors.cyan('Change detected, rebuilding.'));
    });

    // Wish I had a better way of doing this.
    return serve({
        root: 'build',
        port: 8000,
    })();
});

/**
 * Compile the C libraries with emscripten.
 */
gulp.task('build.emscripten', function(done) {
    var emcc = process.env.EMCC_BIN || argv.emcc || 'emcc';

    var gme_dir = path.join('src', 'game_music_emu', 'gme');
    var gme_files = glob.sync(gme_dir + '/*.cpp');
    var source_files = ['src/meatamp.c'].concat(gme_files);
    var outfile = 'build/js/meatamp.js';

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

    gutil.log('Compiling via emscripten to ' + outfile);
    var build_proc = spawn(emcc, args, {stdio: 'inherit'});
    build_proc.on('exit', function() {
        done();
    });
});

/**
 * Copy other files over to the build directory.
 */
gulp.task('build.static', function() {
    return gulp.src(['./public/CNAME',
                     './public/index.html',
                     './public/manifest.webapp',
                     './public/font/**/*',
                     './public/img/**/*',
                     './public/js/lib/**/*'],
                    {base: './public'})
        .pipe(gulp.dest('./build'));
});

/**
 * Build CSS files by running them through myth.
 */
gulp.task('build.css', function() {
    return gulp.src('./public/css/*.css')
        .pipe(plumber())
        .pipe(myth())
        .pipe(gulp.dest('./build/css'));
});

/**
 * Build JS files by running them through Babel.
 */
gulp.task('build.js', function() {
    return gulp.src('./public/js/*.js')
        .pipe(plumber())
        .pipe(babel())
        .pipe(addsrc.append('./node_modules/gulp-babel/node_modules/' +
                            'babel-core/browser-polyfill.js'))
        .pipe(gulp.dest('./build/js'));
});

/**
 * Full build of the static site.
 */
gulp.task('build', ['build.css', 'build.js', 'build.static',
                    'build.emscripten']);

/**
 * Clean out the build directory.
 */
gulp.task('clean', function(cb) {
    del('build/**/*', cb);
});

/**
 * Build the site, commit it to the gh-pages branch, and push to origin.
 */
gulp.task('deploy', ['build'], function(cb) {
    gitRev.long(function(rev) {
        gulp.src('./build/**/*')
        .pipe(deploy({
            message: 'Building from commit ' + rev,
        }))
        .on('end', cb);
    });
});
