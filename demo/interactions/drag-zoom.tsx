import * as React from "react";
import {
  interaction, layer, custom, control, //name spaces
  Interactions, Overlays, Controls,     //group
  Map, Layers, Overlay, Util    //objects
} from "react-ol";

export class DragZoom extends React.Component<any, any> {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div className="todo">
        TODO: Coming Soon(PR would be highly appreciated)
      </div>
    );
  }
}