(function (DataService, undefined) {

	//-----------------
	// Private Properties
	//-----------------
	var baseUrl = "";
	var routingUrl = "https://routing.cartodb.io/sql/items/"

	//-----------------
	// Public Methods
	//-----------------
	DataService.init = function (username, dataTable) {
		baseUrl = 'https://' + username + '.carto.com/api/v2/sql';
	};

	DataService.addRouteComment = function (comment, callback) {
		var url = baseUrl;
		
		var sql = "SELECT insert_mag_route_comment_data(";
		sql += "'" + comment.name + "',";
		sql += "'" + comment.email + "',";
		sql += "'" + comment.comment + "',";
		sql += comment.originLatitude + ",";
		sql += comment.originLongitude + ",";
		sql += comment.destinationLatitude + ",";
		sql += comment.destinationLongitude + ",";
		sql += comment.geometry + ",";
		sql += comment.routeLength + ",";
		sql += comment.routeDuration + ",";
		sql += comment.feedbackType + ",";
		sql += comment.userZoom + ",";
		sql += "'" + comment.userCenterpoint + "'";
		sql += ");";
	
		$.ajax({
			type: "POST",
			url: url,
			crossDomain: true,
			dataType: "json",
			data: { "q": sql },
			success: function (result) {
				callback(result);
			},
			error: function (responseData, textStatus, errorThrown) {
				console.log("Problem saving the data");
				console.log(responseData);
				callback(responseData);
			}
		});
	};

	DataService.addMarkerComment = function (comment, callback) {
		var url = baseUrl;

		var sql = "SELECT insert_mag_point_comment_data(";
		sql += "'" + comment.name + "',";
		sql += "'" + comment.email + "',";
		sql += "'" + comment.comment + "',";
		sql += comment.originLatitude + ",";
		sql += comment.originLongitude + ",";
		sql += comment.feedbackType + ",";
		sql += comment.userZoom + ",";
		sql += "'" + comment.userCenterpoint + "'";
		sql += ");";

		$.ajax({
			type: "POST",
			url: url,
			crossDomain: true,
			dataType: "json",
			data: { "q": sql },
			success: function (result) {
				callback(result);
			},
			error: function (responseData, textStatus, errorThrown) {
				console.log("Problem saving the data");
				console.log(responseData);
				callback(responseData);
			}
		});
	};

	DataService.getRoute = function (originLatitude, originLongitude, destinationLatitude, destinationLongitude, callback) {

		$.ajax({
			type: "GET",
			url: routingUrl,
			crossDomain: true,
			dataType: "json",
			data: {
				slat: originLatitude,
				slng: originLongitude,
				dlat: destinationLatitude,
				dlng: destinationLongitude,
				mode: 'car'
			},
			success: function (result) {
				callback(result);
			},
			error: function (responseData, textStatus, errorThrown) {
				console.log("Problem saving the data");
				console.log(responseData);
			}
		});
	};
}(window.DataService = window.DataService || {}));
