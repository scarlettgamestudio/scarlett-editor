/**
 * Created by John
 */

app.factory("scarlettSvc", function ($rootScope, config, logSvc, dataSvc, $q, constants, dialogSvc) {
	let SCARLETT_FOLDER_NAME = ".scarlett";

	let svc = {};

	svc.activeProject = null;
	svc.activeProjectWorkspace = null;
	svc.activeProjectPath = null;
	svc.activeProjectFileMap = null;

	function getAllFilesInDirectory(directory, deep) {
		let files = [];

		directory.files.forEach(function (fileInfo) {
			let filename = Path.getFilename(fileInfo.relativePath);
			let extension = Path.getFileExtension(filename);

			// don't include private/hidden files
			if (filename[0] !== "." && config.IGNORED_FILE_EXTENSIONS.indexOf(extension) < 0) {
				files.push(fileInfo.relativePath);
			}
		});

		// perform sub-folder search?
		if (deep) {
			directory.subdirectories.forEach(function (subdirectory) {
				files = files.concat(getAllFilesInDirectory(subdirectory, deep));
			});
		}

		return files;
	}

	svc.promptLoadProject = function () {
		let params = {
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
	 * Returns the previously stored layout configuration (if any)
	 */
	svc.getLayoutConfiguration = function () {
		if (!isObjectAssigned(svc.activeProjectWorkspace)) {
			return null;
		}

		return svc.activeProjectWorkspace.activeLayout;
	};

	/**
	 * Stores the active layout configuration into the active project editor layout state. This operation doesn't
	 * automatically update the project file on system, project save() is required to store changes into disk.
	 * @param configuration
	 */
	svc.storeLayoutConfiguration = function (configuration) {
		if (!isObjectAssigned(svc.activeProjectWorkspace)) {
			return;
		}

		svc.activeProjectWorkspace.activeLayout = configuration;
	};

	/**
	 * Saves the active project
	 * @returns {boolean}
	 */
	svc.saveProject = function () {
		if (!isObjectAssigned(svc.activeProject)) {
			logSvc.warn("Project not saved due to not having any active project");
			return false;
		}

		// TODO: check if all project objects being saved are indeed assigned

		let destinationPath = Path.wrapDirectoryPath(svc.activeProjectPath) + SCARLETT_FOLDER_NAME + Path.TRAILING_SLASH;
		let fileMap = [
			{
				"content": Objectify.createDataString(svc.activeProject, true),
				"path": destinationPath + "project.json"
			},
			{
				"content": Objectify.createDataString(svc.activeProjectWorkspace, true),
				"path": destinationPath + "workspace.json"
			}
		];

		NativeInterface.writeFiles(fileMap, (status) => {
			if (status) {
				logSvc.log("Project saved with success");

			} else {
				logSvc.warn("Project file could not be saved, check native error logs for more information");
			}
		});
	};

	/**
	 * Load a project folder from a specific path
	 * @param path
	 * @returns {Promise}
	 */
	svc.loadProjectFolder = function (path) {
		let defer = $q.defer();
		let fileMap = [
			{
				"id": "project",
				"path": Path.wrapDirectoryPath(path) + SCARLETT_FOLDER_NAME + Path.TRAILING_SLASH + "project.json"
			},
			{
				"id": "workspace",
				"path": Path.wrapDirectoryPath(path) + SCARLETT_FOLDER_NAME + Path.TRAILING_SLASH + "workspace.json"
			}
		];

		NativeInterface.readFiles(fileMap, (result) => {
			let projectDataString = result["project"];
			let workspaceDataString = result["workspace"];
			let projectData, workspaceData;

			if (!isObjectAssigned(projectDataString)) {
				// the project file failed to load, loading cannot continue..
				logSvc.warn("Project data could not be found, project cannot be loaded");
				defer.reject();
				return;

			} else {
				// try to parse project data string..
				try {
					projectData = Objectify.restoreFromString(projectDataString);

					if (!isObjectAssigned(projectData)) {
						logSvc.warn("Project data could not be parsed, invalidating project load..");
						defer.reject();
						return;
					}

				} catch (error) {
					// the project data failed while parsing..
					defer.reject(error);
					return;
				}
			}

			if (isObjectAssigned(workspaceDataString)) {
				try {
					workspaceData = Objectify.restoreFromString(workspaceDataString);

				} catch (error) {
					// the project data failed while parsing..
					logSvc.warn("Could not reload workspace data, a new instance will be created..");
				}
			}

			if (!isObjectAssigned(workspaceData)) {
				// currently there is no major issue if the workspace could not be loaded, so we can create a new
				// instance in order to proceed..
				workspaceData = new WorkspaceFile();
			}

			// update active project path:
			svc.setActiveProjectPath(path);
			GameManager.activeProjectPath = Path.wrapDirectoryPath(path);

			// update the svc active project
			svc.setActiveProject(projectData);

			// update the svc active project workspace
			svc.setActiveProjectWorkspace(workspaceData);

			// update the active project file map:
			svc.updateActiveProjectFileMap();

			// the project already has files assigned?
			//if (!project.editor.hasOwnProperty("files")) {
			// it doesn't, we need to map all existing files on the directory then.
			//    project.editor.files = svc.getAllActiveProjectFilePaths();
			//}

			// update the lastUpdated property
			let savedData = dataSvc.findByProperty("projects", "path", path);
			if (savedData) {
				savedData.lastUpdate = new Date().getTime();

			} else {
				dataSvc.push("projects", {
					name: projectData.name,
					path: path,
					lastUpdate: new Date().getTime()
				});
			}

			dataSvc.save();

			// all operations completed, resolve load function..
			defer.resolve(true);
		});

		return defer.promise;
	};

	svc.setActiveProjectWorkspace = function (workspace) {
		svc.activeProjectWorkspace = workspace;
	};

	svc.getActiveProjectWorkspace = function () {
		return svc.activeProjectWorkspace;
	};

	svc.getActiveProject = function () {
		return svc.activeProject;
	};

	svc.getActiveProjectPath = function () {
		return Path.wrapDirectoryPath(svc.activeProjectPath);
	};

	svc.setActiveProjectPath = function (path) {
		svc.activeProjectPath = path;
		GameManager.activeProjectPath = Path.wrapDirectoryPath(Path.getDirectory(path));
	};

	svc.setActiveProject = function (project) {
		svc.activeProject = project;
		GameManager.activeProject = project;

		// broadcast the event so other components know
		$rootScope.$broadcast(constants.EVENTS.PROJECT_LOADED, project);
	};

	svc.createFullPath = function (relativePath) {
		return svc.getActiveProjectPath() + relativePath;
	};

	svc.openProject = function (path) {
		svc.loadProjectFolder(path).then(
			function (success) {
				if (success) {
					// show the main view
					$rootScope.changeView('main');
				}

			}, function (error) {
				dialogSvc.showDialog("Ups", "The selected folder doesn't appear to contain a valid Scarlett Project.", "alert");

			})
	};

	return svc;
});