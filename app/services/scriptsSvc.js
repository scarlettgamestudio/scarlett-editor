/**
 * Created by John
 */

app.factory("scriptsSvc", function ($rootScope, $q, constants, gameSvc, scarlettSvc, layoutSvc, logSvc, assetSvc) {
    let svc = {};

    svc._openScriptPaths = [];
    svc._userScripts = {};

    /**
     *
     * @returns {Array}
     */
    svc.getActiveScriptPaths = function () {
        return svc._openScriptPaths;
    };

    /**
     *
     */
    svc.clearOpenScripts = function() {
        svc._openScriptPaths = [];
    };

    /**
     *
     */
    svc.clearOpenScript = function(path) {
        let idx = svc._openScriptPaths.indexOf(path);
        if (idx >= 0) {
            svc._openScriptPaths.splice(idx, 1);

        } else {
            logSvc.warn("The script is not opened");
        }
    };

    svc.flushScripts = function() {
	    svc._userScripts = {};
    };

	/**
	 *
	 * @returns {Promise}
	 */
	svc.compileScripts = function() {
	    let defer, fileMap;
        let activeProject = scarlettSvc.getActiveProject();

		if (!isObjectAssigned(activeProject)) {
			logSvc.warn("No active project available, scripting compilation canceled");
			return $q.reject(false);
		}

		svc.flushScripts();

		defer = $q.defer();
		fileMap = [];

		// let's first fill the files that we want to load:
		activeProject.content.scripts.forEach((path) => {
			fileMap.push({
				id: path,
				path: scarlettSvc.getActiveProjectPath() + path
			});
		});

		// then we are going to request them to be loaded from disk:
		NativeInterface.readFiles(fileMap, (result) => {
			// reminder that the key is also the relative file path as specified above.
			let keys = Object.keys(result);
			keys.forEach((key) => {
				if (result[key] === null) {
					// this script path needs to be disassociated since it's no longer available:
					assetSvc.disassociateAssetPath(key);

				} else {
					svc.compileScript(result[key]);

				}
			});

			defer.resolve(true);
		});

		return defer.promise;
    };

	/*
	 *
	 * @param scriptText
	 */
	svc.compileScript = function(scriptText) {
		try {
			let evaluated = eval(scriptText);

			if (!isObjectAssigned(evaluated) || !isObjectAssigned(evaluated.__proto__)) {
				// this script file doesn't contain anything relevant..
				return;
			}

			// now we check if this is indeed a valid script object:
			// TODO: check if there is a better way to do this without having to create a dummy instance:
			let dummyInstance = new evaluated();

			if (dummyInstance instanceof Script) {
				// store this in the user scripts dictionary:
				svc._userScripts[evaluated.name] = evaluated;
			}

		} catch (ex) {
			logSvc.error("Error while compiling script: " + ex);
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

        if (svc._openScriptPaths.indexOf(path) >= 0) {
            logSvc.warn("Script is already open, discarding action..");
            return;
        }

        svc._openScriptPaths.push(path);

        // broadcast script open event:
        EventManager.emit(constants.EVENTS.SCRIPT_OPEN, path);
    };

    return svc;
});