/**
 * This file is used to create the IPC interfaces with the executing context (eg. electron)
 */

const NativeInterface = require("remote").require("./modules/nativeInterface.js");
const ScarlettInterface = require("remote").require("./modules/scarlettInterface.js");