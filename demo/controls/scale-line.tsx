import * as React from 'react';
import { interaction, layer, custom, control, Interactions, Overlays, Controls, Map, Layers, Overlay, Util } from 'react-ol';

export class ScaleLine extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div style={{height: 600}}>
                <Map>
                    <Layers>
                        <layer.OSM />
                    </Layers>
                    <Controls>
                        <control.ScaleLine />
                    </Controls>
                </Map>
                <pre>{`
        <Map>
          <Layers><layer.OSM/></Layers>
          <Controls>
            <control.ScaleLine />
          </Controls>
        </Map>
        `}</pre>
            </div>
        );
    }
}