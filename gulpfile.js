"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass");
const nls = require("vscode-nls-dev");
const ts = require("gulp-typescript");
const typescript = require("typescript");
const tsProject = ts.createProject("./tsconfig.json", { typescript });
const filter = require("gulp-filter");

gulp.task("sass", () => {
  return gulp
    .src("./page/sass/**/*.scss")
    .pipe(sass.sync({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(gulp.dest("./page/css"));
});

const languages = [
  { id: "zh-cn", folderName: "chs", transifexId: "zh-hans" },
  { id: "zh-tw", folderName: "cht", transifexId: "zh-hant" },
];

const generatedAdditionalLocFiles = () => {
  return gulp
    .src(["package.nls.json"])
    .pipe(nls.createAdditionalLanguageFiles(languages, "i18n"))
    .pipe(gulp.dest("."));
};

const generatedSrcLocBundle = () => {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(nls.createMetaDataFiles())
    .pipe(nls.createAdditionalLanguageFiles(languages, "i18n"))
    .pipe(nls.bundleMetaDataFiles("YXL.cloudmusic", "dist"))
    .pipe(nls.bundleLanguageFiles())
    .pipe(
      filter([
        "**/nls.bundle.*.json",
        "**/nls.metadata.header.json",
        "**/nls.metadata.json",
      ])
    )
    .pipe(gulp.dest("dist"));
};

gulp.task(
  "translations-generate",
  gulp.series(generatedSrcLocBundle, generatedAdditionalLocFiles)
);

gulp.task("all", gulp.series("sass", "translations-generate"));
