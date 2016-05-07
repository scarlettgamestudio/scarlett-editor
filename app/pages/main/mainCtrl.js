/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope', '$translate',
	function ($scope, logSvc, soapSvc, config, userSvc, $rootScope, $translate) {

		var myLayout;

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		$scope.safeDigest = function () {
			!$scope.$$phase && $scope.$digest();
		};

		// initialization
		(function init() {
			$scope.userInfo = userSvc.getUserInfo();

			myLayout = new GoldenLayout({
				settings: {
					hasHeaders: true,
					showPopoutIcon: false
				},
				dimensions: {
					borderWidth: 5,
					headerHeight: 20
				},
				content: [{
					type: 'row',
					content: [
						{
							type: 'column',
							width: 20,
							content: [
								{
									type: 'component',
									componentName: 'template',
									componentState: {templateId: 'sceneHierarchy'},
									title: $translate.instant("EDITOR_SCENE_HIERARCHY")
								},
								{
									type: 'component',
									componentName: 'template',
									componentState: {templateId: 'projectExplorer'},
									title: $translate.instant("EDITOR_PROJECT_EXPLORER")
								}
							]
						},
						{
							type: 'column',
							content: [
								{
									type: 'component',
									componentName: 'template',
									componentState: {templateId: 'gameView'},
									title: $translate.instant("EDITOR_GAME_VIEW")
								},
								{
									type: 'component',
									componentName: 'template',
									componentState: {templateId: 'consoleView'},
									height: 25,
									title: $translate.instant("EDITOR_CONSOLE")
								}
							]
						}, {
							type: 'component',
							width: 20,
							componentName: 'template',
							componentState: {templateId: 'inspector'},
							title: $translate.instant("EDITOR_INSPECTOR")
						}]
				}]
			});

			myLayout.registerComponent('template', function (container, state) {
				var templateHtml = $('#' + state.templateId).html();
				container.getElement().html(templateHtml);
			});

			myLayout.on('initialised', function () {
				//angular.bootstrap( document.body, [ 'scarlett' ]);
			});

			myLayout.init();
		})();
	}]
);

