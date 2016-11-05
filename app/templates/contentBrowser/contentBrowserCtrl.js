app.controller('ContentBrowserCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', 'constants', '$translate', '$timeout', '$http', '$compile',
    function ($scope, logSvc, config, scarlettSvc, sceneSvc, constants, $translate, $timeout, $http, $compile) {

        var myLayout = null;
        var projectExplorerLayoutConfiguration = {
            type: 'component',
            componentName: 'template',
            width: 20,
            componentState: {
                templateId: 'projectExplorer',
                url: 'templates/projectExplorer/projectExplorer.html'
            },
            title: $translate.instant("EDITOR_PROJECT_EXPLORER")
        };
        var contentBrowserNavigatorConfiguration = {
            type: 'component',
            componentName: 'template',
            componentState: {
                templateId: 'projectExplorer',
                url: 'templates/contentBrowser/contentBrowserNavigator.html'
            },
            title: $translate.instant("EDITOR_CONTENT_BROWSER")
        };
        var layoutConfiguration = {
            settings: {
                showPopoutIcon: false,
                hasHeaders: false,
                showCloseIcon: false,
                showMaximiseIcon: false
            },
            labels: {
                close: $translate.instant("ACTION_CLOSE"),
                maximise: $translate.instant("ACTION_MAXIMIZE"),
                minimise: $translate.instant("ACTION_MINIMIZE"),
                popout: $translate.instant("ACTION_POPOUT")
            },
            dimensions: {
                borderWidth: 4,
                headerHeight: 20,
            },
            content: [{
                type: 'row',
                content: [
                    projectExplorerLayoutConfiguration,
                    contentBrowserNavigatorConfiguration
                ]
            }]
        };

        $scope.contentShared = {
            activeFolderNode: null
        };

        $scope.model = {
            filter: null,
            types: null,
            search: "",
            content: {},
            contentView: [],
            zoom: 2
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

        $scope.getBackgroundImage = function(obj) {
            return "";
        };

        $scope.getSelectedFilterName = function () {
            return $scope.getFilterDisplayName($scope.model.filter);
        };

        $scope.createContentObject = function (type) {
            var obj = undefined;
            switch (type) {
                case constants.CONTENT_TYPES.TEXTURE:
                    obj = new ContentTexture({name: generateUniqueName("Texture", type)});
                    break;

                case constants.CONTENT_TYPES.TEXTURE_ATLAS:
                    obj = new ContentTextureAtlas({name: generateUniqueName("TextureAtlas", type)});
                    break;

                case constants.CONTENT_TYPES.SCRIPT:
                    obj = new ContentScript({name: generateUniqueName("Script", type)});
                    break;
            }

            if (obj) {
                // make sure the array container exists:
                ensureTypeExists(type);

                // push it into the content model:
                $scope.model.content[type].push(obj);

                // add to the current content view?
                // note: this only matters if there is no filter applied because filtered views are already synced
                $scope.refreshContentView();
                /*if (!$scope.model.filter) {
                    $scope.model.contentView.push(obj);
                }*/
            }
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

        $scope.setFilter = function (type) {
            $scope.model.filter = type;
            $scope.refreshContentView();
        };

        $scope.refreshContentView = function() {
            // TODO: change this
            var newContentView = [];

            $scope.contentShared.activeFolderNode.nodes.forEach(function (node) {
                newContentView.push(node);
            });

            $scope.model.contentView = newContentView;
        };

        $scope.setActiveFolderNode = function(node) {
            $scope.contentShared.activeFolderNode = node;
            //$scope.$broadcast(constants.EVENTS.ACTIVE_FOLDER_NODE_CHANGED, node);
            $scope.refreshContentView();
        };

        $scope.onWindowResize = function () {
            myLayout.updateSize();
        };

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

        function ensureTypeExists(type) {
            $scope.model.content[type] = $scope.model.content[type] || [];
        }

        (function init() {
            // clone the current project content so we can cancel the operation:
            $scope.model.content = scarlettSvc.activeProject.content;

            // assign locally the content types:
            $scope.model.types = constants.CONTENT_TYPES;

            // initialize content browser layout
           /* myLayout = new GoldenLayout(layoutConfiguration, "#content-browser-body");

            myLayout.registerComponent('template', function (container, state) {
                if (state.url && state.url.length > 0) {
                    $http.get(state.url, {cache: true}).success(function (html) {
                        // compile the html so we have all angular goodies:
                        html = $compile(html)($scope);
                        container.getElement().html(html);
                    });
                }
            });

            $timeout((function () {
                // running this under the $timeout guarantees that the controller will be initialized only when the base
                // html is rendered, therefore having correct size calculations (important).
                myLayout.init();

                window.addEventListener("resize", $scope.onWindowResize);

            }).bind(this), 10);

            $scope.$on("$destroy", (function () {
                if (isObjectAssigned(myLayout)) {
                    myLayout.destroy();
                }

                // remove event listeners:
                window.removeEventListener("resize", $scope.onWindowResize);

            }).bind(this));*/

        })();
    }
]);