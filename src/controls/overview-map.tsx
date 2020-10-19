import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, View } from 'ol';
import { OverviewMap as OlOverviewMap } from 'ol/control';
import { get as getProjection } from 'ol/proj';
import { Util } from '../util';
import { MapView } from '../map';

export class OverviewMap extends React.Component<any, any> {

    control: OlOverviewMap;
    mapReadyCallbacks: any[] = [];
    layers: any[] = [];
    addLayerOverrider: any;
    map: any;

    options: any = {
        collapsed: undefined,
        collapseLabel: undefined,
        collapsible: undefined,
        label: undefined,
        layers: undefined,
        render: undefined,
        target: undefined,
        tipLabel: undefined,
        view: undefined
    };

    events: any = {
        'change': undefined,
        'propertychange': undefined
    };

    constructor(props) {
        super(props);

        this.addLayerOverrider = (layer) => this.layers.push(layer);
    }

    render() {
        return (this.props.children);
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
        let options = Util.getOptions(Object['assign'](this.options, props));

        this.map = {
            addLayer: this.addLayerOverrider,
            removeLayer: () => {
            },
        };

        this.options.projection = options.view && options.view.projection ? getProjection(options.view.projection) : this.context.mapComp.options.projection;

        if (!options.view) {
            options.view = {};
        }

        options.view.projection = this.options.projection;

        this.mapReadyCallbacks.forEach((f) => f());

        options.view = new View(options.view);

        options.layers = this.layers;

        this.control = new OlOverviewMap(options);
        this.context.mapComp.map.addControl(this.control);

        let olEvents = Util.getEvents(this.events, props);
        for (let eventName in olEvents) {
            this.control.on(eventName, olEvents[eventName]);
        }
    }

    componentWillReceiveProps(nextProps) {
        let self = this;
        // TODO: add better check when does this component needs to be updated
        if (nextProps !== this.props && nextProps.collapsed !== this.props.collapsed) {
            this.context.mapComp.map.removeControl(this.control);

            let options = Util.getOptions(Object['assign'](this.options, nextProps));

            if (!options.layers && nextProps.layerKey) {
                this.context.mapComp.map.getLayers().getArray().map((l) => {
                    if (l.get("key") === nextProps.layerKey) {
                        options.layers = [l];
                    }
                })
            }

            !(options.view instanceof View) && (options.view = new View(options.view));

            this.control = new OlOverviewMap(options);
            this.context.mapComp.map.addControl(this.control);

            let olEvents = Util.getEvents(this.events, this.props);
            for (let eventName in olEvents) {
                this.control.on(eventName, olEvents[eventName]);
            }
        }
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };

    getChildContext(): any {
        return {
            mapComp: this
        }
    }

    static childContextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(Object)
    };

}