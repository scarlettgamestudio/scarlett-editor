app.controller('ProjectExplorerCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
	function ($scope, logSvc, config, scarlettSvc) {

		$scope.model = {
			tree: [],
			uid: 0
		};

		$scope.getFileIcon = function (filename) {
			var extension = Path.getFileExtension(filename).toLowerCase();

			switch (extension) {
				// git related files
				case ".gitignore":
					return "fa-git";

				// game scene
				case ".gs":
					// maybe get a better icon here?
					return "fa-picture-o";

				// archive files
				case ".zip":
				case ".rar":
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