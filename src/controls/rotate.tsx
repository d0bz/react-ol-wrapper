import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Rotate as OlRotate } from 'ol/control';

import { Util } from '../util';
import { MapView } from '../map';

export class Rotate extends React.Component<any, any> {

    control: OlRotate;

    options: any = {
        className: undefined,
        label: undefined,
        tipLabel: undefined,
        duration: undefined,
        autoHide: undefined,
        render: undefined,
        resetNorth: undefined,
        target: undefined
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
        this.control = new OlRotate(options);
        this.context.mapComp.controls.push(this.control);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.control.on(eventName, olEvents[eventName]);
        }
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}