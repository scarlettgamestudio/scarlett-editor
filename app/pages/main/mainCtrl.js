/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope', '$translate', '$uibModal', 'scarlettSvc', 'constants', 'sceneSvc', '$timeout', 'modalSvc', 'layoutSvc',
    function ($scope, logSvc, soapSvc, config, userSvc, $rootScope, $translate, $uibModal, scarlettSvc, constants, sceneSvc, $timeout, modalSvc, layoutSvc) {

        var activeModal = null;

        $scope.model = {
            onlineMode: userSvc.isLoggedIn()
        };

        $scope.openContentBrowser = function () {
            modalSvc.showModal("contentBrowser", {}, "md");
        };

        $scope.openNewProjectModal = function () {
            activeModal = $uibModal.open({
                animation: true,
                templateUrl: "modals/newProject/newProjectModal.html",
                controller: "NewProjectModalCtrl",
                size: 200
            });
        };

        $scope.showConsole = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.CONSOLE);
        };

        $scope.showProjectExplorer = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.PROJECT_EXPLORER);
        };

        $scope.showSceneHierarchy = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_HIERARCHY);
        };

        $scope.showAtlasEditor = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.ATLAS_EDITOR);
        };

        $scope.showSceneView = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_VIEW);
        };

        $scope.showInspector = function () {
            layoutSvc.addWindow(constants.WINDOW_TYPES.INSPECTOR);
        };

        $scope.openLoadProject = function () {
            scarlettSvc.promptLoadProject();
        };

        $scope.save = function () {
            // save active scene:
            sceneSvc.saveActiveScene();

            // save project data:
            scarlettSvc.saveProject();
        };

        $scope.logout = function () {
            // call of user service logout, it will handle ui view changes as well:
            userSvc.logout();
        };

        $scope.safeDigest = function () {
            !$scope.$$phase && $scope.$digest();
        };

        // initialization
        (function init() {
            // there is an active project assigned?
            if (!isObjectAssigned(scarlettSvc.activeProject)) {
                // no ? we can't be in this view without an active project..
                $rootScope.changeView("hub");
                return;
            }

            $scope.userInfo = userSvc.getUserInfo();

            layoutSvc.createLayout("#editor-container");

            $scope.onWindowResize = function () {
                layoutSvc.updateSize();
            };

            $scope.onKeyDown = function (e) {
                let keys = [e.keyCode];

                if (e.ctrlKey) {
                    keys.push(Keys.Ctrl);
                }

                if (e.shiftKey) {
                    keys.push(Keys.Shift);
                }

                // update the keyboard data:
                Keyboard.addKeys(keys);
            };

            $scope.onKeyUp = function (e) {
                // note: in the editor
                let keys = [e.keyCode];

                if (e.ctrlKey) {
                    keys.push(Keys.Ctrl);
                }

                if (e.shiftKey) {
                    keys.push(Keys.Shift);
                }

                // update the keyboard data:
                Keyboard.removeKeys(keys);

                // controller behaviors:

                // undo
                if (e.ctrlKey && e.keyCode == 90) {
                    AngularHelper.commandHistory.undo();
                    $rootScope.$broadcast(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED);
                }

                // redo
                if (e.ctrlKey && e.keyCode == 89) {
                    AngularHelper.commandHistory.redo();
                    $rootScope.$broadcast(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED);
                }
            };

            $scope.onWindowBlur = function (e) {
                // clear stuff that might generate issues:
                Keyboard.clearKeys();
            };

            $scope.onWindowFocus = function (e) {
                // trigger events here if needed..
            };

            $scope.$on("$destroy", (function () {
                // destroy and clear active layout manager:
                layoutSvc.destroyLayout();

            }).bind(this));

            $timeout((function () {
                // running this under the $timeout guarantees that the controller will be initialized only when the base
                // html is rendered, therefore having correct size calculations (important).
                layoutSvc.initLayout();

                window.addEventListener("resize", $scope.onWindowResize);
                window.addEventListener("keyup", $scope.onKeyUp);
                window.addEventListener("keydown", $scope.onKeyDown);
                window.addEventListener("blur", $scope.onWindowBlur);
                window.addEventListener("focus", $scope.onWindowFocus);

            }).bind(this), 10);

        })();
    }]
);