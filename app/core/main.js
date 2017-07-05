// disable pinch zoom on app content...
var webFrame = require('electron').webFrame;
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);