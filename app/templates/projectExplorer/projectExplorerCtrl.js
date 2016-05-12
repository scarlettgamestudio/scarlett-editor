app.controller('ProjectExplorerCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc',
	function ($scope, logSvc, config, scarlettSvc) {

		$scope.model = {
			tree: [],
			uid: 0
		};

		function generateNode(id, title, type, attributes) {
			return {
				'id': id,
				'title': title,
				'type': type,
				'attributes': attributes || {},
				'nodes': []
			}
		}

		function mapTreeModel (directory, deep) {
			var nodeModel = generateNode(++$scope.model.uid, directory.path, "directory");

			if(deep) {
				directory.subdirectories.forEach(function(subdirectory) {
					nodeModel.nodes.push(mapTreeModel(subdirectory, deep));
				});
			}

			directory.files.forEach(function(fileInfo) {
				var filename = getFilenameFromPath(fileInfo.relativePath);
				var extension = getFileExtension(filename);

				nodeModel.nodes.push(generateNode(++$scope.model.uid, filename, "file", {"extension": extension}));
			});

			return nodeModel;
		}

		$scope.refresh = function() {
			$scope.model.uid = 0;
			$scope.model.tree = [mapTreeModel(scarlettSvc.activeProjectFileMap, true)];

		};

		$scope.toggle = function (scope) {
			scope.toggle();
		};

		(function init() {
			$scope.refresh();
		})();
	}

]);