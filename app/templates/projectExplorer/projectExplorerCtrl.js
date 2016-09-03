app.controller('ProjectExplorerCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', '$translate', 'constants',
	function ($scope, logSvc, config, scarlettSvc, sceneSvc, $translate, constants) {

		$scope.model = {
			tree: [],
			uid: 0
		};

		$scope.createItemsContextMenuOptions =
			['<i class="fa fa-plus-square"></i>' + $translate.instant("CTX_CREATE"), [
				['<i class="fa fa-picture-o"></i>' + $translate.instant("CTX_GAME_SCENE"), function ($itemScope) {

				}],
				['<i class="fa fa-file-code-o"></i>' + $translate.instant("CTX_JS_SCRIPT"), function ($itemScope) {

				}],
				['<i class="fa fa-folder-o"></i>' + $translate.instant("CTX_FOLDER"), function ($itemScope) {

				}],
			]];

		$scope.addItemsContextMenuOptions =
			['<i class="fa fa-download"></i>' + $translate.instant("CTX_ADD_FROM_FOLDER"), function ($itemScope) {

			}];

		$scope.openFolderInFileExplorer =
			['<i class="fa fa-folder-open-o"></i>' + $translate.instant("CTX_OPEN_FOLDER_FILE_EXPLORER"), function ($itemScope) {

			}];

		$scope.copyPathsContextMenuOptions = [
			['<i class="fa fa-clipboard"></i>' + $translate.instant("CTX_COPY_FULL_PATH"), function ($itemScope) {

			}],
			['<i class="fa fa-clipboard"></i>' + $translate.instant("CTX_COPY_RELATIVE_PATH"), function ($itemScope) {

			}],
		];

		$scope.extraContextMenuOptions = [
			['<i class="fa fa-pencil-square-o"></i>' + $translate.instant("CTX_RENAME"), function ($itemScope) {

			}],
			['<i class="fa fa-trash"></i>' + $translate.instant("CTX_DELETE"), function ($itemScope) {

			}],
		];

		$scope.contextMenuOptions = [
			$scope.createItemsContextMenuOptions,
			$scope.addItemsContextMenuOptions,
			$scope.openFolderInFileExplorer,
			null,
			['<i class="fa fa-refresh"></i>' + $translate.instant("CTX_REFRESH"), function ($itemScope) {
				$scope.refresh();
			}]
		];

		$scope.folderContextMenuOptions = [
			$scope.createItemsContextMenuOptions,
			$scope.addItemsContextMenuOptions,
			$scope.openFolderInFileExplorer,
			null
		].concat($scope.copyPathsContextMenuOptions, null, $scope.extraContextMenuOptions);

		$scope.itemContextMenuOptions = [
			['<i class="fa fa-external-link"></i>' + $translate.instant("CTX_OPEN"), function ($itemScope) {

			}],
			['<i class="fa fa-folder-open-o"></i>' + $translate.instant("CTX_OPEN_CONTAINING_FOLDER"), function ($itemScope) {

			}],
			null,
		].concat($scope.copyPathsContextMenuOptions, null, $scope.extraContextMenuOptions);


		$scope.clearSelection = function () {
			$scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, [], false);
			$scope.safeDigest();
		};

		$scope.baseContainerClick = function () {
			$scope.clearSelection();
		};

		$scope.getFileIcon = function (filename) {
			var extension = Path.getFileExtension(filename).toLowerCase();

			switch (extension) {
				// git related files
				case ".gitignore":
					return "fa-git";

				// game scene
				case ".ss":
					// maybe get a better icon here?
					return "fa-picture-o";

				// archive files
				case ".zip":
				case ".rar":
				case ".tar":
				case ".tar.gz":
				case ".7zip":
					return "fa-file-archive-o";

				// scarlett project file
				case ".sc":
					return "fa-cube";

				// video files
				case ".mp4":
				case ".webm":
				case ".mov":
				case ".wmv":
				case ".mpg":
				case ".mpeg":
				case ".avi":
					return "fa-file-video-o";

				// audio files
				case ".mp3":
				case ".wav":
				case ".midi":
				case ".ogg":
					return "fa-file-audio-o";

				// pdf
				case ".pdf":
					return "fa-file-pdf-o";

				// code related files
				case ".xml":
				case ".html":
				case ".xhtml":
				case ".php":
				case ".js":
					return "fa-file-code-o";

				// text related files
				case ".json":
				case ".txt":
					return "fa-file-text-o";

				// image files
				case ".png":
				case ".jpg":
				case ".jpeg":
				case ".gif":
				case ".bmp":
				case ".svg":
				case ".ico":
					return "fa-file-image-o";

				// default
				default:
					return "fa-file-o";
			}
		};

		$scope.refresh = function () {
			$scope.model.uid = 0;
			$scope.model.tree = [mapTreeModel(scarlettSvc.activeProjectFileMap, true, 0)];
		};

		$scope.onTreeDoubleClick = function(selected) {
			for (var i = 0; i < selected.length; i++) {
				var attr = JSON.parse(selected[i].attachment);
				var ext = Path.getFileExtension(attr.path);

				switch (ext) {
					case ".ss":
						sceneSvc.loadSceneFromFile(attr.path);
						break;

					default:
						// open the file using the system preferred software:
						NativeInterface.openFile(attr.path);
						break;
				}
			}
		};

		function generateNode(id, name, type, attributes) {
			return {
				id: id,
				name: name,
				type: type,
				attributes: attributes || {},
				nodes: []
			}
		}

		function mapTreeModel(directory, deep, n) {
			var directoryTitle = (n === 0 ? scarlettSvc.activeProject.name : Path.getDirectoryName(directory.path));
			var nodeModel = generateNode(++$scope.model.uid, directoryTitle, "directory", {path: directory.path});

			if (deep) {
				directory.subdirectories.forEach(function (subdirectory) {
					nodeModel.nodes.push(mapTreeModel(subdirectory, deep));
				});
			}

			directory.files.forEach(function (fileInfo) {
				var filename = Path.getFilename(fileInfo.relativePath);
				var extension = Path.getFileExtension(filename);

				//FIXME: this validation should be placed somewhere else:
				if (filename.indexOf("_") == 0 || filename.indexOf(".") == 0) {

				} else {
					nodeModel.nodes.push(generateNode(++$scope.model.uid, filename, "file", {
						extension: extension,
						path: fileInfo.fullPath
					}));
				}

			});

			return nodeModel;
		}

		(function init() {
			$scope.refresh();

		})();
	}

]);