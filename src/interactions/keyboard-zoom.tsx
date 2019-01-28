import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from "../util";
import { MapView } from '../map';

export class KeyboardZoom extends React.Component<any, any> {

    interaction: ol.interaction.KeyboardZoom;

    options: any = {
        condition: undefined,
        duration: undefined,
        delta: undefined
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
        this.interaction = new ol.interaction.KeyboardZoom(options);

        if (this.interaction) {
            this.context.mapComp.map.removeInteraction(this.interaction);
        }

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
        map: PropTypes.instanceOf(ol.Map)
    };
}