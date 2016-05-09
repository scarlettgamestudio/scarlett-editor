/**
 * Created by John
 */

app.factory("scarlettSvc", function ($rootScope, config, logSvc, dataSvc, $q, gameSvc) {
    var svc = {};

    svc.loadProjectFile = function (path) {
        var defer = $q.defer();
        var gamefilePath = fillPathWithSeparator(path) + "project.sc";

        NativeInterface.readFile(gamefilePath, function (result) {
            if (result === false) {
                // the file failed to load..
                defer.reject(error);
            } else {
                try {
                    // TODO: not just parse to game project, convert to a game project object
                    var gameProject = JSON.parse(result);

                    defer.resolve(result);

                } catch (error) {
                    // the project failed while parsing..
                    defer.reject(error);
                }
            }
        });

        return defer.promise;
    };

    svc.openProject = function (path) {
        svc.loadProjectFile(path).then(
            function (gameProject) {
                gameSvc.setActiveProject(gameProject);

                // update the lastUpdated property
                var savedData = dataSvc.findByProperty("projects", "path", path);
                if(savedData) {
                    savedData.lastUpdate = new Date().getTime();
                    dataSvc.save();
                }

                // show the main view
                $rootScope.changeView('main');

            }, function (error) {
                // TODO: warn the user and remove the project from the datasvc
            })
    };

    return svc;
});