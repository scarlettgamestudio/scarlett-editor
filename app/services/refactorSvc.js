app.factory("refactorSvc", function ($rootScope, config, logSvc, dataSvc, $q, constants) {
    var svc = {};

    svc.rename = function (oldPath, newPath, isDirectory) {
        // TODO: check for possible project model update situations (eg. sprite source)..
        let defer = $q.defer();

        NativeInterface.rename(oldPath, newPath, function (err) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });

        return defer.promise;
    };

    svc.delete = function (path, isDirectory) {
        // TODO: check for possible project model update situations (eg. sprite source)..
        let defer = $q.defer();

        function callback(err) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve();
            }
        }

        if (isDirectory) {
            NativeInterface.removeDirectory(path, callback);
        } else {
            NativeInterface.removeFile(path, callback);
        }

        return defer.promise;
    };

    return svc;
});