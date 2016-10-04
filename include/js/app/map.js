(function (Map, undefined) {

	//-----------------
	// Private Properties
	//-----------------
	var mapApi = null;
	var isMapLoaded = false;
	var mapContainer;
	var mapBoundary;
	var mapArguments;
	var username;
	var owner;
	var mapEditRouteLayer;
	var mapEditMarkerLayer;
	var mapExistingRouteLayer;
	var mapExistingMarkerLayer;
	var mapGeometrySelection = null;
	var mapRouteGeometry = "";
	var mapRouteDuration = 0;
	var mapRouteLength = 0;
	var mapTable;
	var drawControl;
	var originIcon;
	var destinationIcon;
	var originMarker;
	var destinationMarker;
	var markerIcon;
	var initialCenterPoint = {};
	var mapWidthOffset = 0;
	var mapHeightOffset = 0;
	var mapVizualizationID = "";
	var screenWidth = 0;
	var screenHeight = 0;
	var editPointsDrawn = 0;
	var vizLayer;
	var isDialogOpen = false;
	var currentDrawingMode;
	var drawingMode = {
		None: 0, 
		Marker: 1,
		Line: 2
	};


	//-----------------
	// Public Properties
	//-----------------

	//-----------------
	// Public Methods
	//-----------------
	Map.init = function (centerPoint, zoomLevel, boundary, container, widthOffset, heightOffset, vizualizationID, user, vizOwner, dataTable) {
		initialCenterPoint = centerPoint;
		initialZoomLevel = zoomLevel;
		mapBoundary = boundary;
		mapContainer = $("#" + container);
		mapWidthOffset = widthOffset;
		mapHeightOffset = heightOffset;
		mapVizualizationID = vizualizationID;
		username = user;
		owner = vizOwner,
		mapTable = dataTable;
		currentDrawingMode = drawingMode.None;

		Map.onMapLoaded();
	};

	Map.zoomToLocation = function (latitude, longitude, zoom, callback) {
		if (mapApi != null) {
			// Close any pop-ups first
			mapApi.closePopup();

			mapApi.setView(new L.LatLng(latitude, longitude), zoom, {
				animate: true
			});
		}

	};

	Map.getSelectedRouteInfo = function () {		

		return {
			originLatitude: originMarker.getLatLng().lat,
			originLongitude: originMarker.getLatLng().lng,
			destinationLatitude: destinationMarker.getLatLng().lat,
			destinationLongitude: destinationMarker.getLatLng().lng,
			geometry: mapRouteGeometry,
			routeLength: mapRouteLength,
			routeDuration: mapRouteDuration,
			userZoom: mapApi.getZoom(),
			userCenterpoint: mapApi.getCenter().lat.toString() + "," + mapApi.getCenter().lng.toString()
		};
	};

	Map.getMarkerInfo = function () {

		return {
			originLatitude: originMarker.getLatLng().lat,
			originLongitude: originMarker.getLatLng().lng,			
			geometry: mapRouteGeometry,		
			userZoom: mapApi.getZoom(),
			userCenterpoint: mapApi.getCenter().lat.toString() + "," + mapApi.getCenter().lng.toString()
		};
	};

	Map.getCurrentDrawingMode = function () {
		return currentDrawingMode;
	};

	Map.clear = function () {
		clearMapGeometrySelection();
		clearDrawing();
		editPointsDrawn = 0;

		if (drawControl) {
			drawControl.setDrawingOptions({
				draw: true
			});
		}

		$("a.leaflet-draw-draw-marker").show();
	}

	Map.redraw = function () {
		if (vizLayer != null) {
			vizLayer.invalidate();
		}
		clearDrawing();
	};


	//-----------------
	// Events
	//-----------------
	Map.onMapLoaded = function () {
		screenWidth = getScreenWidth();
		screenHeight = getScreenHeight();

		createMap();
	};


	Map.onResizeMap = function () {
		var currentScreenWidth = getScreenWidth();
		var currentScreenHeight = getScreenHeight();

		if ((currentScreenWidth != screenWidth) || (currentScreenHeight != screenHeight)) {
			resizeMap();
			screenWidth = currentScreenWidth;
			screenHeight = currentScreenHeight;
		}
	};


	//-----------------
	// Private Methods
	//-----------------

	function getScreenWidth() {
		return $(window).width();
	}

	function getScreenHeight() {
		return $(window).height();
	}

	function resizeMap() {
		//mapWidthOffset = 0;
		//mapContainer.width(getScreenWidth() - (mapWidthOffset > 0 ? mapWidthOffset : 0));
		//mapContainer.height(getScreenHeight() - (mapHeightOffset > 0 ? mapHeightOffset : 0));
	}

	function createMap() {

		cartodb.createVis(mapContainer, 'http://' + owner + '.carto.com/u/' + username + '/api/v2/viz/' + mapVizualizationID + '/viz.json', {
			shareable: false,
			title: false,
			description: false,
			search: false, // Add manually
			zoomControl: true,
			scrollwheel: true,
			fullscreen: false,
			tiles_loader: true,
			center_lat: initialCenterPoint.latitude,
			center_lon: initialCenterPoint.longitude,
			zoom: initialZoomLevel
		})
		.done(function (vis, layers) {
			// Get refereence to Leaflet api after load
			mapApi = vis.getNativeMap();

			// Set bounds
			//mapApi.setMaxBounds(mapBoundary);

			// Existing routes
			vizLayer = layers[1]; // Stored in second layer
			mapExistingRouteLayer = vizLayer.getSubLayer(1);
			mapExistingMarkerLayer = vizLayer.getSubLayer(2);

			// Dialog window templates (using underscore)
			mapExistingRouteLayer.infowindow.set('template_type', 'underscore');
			mapExistingRouteLayer.infowindow.set('template', $('#editRouteTemplate').html());
			mapExistingMarkerLayer.infowindow.set('template_type', 'underscore');
			mapExistingMarkerLayer.infowindow.set('template', $('#editMarkerTemplate').html());

			// Layer clicks
			addLayerInteraction(mapExistingRouteLayer, mapTable);
			addLayerInteraction(mapExistingMarkerLayer, mapTable);

			// Set max/min zoom
			vis.map.set({
				minZoom: 8,
				maxZoom: 18
			});	

			// Hide preloader
			if (!isMapLoaded) {
				$(document).trigger(Home.mapLoaded);
			}

			// Prevent subsequent calls
			isMapLoaded = true;


			// Markers
			originIcon = L.divIcon({ className: 'marker-origin' });
			destinationIcon = L.divIcon({ className: 'marker-destination' });
			markerIcon = L.icon({ iconUrl: 'images/marker_point.svg', iconAnchor: [10, 37], className: 'marker-point' });

			// Initialize the FeatureGroup to store editable layers (markers)
			mapEditMarkerLayer = new L.FeatureGroup();
			mapApi.addLayer(mapEditMarkerLayer);

			// Route line
			mapEditRouteLayer = new L.FeatureGroup();
			mapApi.addLayer(mapEditRouteLayer);

			drawControl = new L.Control.Draw({
				position: 'topright',
				draw: {
					polyline: {
						maxVertices: 2,
						repeatMode: false,
						shapeOptions: {
							color: '#000000',
							opacity: .3,
							dashArray: 'none'
						
						},
						showLength: false,
						icon: new L.DivIcon({
							iconSize: new L.Point(8, 8),
							className: 'leaflet-div-icon marker-line-point'
						}),
					},
					polygon: false,
					rectangle: false,
					circle: false,
					marker: {
						icon: markerIcon
					}
				},
				edit: {
					featureGroup: mapEditMarkerLayer,
					remove: false,
					polyline: {
						shapeOptions: {
							color: '#000000',
							weight: 3,
							dashArray: 'none'
						}
					}
				
								

				}
			});
			mapApi.addControl(drawControl);

			// Initial map events
			initMapEvents();
		});

		// Resize
		resizeMap();
	}

	function addLayerInteraction(layer, tableName) {

		layer.on("featureClick", function (e, latlng, pos, data, layerIndex) {
			isDialogOpen = true;

			// Clear previous selection
			clearMapGeometrySelection();

			var id = data.cartodb_id;

			// Request geometry of polygon with this ID
			$.getJSON("http://" + username + ".cartodb.com/api/v2/sql?format=GeoJSON&q=SELECT%20the_geom%20FROM%20" + tableName + "%20WHERE%20cartodb_id=" + id).done(function (poly) {
				L.geoJson(poly, {
					style: {
						color: "#fcfe5c",
						weight: 6,
						opacity: 1
					},
					onEachFeature: function(feature, layer){
						// lets you remove this layer after another polygon is selected
						mapGeometrySelection = layer;
					}
				}).addTo(mapApi);
			});
		});
	}

	function updateEditMode(layer) {
		if (currentDrawingMode == drawingMode.Marker) {
		
			
		}
		else if (currentDrawingMode == drawingMode.Line) {
			
			if (editPointsDrawn == 0) {
				L.drawLocal.draw.handlers.polyline.tooltip.start = "Click map to place route origin";
				
				L.drawLocal.edit.toolbar.buttons.edit = "Edit route.";
				
				$("div.leaflet-draw-toolbar a.leaflet-draw-draw-polyline").attr("title", "Draw route");
				
			}
			else if (editPointsDrawn == 1) {				
				L.drawLocal.draw.handlers.polyline.tooltip.cont = "Click map to place route destination";
				$("div.leaflet-draw-toolbar a.leaflet-draw-draw-marker").attr("title", "Draw route destination");
				drawControl.setDrawingOptions({
					marker: {
						icon: destinationIcon
					}
				});
				//originMarker = layer;
			}
			else if (editPointsDrawn == 2) {
				//destinationMarker = layer;			
			}
		}
		else { // None
			L.drawLocal.draw.handlers.polyline.tooltip.start = "Click map to place route origin";
			$("div.leaflet-draw-toolbar a.leaflet-draw-draw-polyline").attr("title", "Draw route");
			$("div.leaflet-draw-toolbar a.leaflet-draw-draw-marker").attr("title", "Draw marker");
		}

	}

	function setMarker(layer) {
		var originLatLng = layer.getLatLng();
		
		originMarker = L.marker(originLatLng, { draggable: true, icon: originIcon }).addTo(mapApi);
		originMarker.on('dragend', onMarkerDrag);
	}

	function setRoute(layer) {
		
		var routeLatLngs = layer.getLatLngs();
		
		var originLatLng = routeLatLngs[0];
		var destinationLatLng = routeLatLngs[1];

		originMarker = L.marker(originLatLng, { draggable: true, icon: originIcon }).addTo(mapApi);
		destinationMarker = L.marker(destinationLatLng, { draggable: true, icon: destinationIcon }).addTo(mapApi);
		originMarker.on('dragend', onMarkerDrag);
		destinationMarker.on('dragend', onMarkerDrag);
		
		drawRoute();
	}

	function drawRoute() {
		DataService.getRoute(originMarker.getLatLng().lat, originMarker.getLatLng().lng, destinationMarker.getLatLng().lat, destinationMarker.getLatLng().lng, function (data) {
			if (mapEditRouteLayer) {
				mapApi.removeLayer(mapEditRouteLayer);
			}

			mapEditRouteLayer = L.geoJson(data, {
				style: function (feature) {
					return {
						className: 'path-' + feature.properties.mode
					}
				},
				onEachFeature: function (feature, layer) {
					pathCar = layer;
					layer.className = 'path-' + feature.properties.mode;
					if (feature.properties.mode == "car") {
						mapRouteGeometry = "'" + JSON.stringify(feature.geometry) + "'";
						mapRouteDuration = feature.properties.duration;
						mapRouteLength = feature.properties['length'];
					}
				}
			}).addTo(mapApi);
		});
	}

	function initMapEvents() {
	
		// Drawing events
		//mapApi.on('draw:created', function (e) {
		//	console.log('draw:created');
						
		//	if (editPointsDrawn <= 1) {
		//		mapEditMarkerLayer.addLayer(e.layer);	
		//		editPointsDrawn++;
		//		updateEditMode(e.layer);
				
		//		if (editPointsDrawn == 1) {
		//			$(document).trigger(Home.mapSubmit);

		//			drawControl.setDrawingOptions({
		//				draw: {
		//					marker: false
		//				}
		//			});

		//			$("a.leaflet-draw-draw-marker").hide();
		//		}
		//		else {
		//			$(document).trigger(Home.mapEdit, [currentDrawingMode]);
		//		}
		//	}
		//	console.log(currentDrawingMode);
		//});

		// Drawing events
		mapApi.on('draw:drawvertex', function (e) {		
			//console.log('draw:drawvertex');
			
			if (editPointsDrawn < 2) {				
				editPointsDrawn++;
				//mapEditMarkerLayer.addLayer(e.layer);	
				updateEditMode(e.layer);			
				$(document).trigger(Home.mapEdit, [currentDrawingMode]);
			}
			
		});

		mapApi.on('draw:drawstart', function (e) {
			Map.clear();
			currentDrawingMode = e.layerType == "marker" ? drawingMode.Marker : drawingMode.Line
			//console.log('draw:drawstart', currentDrawingMode);		
			$(document).trigger(Home.mapEdit, [currentDrawingMode]);
		});

		//mapApi.on('draw:drawstop', function (e) {
		//	console.log('draw:drawstop');
		//	console.log("editPointsDrawn = " + editPointsDrawn);
		//	console.log("currentDrawingMode = " + currentDrawingMode);
		//	console.log(drawControl);
		//	if ((currentDrawingMode == drawingMode.Line) && (editPointsDrawn == 2)) {
		//		drawEditRoute();
		//		console.log("trigger map submit");
		//		$(document).trigger(Home.mapSubmit);
		//	}
		//	else if ((currentDrawingMode == drawingMode.Marker) && (editPointsDrawn == 1)) {
		//		$(document).trigger(Home.mapSubmit);
		//	}
		
		//});

		mapApi.on('draw:created', function (e) {
		
			if ((currentDrawingMode == drawingMode.Line) && (editPointsDrawn == 2)) {
				setRoute(e.layer);				
				$(document).trigger(Home.mapSubmit);
			}
			else if (currentDrawingMode == drawingMode.Marker) {
				$(document).trigger(Home.mapSubmit);				
				setMarker(e.layer);
			}
			
		});


		// Close dialog when map is clicked on
		mapContainer.click(closeDialog);

		// Listen to resize
		$(document).bind(Home.mapResize, Map.onResizeMap);

		// Close dialog on esc key press
		$(document).keyup(function(e) {
			if (e.keyCode == 27) {
				closeDialog();
			}
		});

		updateEditMode();
	}

	function onMarkerDrag(e) {
		// Only draw route when destination marker exists
		if (destinationMarker != null) {
			drawRoute();
		}
		
	}

	function closeDialog() {

		setTimeout(function() {
			if (!isDialogOpen) {
				if (mapApi != null) {
					if (vizLayer.infowindow) {
					vizLayer.infowindow.set('visibility', false);
						clearMapGeometrySelection();
					}
				}
			}
			isDialogOpen = false;
		}, 250);
	}


	function clearDrawing() {
		if (mapEditRouteLayer) {
			mapApi.removeLayer(mapEditRouteLayer);
		}
		if (mapEditMarkerLayer) {
			mapEditMarkerLayer.clearLayers();
		}
		if (originMarker) {
			mapApi.removeLayer(originMarker);
			originMarker = null;
		}
		if (destinationMarker) {
			mapApi.removeLayer(destinationMarker);
			destinationMarker = null;
		}
		if (mapExistingRouteLayer) {
			mapApi.removeLayer(mapExistingRouteLayer);
		}
		currentDrawingMode = drawingMode.None;
	}
	function clearMapGeometrySelection() {
		if (mapGeometrySelection){
			mapApi.removeLayer(mapGeometrySelection);
		}
	}
}(window.Map = window.Map || {}));
