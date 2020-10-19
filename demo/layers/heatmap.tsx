import * as React from 'react';
import { Stamen } from 'ol/source';
import { Vector } from 'ol/source';
import { KML } from 'ol/format';
import { interaction, layer, custom, control, Interactions, Overlays, Controls, Map, Layers, Overlay, Util } from 'react-ol';

let tileSource = new Stamen({
    layer: 'toner'
});

let heatmapSource = new Vector({
    url: 'https://openlayers.org/en/v4.0.1/examples/data/kml/2012_Earthquakes_Mag5.kml',
    format: new KML({
        extractStyles: false
    })
});

export class Heatmap extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="todo">
                TODO: Coming Soon(PR would be highly appreciated)
            </div>
        )

        /*return (
         <div>
         <Map view={{center:[0,0], zoom:1}}>
         <Layers>
         <layer.Tile source={tileSource} />
         <layer.Heatmap source={heatmapSource} blur={15} radius={5} />
         </Layers>
         </Map>
         <pre>{`
         <Map center={[0,0]} view={{center:[0,0], zoom:1}}>
         <Layers>
         <layer.Tile source={tileSource} />
         <layer.Heatmap source={heatmapSource} blur={15} radius={5} />
         </Layers>
         </Map>
         `}</pre>
         </div>
         );*/
    }
}