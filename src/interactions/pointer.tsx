import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { Pointer as OlPointer } from 'ol/interaction';
import { Util } from '../util';
import { MapView } from '../map';

export class Pointer extends React.Component<any, any> {

    interaction: OlPointer;

    options: any = {
        handleDownEvent: undefined,
        handleDragEvent: undefined,
        handleEvent: undefined,
        handleMoveEvent: undefined,
        handleUpEvent: undefined
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
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
        this.interaction = new OlPointer(options);
        this.context.mapComp.interactions.push(this.interaction);

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.interaction.on(eventName, olEvents[eventName]);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            this.context.mapComp.map.removeInteraction(this.interaction);
            let options = Util.getOptions(Object['assign'](this.options, nextProps));
            this.interaction = new OlPointer(options);
            this.context.mapComp.map.addInteraction(this.interaction);

            let olEvents = Util.getEvents(this.events, this.props);
            for (let eventName in olEvents) {
                this.interaction.on(eventName, olEvents[eventName]);
            }
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}