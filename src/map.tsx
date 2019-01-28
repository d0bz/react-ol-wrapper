import * as React from 'react';
import { Component } from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import ReactResizeDetector from 'react-resize-detector';
import proj4 from 'proj4';
import { Util } from './util';

import './ol.css';
import './map.css';

proj4.defs("EPSG:3301", "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

ol.proj.setProj4(proj4);

/**
 * MapView is main container, this will be parent of all children
 */
export class MapView extends Component<any, any> {

    map: ol.Map;
    mapDiv: any;

    layers: any[] = [];
    interactions: any[] = [];
    controls: any[] = [];
    overlays: any[] = [];
    mapReadyCallbacks: any[] = [];
    mapInitialRendered: boolean = false;

    options: any = {
        pixelRation: undefined,
        keyboardEventTarget: undefined,
        loadTilesWhileAnimation: undefined,
        loadTilesWhileInteractiong: undefined,
        logo: undefined,
        renderer: undefined,
        setCenter: undefined,
        setZoom: undefined,
        setResolution: undefined,
        view: new ol.View({ center: [0, 0], zoom: 3 }),
        controls: { attribution: false },
        interactions: undefined,
        layers: undefined,
        overlays: undefined
    };

    static propTypes = {

        /**
         * Define map view parameters
         * @param {Array} extent[Number, Number, Number, Number] restricts map pan outside of extent
         * @param {String} projection default EPSG:3857
         * @param {Array} center[Number, Number] map center location
         */
        view: PropTypes.object,

        /**
         * [Number, Number, Number, Number] Fit map to extent, very useful to move map to certain location, eg if you have point coordinate, then add 100m extent to it and fit map to this extent
         */
        extent: PropTypes.array,

        /**
         * Gets called when map is rendered
         *
         * @param {Array} [Number, Number, Number, Number] newExtent map true extent
         * @param {Number} zoom - map true zoom level - useful when using custom zoom controls
         */
        mapReady: PropTypes.func,

        /**
         * Gets called when map is zoomed in or out
         *
         * @param {Number} resolution value
         * @param {Array} [Number, Number, Number, Number] newExtent map true extent
         * @param {Number} zoom - map true zoom level - useful when using custom zoom controls
         */
        zoomEnd: PropTypes.func,

        /**
         * Gets called when map is panned
         *
         * @param {Array} [Number, Number, Number, Number] newExtent map true extent
         */
        centerChange: PropTypes.func,
    };

    events: any = {
        'change': undefined,
        'change:layerGroup': undefined,
        'change:size': undefined,
        'change:target': undefined,
        'change:view': undefined,
        'click': undefined,
        'dblclick': undefined,
        'moveend': undefined,
        'pointerdrag': undefined,
        'pointermove': undefined,
        'postcompose': undefined,
        'postrender': undefined,
        'precompose': undefined,
        'singleclick': undefined
    };

    viewEvents: any = {
        'change': undefined,
        'change:center': undefined,
        'change:rotation': undefined,
        'change:resolution': undefined,
        'propertychange': undefined,
    };

    /**
     * Component mounting LifeCycle; constructor, componentDidMount, and render
     * https://facebook.github.io/react/docs/react-component.html#mounting
     */
    constructor(props) {
        super(props);

        console.log("BOOT MAP");

        const lestProj = new ol.proj.Projection({
            code: 'http://www.opengis.net/gml/srs/epsg.xml#3301',
            units: 'm',
            axisOrientation: "neu"
        });
        ol.proj.addProjection(lestProj);


        // OVERRIDES
        const openlayers:any = ol;
        openlayers.structs.RBush.prototype.update = function (extent, value) {
            var item = this.items_[openlayers.getUid(value)];
            if (item) {
                let bbox: [number, number, number, number] = [item.minX, item.minY, item.maxX, item.maxY];
                if (!ol.extent.equals(bbox, extent)) {
                    this.remove(value);
                    this.insert(extent, value);
                }
            }
        };
    }

    componentDidMount() {
        let self = this;

        let options = Util.getOptions(Object.assign(this.options, this.props));

        !(options.view instanceof ol.View) && (options.view = new ol.View(options.view));

        let controlsCmp = Array.isArray(this.props.children) ? Util.findChild(this.props.children, 'Controls') : Util.elementIsChildType(this.props.children, 'Controls');
        if (!controlsCmp) {
            controlsCmp = {};
        }
        let interactionsCmp = Array.isArray(this.props.children) ? Util.findChild(this.props.children, 'Interactions') : Util.elementIsChildType(this.props.children, 'Interactions');
        if (!interactionsCmp) {
            interactionsCmp = {};
        }

        options.controls = ol.control.defaults(controlsCmp.props).extend(this.controls);
        options.interactions = ol.interaction.defaults({
            keyboard: false
        }).extend(this.interactions);

        options.controls.forEach(function (control) {
            if (control instanceof ol.control.Attribution) {
                options.controls.remove(control);
            }
        }, this);

        options.layers = this.layers;
        options.overlays = this.overlays;
        options.keyboardEventTarget = document.body;

        this.map = new ol.Map(options);
        this.map.setTarget(options.target || this.mapDiv);

        this.options.projection = options.view.getProjection();

        const win:any = window;
        win.mapDebug = this.map;

        if (options.extent) {
            this.map.getView().fit(options.extent);
        }

        // register events
        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.map.on(eventName, function (event) {
                olEvents[eventName](event, self.map);
            });
        }

        this.checkProps(this.props, true);

        // register events
        let olViewEvents = Util.getEvents(this.viewEvents, this.props);
        for (let eventName in olViewEvents) {
            this.map.getView().on(eventName, function (event) {
                olViewEvents[eventName](event, self.map);
            });
        }


        let isMapResolutionChanged;
        this.map.getView().on('change:resolution', () => {
            isMapResolutionChanged = true;
        });


        this.map.on('postrender', () => {
            if(!self.mapInitialRendered){
                self.mapInitialRendered = true;
                if(self.props.mapReady){
                    let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                    let zoom = self.map.getView().getZoom();
                    self.props.mapReady(newExtent, zoom);
                }
            }
        });

        this.map.on('moveend', () => {
            if (isMapResolutionChanged) {
                let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                isMapResolutionChanged = false;
                if (self.props.zoomEnd) {
                    self.props.zoomEnd(self.map.getView().getResolution(), newExtent, self.map.getView().getZoom());
                }
            } else if (self.props.centerChange) {
                let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                self.props.centerChange(newExtent);
            }
        });

        this.mapReadyCallbacks.forEach((f) => f());
    }

    componentWillReceiveProps(nextProps) {
        let compareExtent = true;
        if (this.props.view && nextProps.view.center && nextProps.view.center !== this.props.view.center) {
            this.map.getView().setCenter(nextProps.view.center);
            compareExtent = false;
        }
        if (this.props.view && nextProps.view.zoom && nextProps.view.zoom !== this.props.view.zoom) {
            this.map.getView().setZoom(nextProps.view.zoom);
            compareExtent = false;
        }
        if (nextProps.extent) {
            if (!this.props.extent || JSON.stringify(nextProps.extent) !== JSON.stringify(this.props.extent)) {
                var currentExtent: any[] = [];
                try {
                    currentExtent = this.map.getView().calculateExtent(this.map.getSize());
                } catch (e) {
                }

                var boundingExtent = nextProps.extent;
                if (JSON.stringify(currentExtent) !== JSON.stringify(boundingExtent)) {
                    this.map.getView().fit(boundingExtent, { minResolution: 1 });
                }
            }
        }
        this.checkProps(nextProps);
    }

    checkProps(props, init = false) {
        const self = this;
        if (props.disableZoom != this.props.disableZoom || (init && typeof props.disableZoom != "undefined" )) {
            this.map.getInteractions().forEach(function (interaction) {
                if (interaction instanceof ol.interaction.MouseWheelZoom) {
                    interaction.setActive(!props.disableZoom);
                }
            }, this);

            this.map.getControls().forEach(function (control) {
                if (control instanceof ol.control.Zoom) {
                    self.map.removeControl(control);
                }
            }, this);
            if (!props.disableZoom) {
                // add zoom control back
            }

        }

        if (props.disablePan != this.props.disablePan || (init && typeof props.disablePan != "undefined" )) {
            this.map.getInteractions().forEach(function (interaction) {
                if (interaction instanceof ol.interaction.DragPan) {
                    interaction.setActive(!props.disablePan);
                }
            }, this);
        }
    }

    onResize = () => {
        this.map.updateSize();
    };

    render() {
        return (
            <div style={{height: "100%", position: "relative"}}>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize}/>
                <div className="openlayers-map" ref={(el)=> this.mapDiv = el}>
                    {this.props.children}
                </div>
            </div>
        );
    }

    /**
     * Component Updating LifeCycle
     * https://facebook.github.io/react/docs/react-component.html#updating
     */
    //componentWillReceiveProps(nextProps)
    //shouldComponentUpdate(nextProps, nextState)
    //componentWillUpdate(nextProps, nextState)
    //componentDidUpdate(prevProps, prevState)

    /**
     * Component Unmounting LifeCycle
     * https://facebook.github.io/react/docs/react-component.html#unmounting
     */
    componentWillUnmount() {
        this.map.setTarget(undefined)
    }

    getChildContext(): any {
        return {
            mapComp: this,
            map: this.map
        }
    }

    static childContextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };
}