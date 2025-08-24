const nodeResolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");

module.exports = {
   input: "tempBuild/Main.js",
   output: {
      file: "app.js",
      format: "iife" },
   plugins: [
      nodeResolve(),
      commonjs({ requireReturnsDefault: 'auto' })
   ]
};
