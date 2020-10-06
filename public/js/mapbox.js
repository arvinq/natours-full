/* eslint-disable */

// Sine this JS is injected at the beginning of template essentially, at the beginning of html, DOM might not be already loaded. so accessing the document will be erroneous

console.log('Hello from the client side - Mapbox');

export const displayMap = (locations) => {
  console.log(locations);

  mapboxgl.accessToken =
    'pk.eyJ1IjoiYXJ2aW5xIiwiYSI6ImNrZnBha2ZoZDA1b2syc3BnY2o1bmE0czEifQ.ZOw8e4kOB7BXWbGoJZzsfA';

  // the container is set to map because it will put the map on an element with map as the id.
  // style is copied from mapbox's design your own map. The other options are from Mapbox's documentation: https://docs.mapbox.com/mapbox-gl-js/api/map/
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/arvinq/ckfpbmr9b0wzn1anrs0qbe22i',
    scrollZoom: false,
    // above will prevent map to zoom
    //   center: [-117.85558, 33.730557],
    //   zoom: 8,
  });

  //the area that will be displayed on the map.
  //mongoDB expects long first before lat, same here in mapbox.
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create the html marker element to customize the mapbox marker
    const el = document.createElement('div');
    el.className = 'marker';

    //in here we are creating a mapbox marker using the
    //html marker element that we created. Then anchoring it's
    //bottom so that the bottom will point at the exact location in the map.
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates) //set the long and lat from loc's coordinates
      .addTo(map); //then add the marker to our map created above.

    // now we want to add a popup to display some important info of the location
    // we can define the offset option to place the popup somewhere above the location.
    //just like in marker, we add in the lng lat coordinates,
    // we also need to define the html for the popup. This is just a simple paragraph containing the location's description.
    //see docs for more options.
    new mapboxgl.Popup({
      offset: 40,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //extends the map's bounds to include the current location
    bounds.extend(loc.coordinates);
  });

  //fitBounds, animates the map and moves and zoom the map right to the bounds
  //to actually fit our markers.
  //we can also specify some number of pixels so that elements in our frontend is not overlapping
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
