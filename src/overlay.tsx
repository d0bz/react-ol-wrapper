import * as React from 'react';
import * as ReactDOM from "react-dom";
import * as PropTypes from 'prop-types';
import { Map, Overlay as OlOverlay } from 'ol';
import { transform } from 'ol/proj';
import { Util } from './util';
import { MapView } from './map';
import { Popup } from './custom/popup';


export class Overlay extends React.Component<any, any> {

    overlay: OlOverlay;
    el: HTMLElement;
    projection: string = "EPSG:3857";

    options: any = {
        id: undefined,
        element: undefined,
        offset: undefined,
        position: undefined,
        stopEvent: undefined,
        insertFirst: undefined,
        autoPan: undefined,
        autoPanAnimation: undefined,
        autoPanMargin: undefined
    };

    events: any = {
        'change': undefined,
        'change:element': undefined,
        'change:map': undefined,
        'change:offset': undefined,
        'change:position': undefined,
        'change:positioning': undefined,
        'propertychange': undefined
    };

    render() {
        return (
            <div>
                <Popup onClose={this.props.onClose}>
                    {this.props.children}
                </Popup>
            </div>
        );
    }

    componentDidMount() {
        const self = this;
        if (!this.context.mapComp.map) {
            this.context.mapComp.mapReadyCallbacks.push(() => {
                self.addControl(self.props);
            });
        } else {
            this.addControl(self.props);
        }
    }

    componentWillReceiveProps(nextProps) {
        let self = this;
        this.projection = this.context.mapComp.map.getView().getProjection().getCode();

        if (nextProps.position) {
            const pos = transform(nextProps.position, "EPSG:4326", self.projection);
            this.overlay.setPosition(pos);
        }
    }

    addControl(props) {
        let options = Util.getOptions(Object['assign'](this.options, props));

        this.projection = this.context.mapComp.map.getView().getProjection().getCode();

        const dom: any = ReactDOM.findDOMNode(this);

        options.element = dom.querySelector('div');

        this.overlay = new OlOverlay(options);
        this.context.mapComp.map.addOverlay(this.overlay);

        if (props.position) {
            const pos = transform(props.position, "EPSG:4326", this.projection);
            this.overlay.setPosition(pos);
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeOverlay(this.overlay);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}