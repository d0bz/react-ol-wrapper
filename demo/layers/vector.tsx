import * as React from "react";
import {
  interaction, layer, custom, control, type, //name spaces
  Interactions, Overlays, Controls,     //group
  Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

let coordinates = [24.761769696908118,59.43256023120438];
let iconFeature = new type.Feature({wkt: `POINT(${coordinates[0]} ${coordinates[1]})`, projection: "EPSG:4326"});
let extentAroundCoordinates: [number,number,number,number] = Util.createExtentFromLonLat(coordinates[0], coordinates[1], 100);
let extent = Util.transformExtent(extentAroundCoordinates, "EPSG:4326", "EPSG:3857");


let style = new type.Style({
    imageSrc: "https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png",
    opacity: 0.7,
    scale: 0.2
});

export class Vector extends React.Component<any,any> {
  constructor(props) {
    super(props);
  }

  render(){
    return (
      <div>
        <Map extent={extent}>
          <Layers>
            <layer.OSM/>
            <layer.Vector features={[iconFeature]} style={style} zIndex="1"/>
          </Layers>
        </Map>
        <pre>{`
        <Map>
          <Layers>
            <layer.OSM/>
            <layer.Vector features={[iconFeature]} style={style} zIndex="1"/>
          </Layers>
        </Map>
        `}</pre>
      </div>
    );
  }
}