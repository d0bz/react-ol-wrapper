import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import VectorTile from 'ol/layer/VectorTile';

import { Util } from "../util";
import { MapView } from '../map';

export class VectorTilePlain extends React.Component<any, any> {

    layer: VectorTile;

    options: any = {
        renderBuffer: undefined,
        renderMode: undefined,
        renderOrder: undefined,
        extent: undefined,
        minResolution: undefined,
        maxResolution: undefined,
        opacity: undefined,
        preload: undefined,
        source: undefined,
        style: undefined,
        updateWhileAnimating: undefined,
        updateWhileInteracting: undefined,
        visible: undefined
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
        let options = Util.getOptions(Object.assign(this.options, this.props));
        this.layer = new VectorTile(options);
        if (this.options.callback) {
            this.options.callback(this.layer);
        }
        if (this.props.zIndex) {
            this.layer.setZIndex(this.props.zIndex);
        }
        this.context.mapComp.layers.push(this.layer);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.layer.on(eventName, olEvents[eventName]);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            let options = Util.getOptions(Object.assign(this.options, this.props));
            this.context.mapComp.map.removeLayer(this.layer);
            this.layer = new VectorTile(options);
            if (this.options.callback) {
                this.options.callback(this.layer);
            }
            if (this.props.zIndex) {
                this.layer.setZIndex(this.props.zIndex);
            }
            this.context.mapComp.map.addLayer(this.layer);

            let olEvents = Util.getEvents(this.events, this.props);
            for (let eventName in olEvents) {
                this.layer.on(eventName, olEvents[eventName]);
            }
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeLayer(this.layer);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

}