(function (EventTracker, undefined) {

	//-----------------
	// Private Properties
	//-----------------

	//-----------------
	// Public Methods
	//-----------------
	EventTracker.addEvent = function (eventName, eventData) {
		if (typeof mixpanel !== 'undefined') {
			mixpanel.track(eventName, eventData);
		}
	
	};

}(window.EventTracker = window.EventTracker || {}));
