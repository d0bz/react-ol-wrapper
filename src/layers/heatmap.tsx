import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Heatmap as OlHeatmap } from 'ol/layer';
import { Util } from '../util';
import { MapView } from '../map';

export class Heatmap extends React.Component<any, any> {

    layer: OlHeatmap;

    options: any = {
        gradient: undefined,
        radius: undefined,
        blur: undefined,
        shadow: undefined,
        weight: undefined,
        extent: undefined,
        minResolution: undefined,
        maxResolution: undefined,
        opacity: undefined,
        source: undefined,
        visible: undefined
    };

    events: any = {
        'change': undefined,
        'change:blur': undefined,
        'change:extent': undefined,
        'change:gradient': undefined,
        'change:maxResolution': undefined,
        'change:minResolution': undefined,
        'change:opacity': undefined,
        'change:radius': undefined,
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
        let options = Util.getOptions(Object['assign'](this.options, this.props));
        this.layer = new OlHeatmap(options);
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
            let options = Util.getOptions(Object.assign(this.options, nextProps));
            this.context.mapComp.map.removeLayer(this.layer);
            this.layer = new OlHeatmap(options);
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