import fs from "fs";
import path from "path";

import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import postcssImport from "postcss-import";
import copy from "rollup-plugin-copy";

// Custom plugin to replace script and stylesheet tags with hashed filenames
const replaceTagsWithHash = options => {
  return {
    name: "replace-tags-with-hash",
    generateBundle(outputOptions, bundle) {
      const filePath = path.resolve(options.filePath);
      const content = fs.readFileSync(filePath, "utf-8");

      const generatedFiles = Object.keys(bundle)
        .filter(file => file.endsWith(".js") || file.endsWith(".css"))
        .reduce((acc, file) => {
          const match = file.match(/(.+)\.([a-f0-9]+)\.(js|css)/);
          if (match) {
            acc[match[1]] = match[0];
          }
          return acc;
        }, {});

      let modifiedContent = content;

      Object.entries(generatedFiles).forEach(([baseName, hashedFileName]) => {
        const originalSrc = `./assets/js/${baseName}.js`;
        modifiedContent = modifiedContent.replace(originalSrc, `./${hashedFileName}`);
      });

      Object.entries(generatedFiles).forEach(([baseName, hashedFileName]) => {
        if (hashedFileName.startsWith("styles")) {
          const originalCssSrc = `./assets/css/${baseName}.css`;
          const hashedFileNameWithoutExtension = hashedFileName.split(".js")[0];
          modifiedContent = modifiedContent.replace(
            originalCssSrc,
            `./assets/css/${hashedFileNameWithoutExtension}.css`
          );
        }
      });

      fs.writeFileSync(filePath, modifiedContent);
    },
  };
};

// Custom plugin to rename the CSS file with a hash
const renameCssWithHash = () => {
  return {
    name: "rename-css-with-hash",
    generateBundle(outputOptions, bundle) {
      const cssFiles = Object.keys(bundle).filter(file => file.includes("styles"));

      const stylesFile = cssFiles.find(file => file.endsWith(".css"));
      const hashFile = cssFiles.find(file => file.endsWith(".js"));

      if (stylesFile && hashFile) {
        const hash = hashFile.split(".")[1]; // It's the hash, always the second after .js
        const newFileName = stylesFile.replace(".css", `.${hash}.css`);
        setTimeout(() => {
          if (fs.existsSync(path.join(outputOptions.dir, stylesFile))) {
            fs.writeFileSync(path.join(outputOptions.dir, newFileName), bundle[stylesFile].source);
          }
        }, 1000);
      }
    },
  };
};

// Custom Rollup plugin to replace text in HTML
const replaceTextInFile = options => {
  return {
    name: "replace-text-in-file",
    generateBundle(outputOptions) {
      const filePath = path.resolve(options.filePath);
      const content = fs.readFileSync(filePath, "utf-8");

      let modifiedContent = content;
      options.replacements.forEach(({ original, replacement }) => {
        modifiedContent = modifiedContent.replace(new RegExp(original, "g"), replacement);
      });

      fs.writeFileSync(filePath, modifiedContent);
    },
  };
};

export default {
  input: {
    preloader: "./assets/js/preloader.js",
    main: "./assets/js/main.js",
    styles: "./assets/css/main.css",
  },
  output: {
    dir: "./dist/",
    format: "es",
    sourcemap: true,
    entryFileNames: "[name].[hash].js",
  },
  plugins: [
    postcss({
      extract: path.resolve("dist", "assets", "css", "styles.css"),
      minimize: true,
      plugins: [postcssImport()],
    }),
    resolve(),
    commonjs(),
    terser(),
    copy({
      targets: [
        { src: "./assets/favicons/*", dest: "dist/assets/favicons" },
        { src: "assets/images/*", dest: "dist/assets/images" },
        { src: "assets/svg/*", dest: "dist/assets/svg" },
        { src: "assets/projects/*", dest: "dist/assets/projects" },
        {
          src: "./index.html",
          dest: "dist",
          // rename: "index.html", // Rename if needed
        },
      ],
    }),
    replaceTextInFile({
      filePath: "dist/index.html",
      replacements: [
        {
          original: `
  <link rel="stylesheet" href="./assets/css/styles.css" type="text/css" media="all">
  <link rel="stylesheet" href="./assets/css/gumby.css" type="text/css" media="screen">
  <link rel="stylesheet" href="./assets/css/media-queries.css" type="text/css" media="screen">`,
          replacement: `
  <link rel="stylesheet" href="./assets/css/styles.css" type="text/css" media="all">`,
        },
      ],
    }),
    replaceTagsWithHash({
      filePath: "dist/index.html",
    }),
    renameCssWithHash(),
  ],
  watch: {
    clearScreen: false,
  },
};
