import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { ScaleLine as OlScaleLine } from 'ol/control';
import { Util } from '../util';
import { MapView } from '../map';

export class ScaleLine extends React.Component<any, any> {

    control: OlScaleLine;

    options: any = {
        className: undefined,
        minWidth: undefined,
        render: undefined,
        target: undefined,
        units: undefined
    };

    events: any = {
        'change': undefined,
        'change:units': undefined,
        'propertychange': undefined
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
                self.addControl(self.props);
            });
        } else {
            this.addControl(this.props);
        }
    }

    addControl(props) {
        let options = Util.getOptions(Object.assign(this.options, props));
        this.control = new OlScaleLine({
            units: 'metric',
            bar: true,
            steps: 2,
            text: true,
            minWidth: 140
        });
        this.context.mapComp.map.addControl(this.control);

        let olEvents = Util.getEvents(this.events, props);
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