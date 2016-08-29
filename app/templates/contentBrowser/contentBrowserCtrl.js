app.controller('ContentBrowserCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', 'constants', '$translate',
    function ($scope, logSvc, config, scarlettSvc, sceneSvc, constants, $translate) {

        $scope.model = {
            filter: null,
            types: null,
            search: "",
            content: {},
            contentView: []
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
                if (!$scope.model.filter) {
                    $scope.model.contentView.push(obj);
                }
            }
        };

        $scope.setFilter = function (type) {
            $scope.model.filter = type;
            $scope.refreshContentView();
        };

        $scope.refreshContentView = function() {
            $scope.model.contentView = [];

            // no filter?
            if (!$scope.model.filter) {
                // gather all the content in a single array:
                Object.keys($scope.model.content).forEach(function (key) {
                    $scope.model.contentView = $scope.model.contentView.concat($scope.model.content[key]);
                });

            } else {
                // use the content array using the filter type
                $scope.model.contentView = $scope.model.content[$scope.model.filter];

            }
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
            $scope.model.content = JSON.parse(JSON.stringify(scarlettSvc.activeProject.content));

            // assign locally the content types:
            $scope.model.types = constants.CONTENT_TYPES;

        })();
    }
]);