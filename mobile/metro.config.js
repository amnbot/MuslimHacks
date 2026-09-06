// SANAD mobile shares the cost and agreement modules with the web app in ../src/lib.
// Metro only bundles files inside the project root unless they are listed here.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedLib = path.resolve(projectRoot, '..', 'src', 'lib');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedLib];
// Resolve every dependency from the mobile app's own node_modules, never the web app's.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
