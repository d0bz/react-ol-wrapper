import * as React from "react";
import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-openlayers";

export class Attribution extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Map>
                    <Layers>
                        <layer.OSM/>
                    </Layers>
                    <Controls attribution={true} zoom={false}>
                        <control.Attribution collapseLabel="I'm the greatest map in the world"/>
                    </Controls>
                </Map>
                <pre>{`
        <Map>
            <Layers>
                <layer.OSM/>
            </Layers>
            <Controls attribution={false} zoom={false}></Controls>
        </Map>
        `}</pre>
            </div>
        );
    }
}