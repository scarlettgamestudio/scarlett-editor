/**
 * Created by João Alves on 11/02/2017.
 */
app.controller('scriptEditorCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'constants', 'scriptsSvc',
    function ($scope, logSvc, config, scarlettSvc, constants, scriptsSvc) {

        $scope.model = {
            tabs: []
        };

        $scope.safeDigest = function () {
            !$scope.$$phase && $scope.$digest();
        };

        $scope.$on("$destroy", (function () {
            // unsubscribe events:
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.SCRIPT_OPEN, $scope.openScript);

            // clear the active scripts:
            scriptsSvc.clearActiveScripts();

        }).bind(this));

        $scope.isScriptOpen = function (path) {
            for (let i = 0; i < $scope.model.tabs.length; i++) {
                if ($scope.model.tabs[i].path == path) {
                    return true;
                }
            }

            return false;
        };

        $scope.getTabIndex = function (tab) {
            for (let i = 0; i < $scope.model.tabs.length; i++) {
                if ($scope.model.tabs[i].path == tab.path) {
                    return i;
                }
            }

            return -1;
        };

        $scope.closeTab = function (tab) {
            let tabPos = $scope.getTabIndex(tab);

            if (tabPos >= 0) {
                // TODO: is tab saved validation

                $scope.model.tabs.splice(tabPos, 1);

            } else {
                logSvc.warn("The tab could not be found, ignoring close tab request");
            }
        };

        $scope.openScript = function (path) {
            if ($scope.isScriptOpen(path)) {
                return;
            }

            NativeInterface.readFile(path, function (result) {
                // the reading was successful?
                if (result !== false) {
                    // create and push a new tab description:
                    $scope.model.tabs.push({
                        title: Path.getFilename(path),
                        path: path,
                        content: result,
                        savedContent: result,
                        saved: true
                    });

                    $scope.safeDigest();

                } else {
                    // could not read from file, ignore this script then..
                    logSvc.error("Could not read script from file: " + path);
                }
            });
        };

        (function init() {
            let activeScriptPaths = scriptsSvc.getActiveScriptPaths();
            activeScriptPaths.forEach(function (path) {
                $scope.openScript(path);
            });

            EventManager.subscribe(AngularHelper.constants.EVENTS.SCRIPT_OPEN, $scope.openScript, this);
        })();

    }]);
