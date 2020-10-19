import * as React from "react";
import {
  interaction, layer, custom, control, //name spaces
  Interactions, Overlays, Controls,     //group
  Map, Layers, Overlay, Util    //objects
} from "react-ol";

export class FullScreen extends React.Component<any,any> {
  constructor(props) {super(props);}

  render(){
    return (
      <div>
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.FullScreen />
          </Controls>
        </Map>
        <pre>{`
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.FullScreen />
          </Controls>
        </Map>
        `}</pre>
      </div>
    );
  }
}