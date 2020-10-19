import * as React from "react";
import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";

//AppOverlay to avoid conflict to Overlay
export class AppOverlay extends React.Component<any,any> {
    constructor(props) {
        super(props);

        this.state = {
            pos: [0, 0],
            visible: false
        };
    }

    showPopup = (coordinate) => {
        this.setState({
            pos: coordinate,
            visible: true
        })
    };

    hidePopup = () => {
        this.setState({
            visible: false
        })
    };

    render() {
        return (
            <div>
                <h1>
                    !!! Currently bindings inside popup won't work, prepare and forgot!!!
                </h1>
                <Map onClick={this.showPopup}>
                    <Layers>
                        <layer.OSM />
                    </Layers>
                    <Overlays>
                        { this.state.visible &&
                        <Overlay position={this.state.pos} onClose={this.hidePopup}>
                           <div>
                               <p>You clicked here:</p>
                               <code>
                                   {this.state.pos[0]}, {this.state.pos[1]}
                               </code>
                           </div>
                        </Overlay>
                        }
                    </Overlays>
                </Map>
            </div>
        );
    }
}