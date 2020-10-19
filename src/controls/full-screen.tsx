import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { FullScreen as OlFullScreen } from 'ol/control';
import { Util } from '../util';
import { MapView } from '../map';

export class FullScreen extends React.Component<any, any> {

    control: OlFullScreen;

    options: any = {
        className: undefined,
        label: undefined,
        labelActive: undefined,
        tipLabel: undefined,
        keys: undefined,
        target: undefined,
        source: undefined
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
        this.control = new OlFullScreen(options);
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