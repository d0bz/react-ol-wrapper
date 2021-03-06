import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { KeyboardPan as OlKeyboardPan } from 'ol/interaction';
import { Util } from '../util';
import { MapView } from '../map';

export class KeyboardPan extends React.Component<any, any> {

    interaction: OlKeyboardPan;

    options: any = {
        condition: undefined,
        duration: undefined,
        pixelDelta: undefined
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
        console.log('options', options);
        if (this.interaction) {
            this.context.mapComp.map.removeInteraction(this.interaction);
        }

        this.interaction = new OlKeyboardPan(options);

        if (!this.context.mapComp.map) {
            this.context.mapComp.interactions.push(this.interaction);
        } else {
            this.context.mapComp.map.addInteraction(this.interaction);
        }

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.interaction.on(eventName, olEvents[eventName]);
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