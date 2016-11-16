app.controller('ContentBrowserCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', 'constants', '$translate', '$timeout', '$http', '$compile',
    function ($scope, logSvc, config, scarlettSvc, sceneSvc, constants, $translate, $timeout, $http, $compile) {

        $scope.model = {
            tree: [],
            uid: 0,
            search: "",
            contentView: [],
            zoom: 2,
            selectedNode: null
        };

        $scope.contentClass = function() {
            return "size_" + $scope.model.zoom;
        };

        $scope.getFilterDisplayName = function (type) {
            switch (type) {
                case constants.CONTENT_TYPES.TEXTURE:
                    return $translate.instant("CONTENT_TEXTURE");
                case constants.CONTENT_TYPES.TEXTURE_ATLAS:
                    return $translate.instant("CONTENT_TEXTURE_ATLAS");
                case constants.CONTENT_TYPES.SCRIPT:
                    return $translate.instant("CONTENT_SCRIPT");
                default:
                    return $translate.instant("CONTENT_ALL");
            }
        };

        $scope.getSelectedFilterName = function () {
            return $scope.getFilterDisplayName($scope.model.filter);
        };

        $scope.getFileIcon = function (node) {
            if (node.type == "directory") {
                return "fa-folder";
            }

            var filename = node.name;
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

        $scope.refreshContentView = function() {
            // TODO: change this
            var newContentView = [];

            $scope.selectedNode.nodes.forEach(function (node) {
                newContentView.push(node);
            });

            $scope.model.contentView = newContentView;
        };

        $scope.setActiveFolderNode = function(node) {
            $scope.selectedNode = node;
            //$scope.$broadcast(constants.EVENTS.ACTIVE_FOLDER_NODE_CHANGED, node);
            $scope.refreshContentView();
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
            var nodeModel = generateNode(++$scope.model.uid, directoryTitle, "directory", {path: directory.path, isRenaming: false});

            if (deep) {
                directory.subdirectories.forEach(function (subdirectory) {
                    nodeModel.nodes.push(mapTreeModel(subdirectory, deep));
                });
            }

            directory.files.forEach(function (fileInfo) {
                var filename = Path.getFilename(fileInfo.relativePath);
                var extension = Path.getFileExtension(filename);

                //FIXME: this validation should be placed somewhere else (maybe?)
                if (filename.indexOf("_") == 0 || filename.indexOf(".") == 0) {

                } else {
                    nodeModel.nodes.push(generateNode(++$scope.model.uid, filename, "file", {
                        extension: extension,
                        path: fileInfo.fullPath,
                        isRenaming : false
                    }));
                }
            });

            return nodeModel;
        }

        function generateUniqueName(baseName, type) {
            ensureTypeExists(type);

            var unique, extra = 1;
            var arr = $scope.model.content[type];
            do {
                unique = true;

                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].name == baseName + extra) {
                        unique = false;
                        extra++;
                        break;
                    }
                }

            } while (!unique);

            return baseName + extra;
        }

        (function init() {
            $scope.model.uid = 0;
            $scope.model.tree = [mapTreeModel(scarlettSvc.activeProjectFileMap, true, 0)];
            $scope.setActiveFolderNode($scope.model.tree[0]);
        })();
    }
]);