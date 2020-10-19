import * as React from 'react';
import VectorTile from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { createXYZ } from 'ol/tilegrid';
import { interaction, layer, custom, control, Interactions, Overlays, Controls, Map, Layers, Overlay, Util } from 'react-ol';

var key = 'pk.eyJ1IjoiYWxsZW5od2tpbSIsImEiOiJjajBlbzkzazYwMWh1Mndya3R2amw0ang1In0.QU0YtPQ0-IgHMLt574HGlw';
var source = new VectorTile({
    projection: undefined,
    attributions: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
    '© <a href="https://www.openstreetmap.org/copyright">' +
    'OpenStreetMap contributors</a>',
    format: new MVT(),
    tileGrid: createXYZ({ maxZoom: 22 }),
    tilePixelRatio: 16,
    url: 'https://free-0.tilehosting.com/data/v3/{z}/{x}/{y}.pbf?key=tXiQqN3lIgskyDErJCeY'
    ///url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.vector.pbf?access_token=' + key
});

var view = {
    center: [732602.1417165294, 5864590.06411005],
    resolution: 2445,
    maxResolution: 78271.51696402048
};

export class VectorTile2 extends React.Component<any,any> {

    constructor(props) {
        super(props);
        this.state = { style: undefined };
    }

    addLayerStyle = function (layer) {
        fetch('https://openmaptiles.github.io/klokantech-basic-gl-style/style-cdn.json')
            .then(function (response) {
                response.json().then(function (glStyle) {
                    //let styleFunc = mb2olstyle.default(glStyle, 'openmaptiles');
                    //layer.setStyle(styleFunc);
                    // applyStyle(layer, glStyle, 'openmaptiles').then(function() {
                    //   console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxx')
                    //   // map.addLayer(layer);
                    // });
                });
            });
    }

    render() {

        return (
            <div className="todo">
                TODO: Coming Soon(PR would be highly appreciated)
            </div>
        )

        /*return (
         <div>
         <Map view={view}>
         <Layers>
         <layer.VectorTile source={source} callback={this.addLayerStyle} />
         </Layers>
         </Map>
         </div>
         );*/
    }
}
