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
        marker = new google.maps.Marker(),
        wards = [],
        districts = [],
        infoWindow = new google.maps.InfoWindow(),
        searchForm = document.getElementById('frmMain'),
        geoButton = document.getElementById('geoButton'),
        cityBounds = new google.maps.LatLngBounds();

    // Load and draw wards
    loadJSON('data/City-Ward-Map.json', function (response) {
        data = JSON.parse(response).data;
        
        data.forEach(function (ward) {
            var wardBoundary = ward[8];
            var wardNumber = ward[9];
            wards[wardNumber] = {
                district: ward[10],
                polygon: pointsToPolygon(wardBoundary, wardNumberToHexColor(wardNumber), wardNumberToHexColor(wardNumber))
            };
            addWardClickHandler(wards[wardNumber].polygon, wardNumber, wards[wardNumber].district);
            wards[wardNumber].polygon.setMap(map);
            getBoundsForPolygon(wards[wardNumber].polygon, cityBounds);
        });

        // Load councillor info
        loadJSON('data/Councillors.json', function (response) {
            data = JSON.parse(response);

            data.forEach(function (councillor) {
                if (councillor.hasOwnProperty('wardNumber')) {
                    wards[councillor.wardNumber].councillor = councillor;
                } else if (councillor.hasOwnProperty('district')) {
                    districts[councillor.district] = {
                        councillor: councillor
                    };
                }
            });
        });

        // Load polling place info
        loadJSON('data/Polling-Places.json', function (response) {
            data = JSON.parse(response);

            data.forEach(function (pollingPlace) {
                wards[pollingPlace.ward].pollingPlace = pollingPlace;
            });
        });

        // Load candidates info
        loadJSON('data/Candidates.json', function (response) {
            data = JSON.parse(response);

            data.forEach(function (candidates) {
                wards[candidates.ward].candidates = candidates.candidates;
            });
        });
    });

    // Wire up search box
    searchForm.addEventListener('submit', addressLookup, false);

    // Wire up geolocation API
    if ("geolocation" in navigator) {
        geoButton.style.visibility = 'visible';
        geoButton.addEventListener('click', userGeolocate, false);
    }

    // Supporting functions
    function addressLookup (event, latitude, longitude) {
        event.preventDefault();
        var geocoder = new google.maps.Geocoder;
        if (latitude && longitude) {
            geocoder.geocode({
                location: {
                    lat: latitude,
                    lng: longitude
                },
                bounds: cityBounds
            }, function (results, status) {
                if (status == 'OK') {
                    clickOnPoint(results[0].geometry.location);
                    document.getElementById('txtAddress').value = results[0].formatted_address;
                } else {
                    document.getElementById('results').innerHTML = '<em>Couldn\'t locate an address within the city that matches your geolocation.</em>';
                }
            });
        } else {
            geocoder.geocode({
                address: document.getElementById('txtAddress').value,
                bounds: cityBounds,
            }, function (results, status) {
                if (status == 'OK') {
                    clickOnPoint(results[0].geometry.location);
                } else {
                    document.getElementById('results').innerHTML = '<em>Couldn\'t locate that address within the city.</em>';
                }
            });
        }
        return false;
    }

    function clickOnPoint (point) {
        wards.forEach(function (ward) {
            if (pointInPolygon(point, ward.polygon)) {
                google.maps.event.trigger(ward.polygon, 'click', {
                    latLng: point
                });
            }
        });
    }

    function userGeolocate (event) {
        navigator.geolocation.getCurrentPosition(function (position) {
            console.log(position);
            addressLookup(event, position.coords.latitude, position.coords.longitude);
        });
    }

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
            document.getElementById('results').innerHTML = '';
            marker.setMap(null);
            bounds = getBoundsForPolygon(polygon);
            map.fitBounds(bounds);
            infoWindow.setPosition(event.latLng);
            google.maps.event.addListener(infoWindow, 'closeclick', function (event) {
                map.panTo(mapOptions.center);
                map.setZoom(mapOptions.zoom);
            });
            infoWindow.setContent(getInfoWindowContent(wardNumber));
            infoWindow.open(map);
            marker = new google.maps.Marker({
                position: new google.maps.LatLng({
                        lat: wards[wardNumber].pollingPlace.latitude,
                        lng: wards[wardNumber].pollingPlace.longitude
                    }),
                draggable: false,
                map: map,
                label: wards[wardNumber].pollingPlace.name
            });
            marker.setMap(map);
            document.getElementById('results').innerHTML = getInfoWindowContent(wardNumber, true);
        });
    }

    function getBoundsForPolygon (polygon, bounds) {
        if (!bounds) {
            var bounds = new google.maps.LatLngBounds;
        }
        polygon.getPath().forEach(function(latLng) {
            bounds.extend(latLng);
        });
        return bounds;
    }

    function getInfoWindowContent (wardNumber, includeCandidates) {
        var w = wards[wardNumber];
        var c = districts[w.district];
        var html = '<strong>Ward ' + wardNumber + '</strong><br>' +
               w.councillor.name + '<br>' +
               '<a href="mailto:' + w.councillor.email + '">' + w.councillor.email + '</a>, ' +
               '<a href="tel:' + w.councillor.phone + '">' + w.councillor.phone + '</a><br>' +
               '<a href="' + w.councillor.website + '">Website</a><br><br>' +
               'Polling place: ' + w.pollingPlace.name + ', ' + w.pollingPlace.address + '<br><br>' +
               '<strong>' + w.district + ' District</strong><br>' +
               c.councillor.name + '<br>' +
               '<a href="mailto:' + c.councillor.email + '">' + c.councillor.email + '</a>, ' +
               '<a href="tel:' + c.councillor.phone + '">' + c.councillor.phone + '</a><br>' +
               '<a href="' + w.councillor.website + '">Website</a>';
        if (includeCandidates) {
            html += '<hr><strong>Election 2018 Candidate Information</strong><br>';
            w.candidates.forEach(function (candidate) {
                html += candidate.name + ' (';
                if (candidate.incumbent) {
                    html += 'Incumbent, ';
                }
                html += candidate.party + ')';
                if (candidate.website) {
                    html += ' <a href="' + candidate.website + '">Website</a>';
                }
                html += '<br>';
            });
        }
        return html;
    }
})();
