/**
 * Created by John on 12/6/15.
 */

app.factory("soapSvc", function ($q, config, logSvc) {
	return {
		post: function (action, data) {
			var deferred = $q.defer();
			var param = {action: action, data: data};
			var soapParams = new SOAPClientParameters();
			soapParams.add("request", JSON.stringify(param));

			SOAPClient.invoke(config.apiAddress, "request", soapParams, true,
				function (response) {
					if (typeof response !== "undefined" && response != false) {
						try {
							deferred.resolve(JSON.parse(response));
						} catch (error) {
							logSvc.error("parse error (api call): " + error.message);
							deferred.reject(error.message);
						}
					} else {
						deferred.reject(response);
					}
				});

			return deferred.promise;
		}
	}
});
