/**
 * Created by John
 */

app.factory("assetSvc", function (config, logSvc, scarlettSvc, gameSvc, $q) {

    let svc = {};

    svc._assetExtensions = [".atl"];
    svc._assetCache = {};

    svc.clearCache = function () {
        svc._assetCache = {};
    };

    svc.isAsset = function (path) {
        let extension = Path.getFileExtension(path).toLowerCase();
        return svc._assetExtensions.indexOf(extension) >= 0;
    };

    svc.getAssetContainer = function (path) {
        let extension = Path.getFileExtension(path).toLowerCase();

        switch (extension) {
            // atlas files
            case ".atl":
                return new AtlasAssetContainer({path: path});

            // text related files
            case ".json":
            case ".txt":
                // TODO: add proper container here..
                return null;

            // image files
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".gif":
            case ".bmp":
            case ".svg":
            case ".ico":
                return new ImageAssetContainer({path: path});

            // default
            default:
                // TODO: add default file container here..
                return null;
        }
    };

    svc.loadAsset = function (path, forceReload) {
        // already in cache?
        if (svc._assetCache[path] && !forceReload) {
            return $q.resolve(svc._assetCache[path]);
        }

        let defer = $q.defer();

        NativeInterface.readFile(path, function (data) {
            if (!data) {
                defer.reject();
                return;
            }

            let asset = Objectify.restoreFromString(data);

            if (!asset) {
                defer.reject();
                return;
            }

            svc._assetCache[path] = asset;

            // finally resolve the loaded asset:
            defer.resolve(asset);
        });

        return defer.promise;
    };

	/**
     * Disassociates the given path from any of the content stores of the project.
	 * @param path
     * @returns {boolean}
	 */
	svc.disassociateAssetPath = function(path) {
		let activeProject = scarlettSvc.getActiveProject();
		let contentKeys, idx;

		if (!isObjectAssigned(activeProject)) {
			logSvc.warn("No active project available for asset storage");
			return false;
		}

		contentKeys = Object.keys(activeProject.content);

		// make sure we are working with relative paths:
		path = Path.makeRelative(scarlettSvc.getActiveProjectPath(), path);

		contentKeys.forEach(function(contentHolder) {
		    // the while shouldn't be necessary as there shouldn't be replicated paths, but since the files can be
            // manually changed it's better to have safe precautions:
			do {
			    idx = contentHolder.indexOf(path);
			    if (idx >= 0) {
			        contentHolder.splice(idx, 1);
                }

            } while(idx >= 0);
		});
	};

	/**
     * Call this function to put an asset in the project file map storage. Scripts for instance, are required to be in
	 * the project store so they can be processed.
	 * @param path
	 * @returns {boolean}
	 */
	svc.associateAssetPath = function(path) {
	    let activeProject = scarlettSvc.getActiveProject();
        let ext = Path.getFileExtension(path);
        let contentHolder = null;

        if (!isObjectAssigned(activeProject)) {
            logSvc.warn("No active project available for asset storage");
            return false;
        }

        // make sure we are working with relative paths:
		path = Path.makeRelative(scarlettSvc.getActiveProjectPath(), path);

        switch(ext) {
            case ".js":
	            contentHolder = activeProject.content.scripts;
                break;
        }

		// content holder found ? .. and doesn't already contain the desired path?
        if (contentHolder !== null && contentHolder.indexOf(path) < 0) {
            contentHolder.push(path);

            // request a save project action, this can be improved if the project file is isolated in the save:
	        scarlettSvc.saveProject();
        }

        return true;
    };

    svc.saveAsset = function (path, asset) {
        let defer = $q.defer();
        let dataString = "";

        if (isString(asset)) {
            // for strings we simply create the asset with the given content
            dataString = asset;

        } else {
            dataString = Objectify.createDataString(asset);
        }

        NativeInterface.writeFile(path, dataString, function (success) {
            if (success) {
                svc.associateAssetPath(path);
            }

            return success ? defer.resolve() : defer.reject();
        });

        return defer.promise;
    };

    svc.createTextureAtlas = function () {
        return new TextureAtlas();
    };

    // creates a new game scene
    svc.createGameScene = function () {
        return new GameScene({game: gameSvc.getGame(), backgroundColor: Color.fromRGB(39, 41, 42)});
    };

    // creates a new JS script
    svc.createJSScript = function () {
        //TODO: create js file with content?
        return "";
    };

    return svc;

});