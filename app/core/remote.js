/**
 * This file is used to create the IPC interfaces with the executing context (eg. electron)
 */

const remote = require('electron').remote;

const NativeInterface = remote.require("./modules/nativeInterface.js");
const ScarlettInterface = remote.require("./modules/scarlettInterface.js");
const NativeEmitter = remote.require("./modules/nativeEmitter.js");

