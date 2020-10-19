import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

import { Util } from "../util";

export class OSM extends React.Component<any, any> {

    layer: TileLayer;

    static propTypes = {
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

    addLayer(props) {
        const self = this;
        let options = {
            source: undefined
        };

        let source = new OSM({});
        options.source = source;
        self.layer = new TileLayer(options);
        if (props.zIndex) {
            self.layer.setZIndex(props.zIndex);
        }

        if (props.layerKey) {
            self.layer.set("key", props.layerKey);
        }

        self.context.mapComp.map.addLayer(this.layer);

        let olEvents = Util.getEvents(self.events, props);
        for (let eventName in olEvents) {
            self.layer.on(eventName, olEvents[eventName]);
        }
    }


    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object),
        map: PropTypes.instanceOf(Map)
    };
}