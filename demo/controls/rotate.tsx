import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ol from 'openlayers';
import {
  interaction, layer, custom, control, //name spaces
  Interactions, Overlays, Controls,     //group
  Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class Rotate extends React.Component<any,any> {
  constructor(props) {
    super(props);
  }

  render(){
    return (
      <div>
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.Rotate />
          </Controls>
        </Map>
        Use Alt+Shift+Drag to rotate the map.
        <pre>{`
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.Rotate />
          </Controls>
        </Map>
        `}</pre>
      </div>
    );
  }
}