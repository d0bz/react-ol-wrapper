import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ol from 'openlayers';
import {
  interaction, layer, custom, control, //name spaces
  Interactions, Overlays, Controls,     //group
  Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class MousePosition extends React.Component<any,any> {
  constructor(props) {
    super(props);
  }

  render(){
    return (
      <div>
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.MousePosition />
          </Controls>
        </Map>
        <pre>{`
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.MousePosition />
          </Controls>
        </Map>
        `}</pre>
      </div>
    );
  }
}