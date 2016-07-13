'use strict';
const electron = require('electron');
const emitter = require('./modules/nativeEmitter');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const pjson = require('./package.json');

// Report crashes to our server.
//electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let web;

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform != 'darwin') {
		app.quit();
	}
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 1280, height: 800, toolbar: false});

	// remove the menu (also removes debug console)
	//mainWindow.setMenu(null);

	// and load the index.html of the app.
	mainWindow.loadURL(`file://${__dirname}/app/index.html`);

	// Open the DevTools.
	//mainWindow.webContents.openDevTools();

	// assign the web content:
	web = mainWindow.webContents;

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	// Emitted when the window gets focus
	mainWindow.on('focus', function() {
		emitter.emit("systemWindowEvent", "focus");
	});

	// Emitter when the window is closing
	mainWindow.on('close', function() {
		// page was closed, do the required clean-up here
	})
});

