import * as React from 'react';
import * as PropTypes from 'prop-types';

import * as ol from 'openlayers';
import { Util } from '../util';
import { MapView } from '../map';

export class ZoomSlider extends React.Component<any, any> {

    control: ol.control.ZoomSlider;

    options: any = {
        duration: undefined,
        className: undefined,
        maxResolution: undefined,
        minResolution: undefined,
        render: undefined
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
        this.control = new ol.control.ZoomSlider(options);
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