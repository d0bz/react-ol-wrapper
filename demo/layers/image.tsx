import * as React from "react";
import * as ReactDOM from "react-dom";

import Projection from 'ol/proj/Projection';
import { getCenter } from 'ol/extent';

import {
    interaction, layer, custom, control, //name spaces
    Interactions, Overlays, Controls,     //group
    Map, Layers, Overlay, Util    //objects
} from "react-ol";

var extent: any = [0, 0, 1024, 968];
var projection = new Projection({
    code: 'xkcd-image',
    units: 'pixels',
    extent: extent
});
var view = {
    projection: projection,
    center: getCenter(extent),
    zoom: 2,
    maxZoom: 9
};

export class Image extends React.Component<any,any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Map view={view}>
                    <Layers>
                        <layer.Image properties={{
                            attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
                            url: 'https://imgs.xkcd.com/comics/online_communities.png',
                            projection: projection,
                            imageExtent: extent
                        }}/>
                    </Layers>
                </Map>
                <pre>{`
          <Map view={view}>
                    <Layers>
                        <layer.Image properties={{
                            attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
                            url: 'https://imgs.xkcd.com/comics/online_communities.png',
                            projection: projection,
                            imageExtent: extent
                        }}/>
                    </Layers>
                </Map>
        `}</pre>
            </div>
        );
    }
}