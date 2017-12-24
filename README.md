![alt tag](https://scarlett.cothesia.com/attachments/images/scarlett_logo.png)

![alt tag](https://scarlett.cothesia.com/attachments/images/scarlett_screen1.png)

[![node-version][node-version-badge]][node]
[![Dependencies][dependencyci-badge]][dependencyci]
[![styled with prettier][prettier-badge]][prettier]

# README #

[![Greenkeeper badge](https://badges.greenkeeper.io/scarlettgamestudio/scarlett-editor.svg)](https://greenkeeper.io/)

### What is this repository for? ###

This repository contains the Scarlett Editor Module and associated libraries. **At the moment this software is in Development Stage and not ready for production use.**

### Which Operative Systems are compatible? ###

The Scarlett Editor can run in all common Operative Systems including Windows, MacOS and Linux.

### Runtime Setup ###

* Install NodeJS (8.x is recommended)
* Open a terminal in the project root folder and execute `$ npm install` for dependency resolution
* [Link Scarlett Framework](#link-scarlett-framework) 
* In the same folder, execute `$ npm start` to run the software

### Development Setup ###

* Install NodeJS (8.x is recommended)
* Install GruntJS globally by running `$ npm install -g grunt-cli` in your terminal
* Install [Ruby](https://www.ruby-lang.org/en/)
* Install Ruby Sass by running `$ gem install sass` in your terminal
* Open a terminal in the project root folder and execute `$ npm install` for dependency resolution
* [Link Scarlett Framework](#link-scarlett-framework)
* In the same folder, execute `$ npm start` to run the software

### Link Scarlett Framework ###

Scarlett Editor depends on the Scarlett Framework. In order to make the editor aware of its location, you need to use [symlinks](https://docs.npmjs.com/cli/link):
1. `$ cd ~/projects/scarlett-framework` go into the framework directory
2. `$ npm link` create a global link of the framework package
3. `$ cd ~/projects/scarlett-editor` go into the editor directory
4. `$ npm link @scarlett-game-studio/scarlett-framework` link install the framework

`scarlett-editor/node_modules` should now have the framework within. Rebuilding the framework with:

`$ npm run build:editor` or `$ npm run build:all` and refreshing/restarting the editor should be enough to update the framework version within the editor.

### Extra Development Setup ###

* To activate automatic project build on code change (including styling modifications) simply run `$ grunt` in the root folder 

### Recommended Code Editors ###

* Webstorm
* Visual Studio Code
* Atom

### IntelliJ/Webstorm Users ###

This project uses the latest Ecma6 Javascript features and therefore if you are using an IDE such as IntelliJ or Webstorm it might detect code errors when using the default settings.

To allow Ecma6 syntax make sure to change the Javascript Version in the settings menu (Settings -> Languages & Frameworks -> Javascript).

### Development Hints ###

* All main source code can be found in the /app and /modules folders
* AngularJS 1.6+ is the main framework being used in this project
* The execution container is powered by ElectronJS 
* Online Services are not configured in this Development version, you can either configure a personal server using the scarlett-webserver project or use the application in offline-mode.

### Who do I talk to? ###

* Repo owner or admin
* Other community or team contact

[package]: https://www.npmjs.com/org/scarlett-game-studio...........
[npm-version-badge]: https://img.shields.io/npm/v/scarlett-framework.svg
[node]: https://nodejs.org
[node-version-badge]: https://img.shields.io/badge/node-%3E%3D%206.0-orange.svg
[license-badge]: https://img.shields.io/npm/l/scarlett-framework.svg
[dependencyci-badge]: https://dependencyci.com/github/scarlettgamestudio/scarlett-editor/badge
[dependencyci]: https://dependencyci.com/github/scarlettgamestudio/scarlett-editor
[prettier-badge]: https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier]: https://github.com/prettier/prettier
[package]: https://www.npmjs.com/org/scarlett-game-studio...........
[build-badge]: https://travis-ci.org/scarlettgamestudio/scarlett-editor.svg?branch=master
[build]: https://travis-ci.org/scarlettgamestudio/scarlett-editor
