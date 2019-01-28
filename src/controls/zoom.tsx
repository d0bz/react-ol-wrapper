import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from '../util';
import { MapView } from '../map';

export class Zoom extends React.Component<any, any> {

    control: ol.control.Zoom;

    options: any = {
        duration: undefined,
        className: undefined,
        zoomInLabel: undefined,
        zoomOutLabel: undefined,
        zoomInTipLabel: undefined,
        zoomOutTipLabel: undefined,
        delta: undefined
    };

    events: any = {
        'change': undefined,
        'propertychange': undefined
    };

    constructor(props) {
        super(props);
    }

    render() {
        return null;
    }

    componentDidMount() {
        let options = Util.getOptions(Object['assign'](this.options, this.props));
        this.control = new ol.control.Zoom(options);
        this.context.mapComp.controls.push(this.control);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.control.on(eventName, olEvents[eventName]);
        }
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };

}