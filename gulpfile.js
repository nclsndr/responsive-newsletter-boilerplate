// Dependencies
var gulp = require('gulp');
var inject = require('gulp-inject');
var inliner = require('gulp-inline-css');
var sass = require('gulp-sass');
var autoPrefixer = require('gulp-autoprefixer');
var insert = require('gulp-insert');
var browserSync = require('browser-sync');
var fs = require('fs');
var minifyCss = require('gulp-minify-css');
var minifyHTML = require('gulp-htmlmin');

var debug = require('gulp-debug');

// Env vars
var srcDir = './src';
var sassDir = srcDir + '/sass';
var cssDir = srcDir + '/css';
var index = srcDir + '/index.html';
var imgDevDir = srcDir + '/img';

var mainSASSFile = sassDir + '/inline.scss'
var externalSASSFile = sassDir + '/external.scss'

var inlineCSSFile = cssDir + '/inline.css'
var externalCSSFile = cssDir + '/external.css'

var buildDir = './dist';
var imgBuildDir = buildDir + '/img';
var indexBuild = buildDir + '/index.html';


// Default acts to prepare dev (src) directory and start live reload
gulp.task('default', ['browser-sync-dev', 'injectDev'], function () {
  gulp.watch(sassDir + '/**', ['compileSASS']);
  gulp.watch(index, ['bs-reload']);
});

gulp.task('build', ['minifyHTML'], function () {
});

gulp.task('browser-sync-dev', function () {
  browserSync({
    port: 8000,
    open: false,
    server: {
      baseDir: srcDir
    },
    ui: {
      port: 8001
    }
  });
});
gulp.task('bs-reload', function () {
  browserSync.reload();
});

// Compile SASS
gulp.task('compileSASS', [], function () {
  return gulp.src([sassDir + '/*.scss'])
    .pipe(autoPrefixer({
      browsers: ['> 1%', 'IE 7']
    }))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(cssDir))
    .pipe(browserSync.stream());
});

// Inject css files for dev
gulp.task('injectDev', ['compileSASS'], function () {
  var target = gulp.src(index);
  target.pipe(debug({title: 'target :'}));

  var sources = gulp.src([cssDir + '/*'], {read: false});
  sources.pipe(debug({title: 'sources :'}));

  return target
    .pipe(inject(sources, {
      name: 'dev',
      starttag: '<!-- inject:dev -->',
      endtag: '<!-- endinject:dev -->',
      addRootSlash: false,
      relative: true
    }))
    .pipe(gulp.dest(srcDir));
});

// Build process
gulp.task('prepareToBuild', ['compileSASS'], function () {
  gulp.src(imgDevDir + '/**')
    .pipe(gulp.dest(imgBuildDir));

  return gulp.src(index)
    .pipe(gulp.dest(buildDir));
});

// Delete reference to css files
gulp.task('deleteInjection', ['prepareToBuild'], function () {
  var inputIndex = fs.readFileSync(index, "utf8");

  var cdt = new RegExp('<!-- inject:dev -->[^]*?<!-- endinject:dev -->', 'im');
  var fileContentEnd = inputIndex.replace(cdt, '');

  return gulp.src(indexBuild)
    .pipe(debug())
    .pipe(insert.transform(function (contents, file) {
      return fileContentEnd;
    }))
    .pipe(gulp.dest(buildDir));
});

// Inline CSS
gulp.task('inlineProd', ['deleteInjection'], function () {
  var mainStyle = fs.readFileSync(inlineCSSFile, "utf8");
  return gulp.src(indexBuild)
    .pipe(inliner({
      preserveMediaQueries: true,
      extraCss: mainStyle
    }))
    .pipe(gulp.dest(buildDir));
});

// Concat and minify CSS for build
gulp.task('minifyCss', ['inlineProd'], function () {
  gulp.src(externalCSSFile)
    .pipe(minifyCss({
      compatibility: 'ie8'
    }))
    .pipe(gulp.dest(cssDir));
});

// Inject css for responsive in <head>
gulp.task('externalCSS', ['inlineProd', 'minifyCss'], function () {
  setTimeout(function () {
    var inputIndex = fs.readFileSync(indexBuild, "utf8");
    var responsiveData = fs.readFileSync(externalCSSFile, "utf8");
    responsiveData = '<style> ' + responsiveData + ' </style>';
    var fileContentResponsive = inputIndex.replace('<!-- externalCSS -->', responsiveData);

    return gulp.src(indexBuild)
      .pipe(insert.transform(function (contents, file) {
        return fileContentResponsive;
      }))
      .pipe(gulp.dest(buildDir));
  }, 1000);
});

gulp.task('minifyHTML', ['externalCSS'], function() {
  return gulp.src(indexBuild)
    .pipe(minifyHTML({
      // removeComments: true
      // collapseWhitespace: true
    }))
    .pipe(gulp.dest(buildDir))
})
