app.controller('ContentBrowserCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', 'constants', '$translate', '$timeout', '$http', '$compile', 'assetSvc', 'refactorSvc',
    function ($scope, logSvc, config, scarlettSvc, sceneSvc, constants, $translate, $timeout, $http, $compile, assetSvc, refactorSvc) {

        $scope.model = {
            tree: [],
            uid: 0,
            search: "",
            contentView: [],
            zoom: 1,
            selectedNode: null,
            availableFileTypes: null
        };

        $scope.contentClass = function () {
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

            let filename = node.name;
            let extension = Path.getFileExtension(filename).toLowerCase();

            switch (extension) {
                // atlas
                case ".atl":
                    return "fa-object-group";

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

        $scope.refreshContentView = function () {
            let newContentView = [];

            $scope.model.selectedNode.nodes.forEach(function (node) {
                newContentView.push(node);
            });

            $scope.model.contentView = newContentView;
        };

        $scope.setActiveFolderNode = function (node) {
            $scope.model.selectedNode = node;
            //$scope.$broadcast(constants.EVENTS.ACTIVE_FOLDER_NODE_CHANGED, node);

            $scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, [node.id], false);
            $scope.refreshContentView();
        };

        $scope.onFolderDblClick = function (folder) {
            $scope.setActiveFolderNode(folder);
        };

        $scope.onFileDblClick = function (file) {
            handleOpenFile(file);
        };

        $scope.onFileClick = function (file) {
            if (assetSvc.isAsset(file.attributes.path)) {
                handleOpenFile(file);
                return;
            }

            let container = assetSvc.getAssetContainer(file.attributes.path);

            if (isObjectAssigned(container)) {
                EventManager.emit(constants.EVENTS.ASSET_SELECTION, container);

            } else {
                // no asset container was found, so clear selection
                EventManager.emit(constants.EVENTS.OBJECTS_SELECTION, []);
            }
        };

        $scope.onNodeDblClick = function (node) {
            if (node.type == "directory") {
                $scope.onFolderDblClick(node);
            } else {
                $scope.onFileDblClick(node);
            }
        };

        $scope.onNodeClick = function (node) {
            if (node.type == "file") {
                $scope.onFileClick(node);
            }
        };

        $scope.deleteNode = function (node) {
            function callback(err) {
                if (err) {
                    return;
                }

                // remove from hierarchy:
                node.parent.nodes.splice(node.parent.nodes.indexOfObject(node), 1);

                $scope.safeDigest();
            }

            refactorSvc.delete(node.attributes.path, node.isDirectory()).then(callback, callback);
        };

        $scope.nodeNameExists = function (nodes, name) {
            let normalizedName = name.toLowerCase();
            for (let i = 0; i < nodes.length; i++) {
                // note: for now i'm considering normalized (lower case) comparisons
                if (nodes[i].name.toLowerCase() == normalizedName) {
                    return true;
                }
            }

            return false;
        };

        $scope.getUniqueNodeName = function (nodes, name, isFilename) {
            let tmpName = name, c = 0;
            while ($scope.nodeNameExists(nodes, tmpName)) {
                if (isFilename) {
                    // file name
                    let split = name.split(".");
                    let ext = split.splice(split.length - 1, 1)[0];
                    tmpName = split.join(".") + (++c) + "." + ext;

                } else {
                    // folder name
                    tmpName = name + " " + (++c);
                }
            }

            return tmpName;
        };

        $scope.loadAsset = function (path) {
            assetSvc.loadAsset(path).then(function (asset) {
                EventManager.emit(constants.EVENTS.ASSET_SELECTION, asset);

            }, function () {
                logSvc.error("Error while loading asset: " + path);
            });
        };

        $scope.createAsset = function (assetName, asset) {
            if (!$scope.model.selectedNode) {
                return;
            }

            let parentNode = $scope.model.selectedNode;
            let uniqueName = $scope.getUniqueNodeName($scope.model.selectedNode.nodes, assetName, true);
            let path = Path.wrapDirectoryPath(parentNode.attributes.path) + uniqueName;

            assetSvc.saveAsset(path, asset).then(function () {
                let node = generateNode(++$scope.model.uid, uniqueName, "file", {
                    path: path,
                    isRenaming: false
                }, parentNode);

                parentNode.nodes.push(node);
                parentNode.nodes = $scope.sortNodes(parentNode.nodes);

                $scope.refreshContentView();
                $scope.safeDigest();

            }, function () {
                logSvc.error("Error while saving asset: " + asset);
            });
        };

        $scope.addFolder = function () {
            if (!$scope.model.selectedNode) {
                return;
            }

            let parentNode = $scope.model.selectedNode;
            let uniqueName = $scope.getUniqueNodeName(parentNode.nodes, $translate.instant('COMMON_NEW_FOLDER'));
            let path = Path.wrapDirectoryPath(parentNode.attributes.path) + uniqueName;

            NativeInterface.createDirectory(path, function (err) {
                if (err) {
                    logSvc.error(err);
                    return;
                }

                let node = generateNode(++$scope.model.uid, uniqueName, "directory", {
                    path: path,
                    isRenaming: false
                }, parentNode);

                parentNode.nodes.push(node);
                parentNode.nodes = $scope.sortNodes(parentNode.nodes);

                $scope.refreshContentView();
                $scope.safeDigest();
            });
        };

        $scope.safeDigest = function () {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        $scope.sortNodes = function (nodes) {
            let result = [];
            let directories = [];
            let files = [];

            nodes.forEach(function (node) {
                if (node.type == "directory") {
                    directories.push(node);
                } else {
                    files.push(node);
                }
            });

            directories.sort(sortByNodeName);
            files.sort(sortByNodeName);

            result = result.concat(directories);
            result = result.concat(files);

            return result;
        };

        $scope.deepUpdatePath = function (baseNode, oldPath, newPath) {
            baseNode.nodes.forEach(function (node) {
                node.attributes.path = node.attributes.path.replace(oldPath, newPath);

                if (node.nodes && node.nodes.length > 0) {
                    $scope.deepUpdatePath(node, oldPath, newPath);
                }
            });
        };

        function sortByNodeName(a, b) {
            return a.name.localeCompare(b.name);
        }

        function handleOpenFile(file) {
            let ext = Path.getFileExtension(file.attributes.path);

            switch (ext) {
                case ".ss":
                    sceneSvc.loadSceneFromFile(file.attributes.path);
                    break;

                // asset files:
                case ".atl":
                    $scope.loadAsset(file.attributes.path);
                    break;

                default:
                    // open the file using the system preferred software:
                    NativeInterface.openFile(file.attributes.path);
                    break;
            }
        }

        function generateNode(id, name, type, attributes, parent) {
            return {
                id: id,
                name: name,
                type: type,
                attributes: attributes || {},
                nodes: [],
                parent: parent,
                isDirectory: function () {
                    return this.type === "directory";
                },
                isEqual: function (other) {
                    return this.id == other.id;
                }
            }
        }

        function mapTreeModel(directory, deep, n, parent) {
            let directoryTitle = (n === 0 ? scarlettSvc.activeProject.name : Path.getDirectoryName(directory.path));
            let nodeModel = generateNode(++$scope.model.uid, directoryTitle, "directory", {
                path: directory.path,
                isRenaming: false,
            }, parent);

            if (deep) {
                let directories = [];
                directory.subdirectories.forEach(function (subdirectory) {
                    directories.push(mapTreeModel(subdirectory, deep, n + 1, nodeModel));
                });
                directories.sort(sortByNodeName);
                nodeModel.nodes = nodeModel.nodes.concat(directories);
            }

            let files = [];
            directory.files.forEach(function (fileInfo) {
                let filename = Path.getFilename(fileInfo.relativePath);
                let extension = Path.getFileExtension(filename);

                //FIXME: this validation should be placed somewhere else (maybe?)
                if (filename.indexOf("_") == 0 || filename.indexOf(".") == 0) {
                    // ..
                } else {
                    files.push(generateNode(++$scope.model.uid, filename, "file", {
                        extension: extension,
                        path: fileInfo.fullPath,
                        isRenaming: false
                    }, nodeModel));
                }
            });

            files.sort(sortByNodeName);
            nodeModel.nodes = nodeModel.nodes.concat(files);

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

        $scope.refresh = function (updateExternalFilemap) {
            if (updateExternalFilemap) {
                scarlettSvc.updateActiveProjectFileMap();
            }

            $scope.model.uid = 0;
            $scope.model.tree = [mapTreeModel(scarlettSvc.activeProjectFileMap, true, 0, null)];
        };

        (function init() {
            $scope.refresh();
            $scope.setActiveFolderNode($scope.model.tree[0]);
        })();
    }
]);