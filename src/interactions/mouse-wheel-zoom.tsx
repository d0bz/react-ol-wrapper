import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';
import { MouseWheelZoom as OlMouseWheelZoom } from 'ol/interaction';
import { Util } from '../util';
import { MapView } from '../map';

export class MouseWheelZoom extends React.Component<any, any> {

    interaction: OlMouseWheelZoom;

    options: any = {
        duration: undefined,
        timeout: undefined,
        useAnchor: undefined
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
        this.interaction = new OlMouseWheelZoom(options);
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
            this.interaction = new OlMouseWheelZoom(options);
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