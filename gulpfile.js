/**
 * this is the main task runner for managing the GeoVationWeb
 */

/*
 * define requirements
 * ***********************************************************************************************
 */

var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var size = require('gulp-size');
var del = require('del');
var bump = require('gulp-bump');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var exec = require('child_process').exec;
var sys = require('sys');
var tasklist = require('gulp-task-listing');
var runSequence = require('run-sequence');
var karma = require('karma').server;
var jeditor = require("gulp-json-editor");

var PROJECT_BASE_PATH = __dirname + '';

/*
 * gulp default task
 * ***********************************************************************************************
 */

gulp.task('default', tasklist.withFilters(function(task) {
    return (["build","clean","test","bump-major","bump-minor","bump-patch"].indexOf(task) < 0);
}));

/*
 * gulp main tasks
 * ***********************************************************************************************
 */

gulp.task('build', ['pre-build'], function(cb) {
  runSequence('upgrade-version-js', cb);
});

gulp.task('pre-build', ['clean', 'test'], function (cb) {
    var pkg = require('./package.json');

    return gulp.src('./src/*.js')
        .pipe(concat(pkg.name + '.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(rename(pkg.name + '.min.js'))
        .pipe(uglify())
        .pipe(size({showFiles:true}))
        .pipe(gulp.dest('./dist'));
});

gulp.task('clean', function (cb) {
  return del([
    './dist'
  ], cb);
});

gulp.task('bump-patch', function(cb) {
    bumpHelper('patch', cb);
});

gulp.task('bump-minor', function(cb) {
    bumpHelper('minor', cb);
});

gulp.task('bump-major', function(cb) {
    bumpHelper('major', cb);
});

gulp.task('test', ['lint', 'karma-tests'], function(cb) {
  return gulp.src('.');
});

/*
 * gulp helper tasks
 * ***********************************************************************************************
 */

// versioning tasks

gulp.task('npm-bump-patch', function () {
  return gulp.src(['./package.json'])
    .pipe(bump({type:'patch'}))
    .pipe(gulp.dest('./'));
});

gulp.task('npm-bump-minor', function () {
  return gulp.src(['./package.json'])
    .pipe(bump({type:'minor'}))
    .pipe(gulp.dest('./'));
});

gulp.task('npm-bump-major', function () {
  return gulp.src(['./package.json'])
    .pipe(bump({type:'major'}))
    .pipe(gulp.dest('./'));
});

gulp.task('git-describe', function (cb) {
    console.log('Current release is now:');
    executeCommand('git describe --abbrev=0 --tags', cb);
});

gulp.task('git-tag', function(cb) {
    runSequence('git-tag-create', 'git-tag-push', 'git-describe', cb);
});

gulp.task('git-tag-create', function(cb) {
    var pkg = require('./package.json');
    var v = 'v' + pkg.version;
    var message = 'Release ' + v;
    var commandLine = 'git tag -a ' + v + ' -m \'' + message + '\'';
    executeCommand(commandLine, cb);
});

gulp.task('git-tag-push', function(cb) {
    var commandLine = 'git push origin master --tags';
    executeCommand(commandLine, cb);
});

gulp.task('git-tag-commit', function(cb) {
    var pkg = require('./package.json');
    var v = 'v' + pkg.version;
    var message = 'Release ' + v;
    var commandLine = 'git add -A && git commit -a -m\'' + message + '\'';
    executeCommand(commandLine, cb);
});

gulp.task('bower-upgrade-tag', function(){
    var pkg = require('./package.json');
    var v = pkg.version;

    return gulp.src("bower.json")
      .pipe(jeditor({
        'version': v
      }))
      .pipe(gulp.dest("."));
});

gulp.task('upgrade-version-js', function() {
  var pkg = require('./package.json');
  var v = pkg.version;

  return gulp.src('./dist/*')
    .pipe(replace(/.GeoVationWeb.VERSION="REPLACE_ME_PLEASE"/g, '.GeoVationWeb.VERSION="' + v + '"'))
    .pipe(gulp.dest('./dist/'));
});


// continous integration tasks

gulp.task('lint', function (cb) {
  return gulp.src('./src/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('karma-tests', function(cb){
    console.log('Run all the tests now');

    karma.start({
        configFile: __dirname + '/test/karma.conf.js'
    }, cb );

});

/*
 * helper functions
 * ***********************************************************************************************
 */

// execute the command line command in the shell
function executeCommand(commandLine, cb) {
    exec(commandLine, function(error, stdout, stderr) {
        puts(error, stdout, stderr);
        cb(null); // will allow gulp to exit the task successfully
    });
}

// well display console expressions
function puts(error, stdout, stderr) {
    sys.puts(stdout);
}

// will execute the needed stuff to bump successfully
function bumpHelper(bumpType, cb) {
    runSequence('npm-bump-'+bumpType, 'build', 'bower-upgrade-tag', 'git-tag-commit', 'git-tag', cb);
}
