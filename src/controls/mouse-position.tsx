import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import MousePosition from 'ol/control/MousePosition';


import { Util } from '../util';
import { MapView } from '../map';

export class MousePositionComponent extends React.Component<any, any> {

    control: MousePosition;

    options: any = {
        className: undefined,
        coordinateFormat: undefined,
        projection: undefined,
        render: undefined,
        target: undefined,
        undefinedHTML: undefined
    };

    events: any = {
        'change': undefined,
        'change:coordinateFormat': undefined,
        'change:projection': undefined,
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
        this.control = new MousePosition(options);
        this.context.mapComp.controls.push(this.control);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.control.on(eventName, olEvents[eventName]);
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeControl(this.control);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

}