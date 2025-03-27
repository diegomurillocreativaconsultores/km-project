import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths for leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function Mapping() {
  const [markers, setMarkers] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // Default to center of USA
  const [loading, setLoading] = useState(true);

  // Hardcoded addresses extracted from the CSV file.
  // If you have additional addresses, add them here.
  const addresses = [
    "6116 Shallowford Rd, Chattanooga, Tennessee 37421",
    "40 & 42 44th st SW Kenowa Plaza, Grandville, MI 49418",
    "1700 Union Street, Suite B, Baltimore, MD 21211",
    "235 E CHICAGO ST STE 3 COLDWATER MI 49036",
    "538 Brandies Cir Suite 102 Murfreesboro, TN 37128-8421",
    "9140 Guilford Rd, Suite O, Columbia, Maryland 21046",
    "75 Valencia Ave, Suite 1120 Coral Gables, FL 33134 USA",
    "29429 John R Road, Madison Heights, Michigan 48071",
    "75 Valencia Ave, Suite 1120, Coral Gables, FL 33134, US",
    "440 Stuart Rd, Suite 2, Cleveland, Tennessee, 37312",
    "440 Stuart Rd NE Suite 2 Cleveland, TN 37312",
    "PO BOX 730, Brooklandville, Maryland 21022",
    "185 Harry S Truman Parkway, Suite 105, Annapolis, Maryland 21401",
    "12164 Tech Rd, Silver Spring, MD 20904",
    "1500 S Douglas Rd, Suite 230, Coral Gables, Florida 33134",
    "400 West Avenue, Rochester, NY 14611, USA",
    "104 Glen Oak Boulevard, Suite 120, Hendersonville, TN 37075",
    "104 Glen Oak Blvd SUITE 120 Hendersonville, Tennessee 37075",
    "5949 Harbour Park Dr, Midlothian, Virginia 23112",
    "3855 Centerview #400B, Chantilly, VA 20151",
    "1716 Corporate Crossing Suite 3 O'Fallon, IL 62269",
    "19540-42 Amaranth Drive, Germantown, MD 20874",
    "8530 Cinder Bed Rd STE 1300 Lorton, VA 22079",
    "Acorn Health, Inc. – O'Fallon Center 6 Eagle Center Suite 1 O'Fallon, IL 62269",
    "6990A Snowdrift Rd, Building A, Allentown, PA 18106",
    "19540 Amaranth Dr, Germantown, MD 20874",
    "722 West County rd suite F, Jerseyville, IL 62052",
    "400 West Avenue Rochester, NY 14611 USA",
    "13900 Lincoln Park Drive, Suite 500 Herndon, VA 20171",
    "2 Crossing Way, Suite J, Owings Mills, MD 21117",
    "1700 Union Avenue, Suite B, Baltimore, MD 21211",
    "PO BOX 730, BROOKLANDVILLE, MD 21022",
    "538 Brandies Cir, Suite 102, Murfreesboro, Tennessee 37128",
    "12164 Tech Rd, Silver Springs, Maryland 20904",
    "75 Valencia Ave, Suite 1120 Coral Gables, FL 33134 US",
    "624 Grassmere Park, Suite #11, Nashville, Tennessee 37211",
    "6312 Kingston Pike, Suite C, Knoxville, TN 37919",
    "6116 Shallowford Road, Suite 119, Chattanooga, TN 37421",
    "104 Glen Oak Blvd, suite 120 Hendersonville TN",
    "42 44th St SW, Grandville, Michigan 49418",
    "185 Harry S Truman Parkway, suite 104-106, Annapolis, MD 21401",
    "1500 Douglas Road suite 230, Coral Gables, FL 33134",
    "1700 Union Avenue Suite B Baltimore, MD 21211",
    "1700 Union Avenue STE B Baltimore MD 21211",
    "3349 Century Center St. SW, Suite 3353, Grandville, Michigan 49418",
    "2965 Fort Campbell Boulevard suite 600 Clarkesville, TN",
    "29429 John R Road, Madison Heights, Michigan, 48071",
    "1700 Union Ave, Suite B, Baltimore, Maryland 21211",
    "5821 W Maple Road suite 195, West Bloomfield Township, MI 48322",
    "1700 Union Ave STE В Baltimore,, MD 21211",
    "13650 W. Colonial Drive, Suite 150, Winter Garden, FL 34787",
    "1421 Clarkview Rd, Suite 130, Baltimore, MD 21209",
    "5500 Cherokee Ave STE 120 Alexandria, VA 22312",
    "8530 Cinder Bed Rd Suite 1300, Lorton VA 22079",
    "31225 Jefferson Ave., St. Claire Shores, MI 48082",
    "1500 S Douglas Road, Ste 230, Coral Gables, FL 33134",
    "3855 Centerview #400B Chantilly, Virginia 20151",
    "3122 Commerce Pkwy, Miramar, Florida 33025",
    "13900 Lincoln Park Drive Suite 500 Herndon, VA 20171",
    "2000 N Alafaya Trl Ste 200, Orlando, FL 32826",
    "235 E CHICAGO ST, COLDWATER, MI 49036",
    "3122 Commerce Parkway, Miramar, FL 33025",
    "970 Town Center Drive Building C Langhorne, PA 19047",
    "624 Grassmere Park Dr, Suite 11, Nashville, TN 37211",
    "5500 Cherokee Ave., Suite 120, Alexandria, VA 22312",
    "400 West Avenue, Rochester, NY 14611-2538",
    "8530 Cinder Bed rd suite 1300, Lorton, VA 22079",
    "19540 Amaranth Drive, Germantown, Maryland 20874",
    "2000 N. Alafaya Trail, Suite 200, Orlando, FL 32826",
    "1000 E PARIS AVE SE, STE 160, GRAND RAPIDS, MI 49546",
    "538 Brandies Cir, #101, Murfreesboro, Tennessee 37128",
    "400 St. Louis Street, Suite 1, Edwardsville, IL 62025",
    "3349 Century Center St. SW, Suite 3353, Grandville, MI 49418",
    "877 Baltimore Annapolis Blvd, Suite 100, Severna Park, MD 21146",
    "877 Baltimore Annapolis Blvd., Suite 100, Severna Park, MD 21146",
    "9140 Guilford Road suite O, Columbia, MD 21046",
    "42 44th St SW, Grandville, Michigan, 49418",
    "3353 Century Center St. SW, Suite 3353, Grandville, Michigan 49418",
    "3855 Centerbiew Drive suite 400B, Chantilly, VA 20151",
    "1700 Union Avenue STE B Baltimore, MD 21211",
    "1700 Union Avenue, Suite B Baltimore, MD 21211",
    "1500 Douglas Road, Suite 230, Coral Gables, FL 33134",
    "75 Valencia Ave, Suite 1120, Coral Gables, FL 33134",
    "6990A Snowdrift Rd Building A Allentown, PA 18106",
    "538 Brandies Circle suite 101, Murfreesboro, TN 37128",
    "1700 Union Ave, Suite B, Baltimore, MD 21211",
    "5020 Gunn Highway, Suite 250, Tampa, FL 33624",
    "1700 Union Ave Suite B Baltimore, MD 21211",
    "890 Airport Park Rd., suite 100, Glen Burnie, MD 21061",
    "120 Everest Lane, St Johns, Florida 32259",
    "5821 W Maple Rd, Suite 195, West Bloomfield Township, Michigan 48322",
    "1716 Corporate Crossing suite 3, O'Fallon, IL 62269",
    "5300 W Michigan Ave, Ypsilanti, Michigan 48082",
    "970 Town Center Drive, Building C, Langhorne, PA 19047",
    "45 W Sego Lily Dr, #220, Sandy, UT 84070",
    "538 Brandies Cir Suite 101 Murfreesboro, TN 37128-8421",
    "1700 Union Ave Suite B Baltimore, Maryland 21211"
  ];

  useEffect(() => {
    async function geocodeAddresses() {
      let markerList = [];
      for (const address of addresses) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            markerList.push({ address, position: [lat, lon] });
          }
        } catch (error) {
          console.error("Error geocoding address:", address, error);
        }
        // Delay between requests to respect Nominatim's usage policy.
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setMarkers(markerList);
      if (markerList.length > 0) {
        const avgLat = markerList.reduce((sum, marker) => sum + marker.position[0], 0) / markerList.length;
        const avgLon = markerList.reduce((sum, marker) => sum + marker.position[1], 0) / markerList.length;
        setMapCenter([avgLat, avgLon]);
      }
      setLoading(false);
    }

    geocodeAddresses();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Customer Locations Map</h1>
      {loading && <p>Loading and geocoding addresses, please wait...</p>}
      <div style={{ height: "600px", marginTop: "20px" }}>
        <MapContainer center={mapCenter} zoom={4} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, idx) => (
            <Marker key={idx} position={marker.position}>
              <Popup>{marker.address}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default Mapping;