(function (Home, undefined) {
	'use strict';

	//-----------------
	// Events
	//-----------------	
	Home.mapLoaded = "mapLoaded";
	Home.mapResize = "mapResize";
	Home.mapEdit = "mapEdit";
	Home.mapSubmit = "mapSubmit";


	//-----------------
	// Private Properties
	//-----------------	
	var mapContainer = "mapContainer";
	var defaultLoadingIcon = "images/icon_loading.gif";
	var dataTable;
	var uiState = {
		Intro: 1,
		EditRoute: 2,
		SubmitComment: 3,
		Finished: 4
	};
	var drawingMode = {
		None: 0,
		Marker: 1,
		Line: 2
	};


	// View models
	var commentViewModel;

	//-----------------
	// Public Properties
	//-----------------		


	//-----------------
	// Public Methods
	//-----------------
	Home.init = function (mapApiKey, initialCenterPoint, initialZoomLevel, boundary, vizualizationID, user, owner, tableOwner, dataTable) {

		// Other 
		initEvents();
		
		// Initializes and renders map
		Map.init(initialCenterPoint, initialZoomLevel, boundary, mapContainer, 0, 0, vizualizationID, user, owner, dataTable);

		// Data service
		DataService.init(tableOwner, dataTable);

		// MVVM init
		initApp();

		setView(uiState.Intro);
		//setView(uiState.SubmitComment);

	}

	//-----------------
	// Private Methods
	//-----------------
	function initEvents() {
		// Window resize
		$(window).on("resize", function (e) {
			$(document).trigger(Home.mapResize);
		});

		// Map loaded
		$(document).on(Home.mapLoaded, function (e) {
			initToolbar();
		});

		// Map editing
		$(document).on(Home.mapEdit, function (e, drawingMode) {			
			setView(uiState.EditRoute, drawingMode);
		});

		// Map ready for comment submission
		$(document).on(Home.mapSubmit, function (e) {
			setView(uiState.SubmitComment);
		});

		// Show intro dialog
		var modelIntro = $("#modalIntro").kendoWindow({
			title: "Changes to Draft Freight Network",
			modal: false,
			visible: false,
			resizable: false,
			actions: [],
			width: 400,
			open: function e() {
				// Wire up custom close button
				$("#modalIntro #closeIntroModelButton").click(function () {
					$("#modalIntro").data("kendoWindow").close();
					EventTracker.addEvent("Starting session", {});
				});
			}
		}).data("kendoWindow").center().open();
	}

	//-----------------
	// Private Events
	//-----------------
	function initApp() {
		
		// View models
		commentViewModel = kendo.observable({
			name: "", 
			email: "",
			comment: "",
			originLatitude: "",
			originLongitude: "",
			destinationLatitude: "",
			destinationLongitude: "",
			geometry: "",
			routeLength: "",
			routeDuration: "",
			feedbackType: 1, 
			userZoom: "",
			userCenterpoint: "",
			getData: function (e) {
				return {
					// Raw data
					name: this.get("name"), 
					email: this.get("email"),
					comment: this.get("comment"),
					originLatitude: this.get("originLatitude"), 
					originLongitude: this.get("originLongitude"), 
					destinationLatitude: this.get("destinationLatitude"), 
					destinationLongitude: this.get("destinationLongitude"),
					geometry: this.get("geometry"),
					routeLength: this.get("routeLength"),
					routeDuration: this.get("routeDuration"),
					feedbackType: this.get("feedbackType"), 
					userZoom: this.get("userZoom"), 
					userCenterpoint: this.get("userCenterpoint")
				};
			},
			submit: function (e) {
				e.preventDefault();

				if (Map.getCurrentDrawingMode() == drawingMode.Line) {
					var routeInfo = Map.getSelectedRouteInfo();

					this.set("originLatitude", routeInfo.originLatitude);
					this.set("originLongitude", routeInfo.originLongitude);
					this.set("destinationLatitude", routeInfo.destinationLatitude);
					this.set("destinationLongitude", routeInfo.destinationLongitude);
					this.set("geometry", routeInfo.geometry);
					this.set("routeLength", routeInfo.routeLength);
					this.set("routeDuration", routeInfo.routeDuration);
					this.set("userZoom", routeInfo.userZoom);
					this.set("userCenterpoint", routeInfo.userCenterpoint);

				
					DataService.addRouteComment(this.getData(), function (result) {
						setView(uiState.Finished);
						EventTracker.addEvent("Added route/comment", {});
					});
				}
				else {
					var markerInfo = Map.getMarkerInfo();

					this.set("originLatitude", markerInfo.originLatitude);
					this.set("originLongitude", markerInfo.originLongitude);
					this.set("userZoom", markerInfo.userZoom);
					this.set("userCenterpoint", markerInfo.userCenterpoint);

					DataService.addMarkerComment(this.getData(), function (result) {
						setView(uiState.Finished);
						EventTracker.addEvent("Added marker/comment", {});
					});
				}
				

			
			},
			cancel: function (e) {
				e.preventDefault();
				setView(uiState.Intro);
			},
			newRoute: function (e) {
				e.preventDefault();
				setView(uiState.Intro);
				EventTracker.addEvent("New route/comment", {});
			}
		});


		// Bind views
		kendo.bind($("#infoToolbarContainer"), commentViewModel);
	}


	function setView(state, drawingMode) {

		if (uiState.Intro == state) {
			$("#infoToolbarContainer div.finished").hide();
			$("#infoToolbarContainer div.edit-route").hide();
			$("#infoToolbarContainer div.submit-route").hide();
			$("#infoToolbarContainer div.intro").show();
			Map.clear();
		}
		else if (uiState.EditRoute == state) {
			$("#infoToolbarContainer div.intro").fadeOut(function () {				
				if (drawingMode == 1) {
					$("#infoToolbarContainer div.edit-route .marker-text").show();
					$("#infoToolbarContainer div.edit-route .route-text").hide();
				}
				else {
					$("#infoToolbarContainer div.edit-route .marker-text").hide();
					$("#infoToolbarContainer div.edit-route .route-text").show();
				}
				
				$("#infoToolbarContainer div.edit-route").fadeIn();
			});
			
			
		}
		else if (uiState.SubmitComment == state) {
			$("#infoToolbarContainer div.edit-route").fadeOut(function () {
				$("#infoToolbarContainer div.submit-route").fadeIn();
			});
			
		}
		else if (uiState.Finished == state) {
			$("#infoToolbarContainer div.submit-route").fadeOut(function () {
				$("#infoToolbarContainer div.finished").fadeIn();
			});
		
			Map.redraw();
		}

	}


	function initToolbar() {
		var infoToolbarContainer = $("#infoToolbarContainer");
		var animationDuration = 1000;

		// Set starting position
		infoToolbarContainer.css("top", -infoToolbarContainer.height() - 20);

		// Animate in
		infoToolbarContainer.animate({ top: 0, queue: false }, animationDuration);
	}

}(window.Home = window.Home || {}));
