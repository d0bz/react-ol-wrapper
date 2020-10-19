import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Tile as OlTile } from 'ol/layer';
import TileGrid from 'ol/tilegrid/TileGrid';
import { XYZ } from 'ol/source';
import { Util } from '../util';

export class Tile extends React.Component<any, any> {

    layer: OlTile;

    properties: any = {
        source: undefined,
        visible: undefined,
        updateFilter: undefined
    };

    static propTypes = {
        /**
         * Define layer params in object
         * @param {String} url tileUrl, eg http://a.tile.stamen.com/toner/{z}/{x}/{y}.png
         * @param {Array} extent[Number,Number,Number,Number] if defined then tilegrid extent
         * @param {Array} resolutions ```<Number>``` if defined then tilegrid resolutions
         */
        properties: PropTypes.object,

        /**
         * Can order layers
         */
        zIndex: PropTypes.number,
    };

    events: any = {
        'change': undefined,
        'change:extent': undefined,
        'change:maxResolution': undefined,
        'change:minResolution': undefined,
        'change:opacity': undefined,
        'change:preload': undefined,
        'change:source': undefined,
        'change:useInterimTilesOnError': undefined,
        'change:visible': undefined,
        'change:zIndex': undefined,
        'postcompose': undefined,
        'precompose': undefined,
        'propertychange': undefined,
        'render': undefined
    };

    constructor(props) {
        super(props);
    }

    render() {
        return null;
    }

    componentDidMount() {
        const self = this;

        if (!this.context.mapComp.map) {
            this.context.mapComp.mapReadyCallbacks.push(() => {
                self.addLayer(self.props);
            });
        } else {
            this.addLayer(this.props);
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    addLayer(props) {
        const self = this;

        self.properties = self.tmsSourceDefinition(props.properties, this.context.mapComp.options.projection.getCode());

        if (props.properties.maxScale) {
            self.properties.maxResolution = Util.getResolutionForScale(props.properties.maxScale, this.context.mapComp.options.projection.getUnits());
        }

        if (props.properties.minScale) {
            self.properties.minResolution = Util.getResolutionForScale(props.properties.minScale, this.context.mapComp.options.projection.getUnits());
        }

        self.layer = new OlTile(self.properties);
        self.context.mapComp.map.addLayer(self.layer);

        if (props.zIndex) {
            self.layer.setZIndex(props.zIndex);
        }

        if (props.layerKey) {
            self.layer.set("key", props.layerKey);
        }


        let olEvents = Util.getEvents(self.events, props);
        for (let eventName in olEvents) {
            self.layer.on(eventName, olEvents[eventName]);
        }

    }

    tmsSourceDefinition(layerProperties, projection) {
        let xyzProperties = {
            projection: projection,
            url: layerProperties.url,
            tileGrid: undefined,
            attributions: layerProperties.attributions || null
        };

        if (layerProperties.extent) {
            xyzProperties.tileGrid = new TileGrid({
                extent: layerProperties.extent,
                minZoom: 3,
                resolutions: layerProperties.resolutions,
            })
        }

        return Object.assign({}, {
            visible: true,
            source: new XYZ(xyzProperties)
        }, layerProperties)
    };

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(Map)
    };
}