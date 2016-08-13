/**
 * Created by John
 */

app.factory("scarlettSvc", function ($rootScope, config, logSvc, dataSvc, $q, constants) {
    var svc = {};

    svc.activeProject = null;
    svc.activeProjectPath = null;
    svc.activeProjectFileMap = null;

    function getAllFilesInDirectory(directory, deep) {
        var files = [];

        directory.files.forEach(function (fileInfo) {
            var filename = Path.getFilename(fileInfo.relativePath);
            var extension = Path.getFileExtension(filename);

            // don't include private/hidden files
            if (filename[0] !== "." && config.IGNORED_FILE_EXTENSIONS.indexOf(extension) < 0) {
                files.push(fileInfo.relativePath);
            }
        });

        if (deep) {
            directory.subdirectories.forEach(function (subdirectory) {
                files = files.concat(getAllFilesInDirectory(subdirectory, deep));
            });
        }

        return files;
    }

    svc.generateProject = function (name) {
        return {
            name: name,
            settings: {},
            editor: {
                lastScene: null
            }
        }
    };

    svc.promptLoadProject = function () {
        var params = {
            filters: [{name: 'Scarlett Project', extensions: ['sc']}]
        };

        NativeInterface.openFileBrowser(ScarlettInterface.getApplicationFolderPath(), params, function (result) {
            if (result !== false && result.endsWith(".sc")) {
                svc.openProject(result);
            } else {
                // TODO: show dialog:
                //dialogSvc.showDialog("","","");
            }
        });
    };

    svc.updateActiveProjectFileMap = function () {
        return svc.activeProjectFileMap = NativeInterface.mapDirectory(svc.activeProjectPath);
    };

    svc.getAllActiveProjectFilePaths = function () {
        return getAllFilesInDirectory(svc.activeProjectFileMap, true);
    };

    /**
     * Initializes and performs validation procedures on a Scarlett Project
     * @param project
     * @param path
     */
    svc.setupProject = function (project, path) {
        // base procedures:
        svc.activeProjectPath = path;
        svc.updateActiveProjectFileMap();

        // integrity validations
        if (!project.hasOwnProperty("settings")) {
            project["settings"] = {};
        }

        if (!project.hasOwnProperty("editor")) {
            project["editor"] = {};
        }

        // the project already has files assigned?
        if (!project.editor.hasOwnProperty("files")) {
            // it doesn't, we need to map all existing files on the directory then.
            project.editor.files = svc.getAllActiveProjectFilePaths();
        }

        svc.saveProject(project);
    };

    /**
     * Saves a given project. If no project is provided, the active project is selected for saving
     * @param project
     */
    svc.saveProject = function (project) {
        project = project || svc.activeProject;

        if (project) {
            NativeInterface.writeFile(
                Path.wrapDirectoryPath(svc.activeProjectPath) + "project.sc",
                JSON.stringify(project, null, 4)
            );
        }
    };

    /**
     * Load a project file from a specific path
     * @param path
     * @returns {Promise}
     */
    svc.loadProjectFile = function (path) {
        var defer = $q.defer();
        var gamefilePath = path.endsWith(".sc") ? path : Path.wrapDirectoryPath(path) + "project.sc";

        NativeInterface.readFile(gamefilePath, function (result) {
            if (result === false) {
                // the file failed to load..
                defer.reject(error);
            } else {
                try {
                    var gameProject = JSON.parse(result);

                    svc.setupProject(gameProject, Path.getDirectory(path));

                    GameManager.activeProject = gameProject;
                    GameManager.activeProjectPath = Path.wrapDirectoryPath(Path.getDirectory(gamefilePath));

                    // broadcast the event so other components know
                    $rootScope.$broadcast(constants.EVENTS.PROJECT_LOADED, gameProject);

                    defer.resolve(gameProject);

                } catch (error) {
                    // the project failed while parsing..
                    defer.reject(error);
                }
            }
        });

        return defer.promise;
    };

    svc.getActiveProject = function () {
        return svc.activeProject;
    };

    svc.getActiveProjectPath = function() {
        return Path.wrapDirectoryPath(svc.activeProjectPath);
    };

    svc.setActiveProject = function (project) {
        svc.activeProject = project;
    };

    svc.openProject = function (path) {
        svc.loadProjectFile(path).then(
            function (gameProject) {
                svc.activeProject = gameProject;

                // update the lastUpdated property
                var savedData = dataSvc.findByProperty("projects", "path", path);
                if (savedData) {
                    savedData.lastUpdate = new Date().getTime();

                } else {
                    dataSvc.push("projects", {
                        name: gameProject.name,
                        path: path,
                        lastUpdate: new Date().getTime()
                    });
                }

                dataSvc.save();

                // show the main view
                $rootScope.changeView('main');

            }, function (error) {
                // TODO: warn the user and remove the project from the datasvc
            })
    };

    return svc;
});