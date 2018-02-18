(function () {
    // Initialize map
    var mapOptions = {
            zoom: 12,
            minZoom: 12,
            maxZoom: 20,
            center: new google.maps.LatLng(44.489755, -73.220561),
            streetViewControl: true,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.LARGE,
                position: google.maps.ControlPosition.TOP_LEFT
            },
            scaleControl: true,
            scaleControlOptions: {
                position: google.maps.ControlPosition.BOTTOM_LEFT
            },
            panControl: false,
            mapTypeControlOptions: {
                mapTypeIds: ['City Map', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID],
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            },
            navigationControl: true
        },
        map = new google.maps.Map(document.getElementById("map"), mapOptions),
        geocoder = new google.maps.Geocoder(),
        wards = [],
        infoWindow = new google.maps.InfoWindow();

    // Load and draw wards
    loadJSON('data/City-Ward-Map.json', function (response) {
        data = JSON.parse(response).data;
        
        data.forEach(function (ward) {
            var wardBoundary = ward[8];
            var wardNumber = ward[9];
            var district = ward[10];

            wards[wardNumber] = pointsToPolygon(wardBoundary, wardNumberToHexColor(wardNumber), wardNumberToHexColor(wardNumber));
            addWardClickHandler(wards[wardNumber], wardNumber, district);
            wards[wardNumber].setMap(map);
        });
    });

    // Wire up search box

    // Wire up geolocation API

    // Supporting functions
    function loadJSON (path, callback) {   
        var xhr = new XMLHttpRequest();
            xhr.overrideMimeType("application/json");
            xhr.open('GET', path, true);
            xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == "200") {
                callback(xhr.responseText);
            }
        };
        xhr.send(null);  
    }

    function pointsToPolygon (pointString, strokeColor, fillColor) {
        var path = pointStringToPoints(pointString);
        return new google.maps.Polygon({
            paths: path,
            strokeColor: strokeColor,
            strokeOpacity: 0.4,
            strokeWeight: 2,
            fillColor: fillColor,
            fillOpacity: 0.3
        });
    }

    function wardNumberToHexColor (wardNumber) {
        var colors = {
            1: '#ff0000',
            2: '#00ff00',
            3: '#0000ff',
            4: '#ffff00',
            5: '#ff00ff',
            6: '#00ffff',
            7: '#006600',
            8: '#ff9900'
        };
        return colors[wardNumber];
    }

    function pointStringToPoints (pointString) {
        pointString = pointString.replace(/MULTIPOLYGON \({3}([\s\S]+)\){3}/, '$1');
        var path = [];
        pointString.split(', ').forEach(function (point) {
            var latlng = point.split(' ');
            path.push(new google.maps.LatLng(latlng[1], latlng[0]));
        });
        return path;
    }

    function pointInPolygon (point, polygon) {
        return google.maps.geometry.poly.containsLocation(point, polygon);
    }

    function addWardClickHandler (polygon, wardNumber, district) {
        google.maps.event.addListener(polygon, 'click', function (event) {
            infoWindow.close();
            bounds = getBoundsForPolygon(polygon);
            map.fitBounds(bounds);
            infoWindow.setOptions({
                content: 'Ward ' + wardNumber + '<br>' + district + ' District',
                position: event.latLng
            });
            google.maps.event.addListener(infoWindow, 'closeclick', function (event) {
                map.panTo(mapOptions.center);
                map.setZoom(mapOptions.zoom);
            });
            infoWindow.open(map);
        });
    }

    function getBoundsForPolygon(polygon) {
        var bounds = new google.maps.LatLngBounds;
        polygon.getPath().forEach(function(latLng) {
            bounds.extend(latLng);
        });
        return bounds;
    }
})();
