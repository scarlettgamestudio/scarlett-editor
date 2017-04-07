/**
 * Created by John
 */

app.factory("scriptsSvc", function ($rootScope, $q, constants, gameSvc, scarlettSvc, layoutSvc, logSvc) {
    let svc = {};

    svc._activeScriptPaths = [];

    /**
     *
     * @returns {Array}
     */
    svc.getActiveScriptPaths = function () {
        return svc._activeScriptPaths;
    };

    /**
     *
     */
    svc.clearActiveScripts = function() {
        svc._activeScriptPaths = [];
    };

    /**
     *
     */
    svc.clearActiveScript = function(path) {
        let idx = svc._activeScriptPaths.indexOf(path);
        if (idx >= 0) {
            svc._activeScriptPaths.splice(idx, 1);

        } else {
            logSvc.warn("The script is not opened");
        }
    };

    /**
     *
     * @param path
     */
    svc.openScript = function (path) {
        // is the scripting editor window opened?
        if (!layoutSvc.isWindowOpen(constants.WINDOW_TYPES.SCRIPT_EDITOR)) {
            layoutSvc.addWindow(constants.WINDOW_TYPES.SCRIPT_EDITOR);

        } else {
            layoutSvc.selectWindow(constants.WINDOW_TYPES.SCRIPT_EDITOR);
        }

        if (svc._activeScriptPaths.indexOf(path) >= 0) {
            logSvc.warn("Script is already open, discarding action..");
            return;
        }

        svc._activeScriptPaths.push(path);

        // broadcast script open event:
        EventManager.emit(constants.EVENTS.SCRIPT_OPEN, path);
    };

    return svc;
});