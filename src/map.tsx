import * as React from 'react';
import { Component } from 'react';
import * as PropTypes from 'prop-types';
import { Map as OlMap, MapBrowserEvent as OlMapBrowserEvent, View as OlView } from 'ol';
import { defaults as interactionDefaults, MouseWheelZoom, DragPan } from 'ol/interaction';
import { Zoom as OlZoom, Attribution as OlAttribution, defaults as controlDefaults } from 'ol/control';
import Projection from 'ol/proj/Projection';
import { addProjection as olAddProjection, get as olGetProjection, transformExtent as olTransformExtent, transform as olTransform } from 'ol/proj';
import { equals } from 'ol/extent';
import RBush from 'ol/structs/RBush';
import { getUid } from 'ol/util';
import 'ol/ol.css';
import ReactResizeDetector from 'react-resize-detector';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { Util } from './util';
import './map.css';

proj4.defs("EPSG:3301", "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 +x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

register(proj4);

/**
 * MapView is main container, this will be parent of all children
 */
export class MapView extends Component<any, any> {

    map: OlMap;
    mapDiv: any;

    layers: any[] = [];
    interactions: any[] = [];
    controls: any[] = [];
    overlays: any[] = [];
    mapReadyCallbacks: any[] = [];
    mapInitialRendered: boolean = false;
    key: any = null;
    isMapResolutionChanged: boolean = false;

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
        view: new OlView({ constrainResolution: true, center: [0, 0], zoom: 3 }),
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

        const lestExtent: [number, number, number, number] = [40500, 5993000, 1064500, 7017000];
        const lestProj = new Projection({
            code: 'http://www.opengis.net/gml/srs/epsg.xml#3301',
            units: 'm',
            axisOrientation: "neu",
            extent: [40500, 5993000, 1064500, 7017000]
        });
        olAddProjection(lestProj);
        olGetProjection("EPSG:3301").setExtent(lestExtent);


        // OVERRIDES
        RBush.prototype.update = function (extent, value) {
            var item = this.items_[getUid(value)];
            if (item) {
                let bbox: [number, number, number, number] = [item.minX, item.minY, item.maxX, item.maxY];
                if (!equals(bbox, extent)) {
                    this.remove(value);
                    this.insert(extent, value);
                }
            }
        };
        this.key = 'mapview_' + Math.floor(Math.random() * (9999999999999 - 0 + 1));
    }

    componentDidMount() {
        let self = this;

        let options = Util.getOptions(Object.assign(this.options, this.props));

        if (options.view.extent) {
            options.view.extent = olTransformExtent(options.view.extent, "EPSG:4326", options.view && options.view.projection ? options.view.projection : "EPSG:3857");
        }

        !(options.view instanceof OlView) && (options.view = new OlView({
            ...options.view,
            constrainResolution: true
        }));

        let controlsCmp = Array.isArray(this.props.children) ? Util.findChild(this.props.children, 'Controls') : Util.elementIsChildType(this.props.children, 'Controls');
        if (!controlsCmp) {
            controlsCmp = {};
        }
        let interactionsCmp = Array.isArray(this.props.children) ? Util.findChild(this.props.children, 'Interactions') : Util.elementIsChildType(this.props.children, 'Interactions');
        if (!interactionsCmp) {
            interactionsCmp = {};
        }

        options.controls = controlDefaults(controlsCmp.props).extend(this.controls);
        options.interactions = interactionDefaults({
            keyboard: false
        }).extend(this.interactions);

        options.controls.forEach(function (control) {
            if (control instanceof OlAttribution) {
                options.controls.remove(control);
            }
        }, this);

        options.layers = this.layers;
        options.overlays = this.overlays;
        options.keyboardEventTarget = document.body;

        options.maxTilesLoading = 64;

        this.map = new OlMap(options);
        this.map.setTarget(options.target || this.mapDiv);

        this.options.projection = options.view.getProjection();

        const win: any = window;
        win.mapInstance = this.map;

        if (options.extent) {
            const newExtent = this.getNewExtent(options.extent);
            self.map.getView().fit(newExtent, {nearest: true});
            setTimeout(function () {
                self.map.getView().fit(newExtent, {nearest: true});
            }, 200);
        }

        if (self.props.onClick) {
            self.map.on("click", function (event: OlMapBrowserEvent) {
                self.props.onClick(olTransform(event.coordinate, self.map.getView().getProjection(), "EPSG:4326"));
            });
        }

        if (self.props.onDblclick) {
            self.map.on("dblclick", function (event: OlMapBrowserEvent) {
                self.props.onDblclick(olTransform(event.coordinate, self.map.getView().getProjection(), "EPSG:4326"));
            });
        }

        // register events
        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.map.on(eventName, function (event) {
                olEvents[eventName](event, self.map);
            });
        }

        this.checkProps(this.props, true);


        this.registerViewEvents();
        this.map.on('postrender', () => {
            if (!self.mapInitialRendered) {
                self.mapInitialRendered = true;
                if (self.props.mapReady) {
                    let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                    let zoom = self.map.getView().getZoom();
                    let resolution = self.map.getView().getResolution();
                    const scale = Util.getScaleFromResolution(resolution, this.map.getView().getProjection().getUnits());
                    self.props.mapReady(olTransformExtent(newExtent, self.map.getView().getProjection(), "EPSG:4326"), zoom, scale);
                }
            }
        });

        this.map.on('moveend', () => {
            if (this.isMapResolutionChanged) {
                let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                this.isMapResolutionChanged = false;
                if (self.props.zoomEnd) {
                    const scale = Util.getScaleFromResolution(self.map.getView().getResolution(), this.map.getView().getProjection().getUnits());
                    self.props.zoomEnd(scale, olTransformExtent(newExtent, self.map.getView().getProjection(), "EPSG:4326"), self.map.getView().getZoom());
                }
            } else if (self.props.centerChange) {
                let newExtent = self.map.getView().calculateExtent(self.map.getSize());
                self.props.centerChange(olTransformExtent(newExtent, self.map.getView().getProjection(), "EPSG:4326"));
            }
        });

        this.mapReadyCallbacks.forEach((f) => f());
    }

    registerViewEvents() {
        const self = this;
        this.map.getView().on('change:resolution', () => {
            self.isMapResolutionChanged = true;
        });

        // register events
        let olViewEvents = Util.getEvents(this.viewEvents, this.props);
        for (let eventName in olViewEvents) {
            this.map.getView().on(eventName, function (event) {
                olViewEvents[eventName](event, self.map);
            });
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.view && nextProps.view.center && nextProps.view.center !== this.props.view.center) {
            let center = olTransform(nextProps.view.center, "EPSG:4326", this.map.getView().getProjection());
            this.map.getView().setCenter(center);
        }
        if (this.props.view && nextProps.view.zoom && nextProps.view.zoom !== this.props.view.zoom) {
            this.map.getView().setZoom(nextProps.view.zoom);
        }
        if (this.props.view && nextProps.view.scale && nextProps.view.scale !== this.props.view.scale) {
            const resolution = Util.getResolutionForScale(nextProps.view.scale, this.map.getView().getProjection().getUnits());
            this.map.getView().setZoom(Math.ceil(this.map.getView().getZoomForResolution(resolution)));
        }
        if (nextProps.extent) {
            if (!this.props.extent || JSON.stringify(nextProps.extent) !== JSON.stringify(this.props.extent)) {
                var currentExtent: [number, number, number, number] | null = null;
                try {
                    currentExtent = this.map.getView().calculateExtent(this.map.getSize());
                    currentExtent = olTransformExtent(currentExtent, this.map.getView().getProjection(), "EPSG:4326");
                } catch (e) {
                }

                var boundingExtent = nextProps.extent;
                if (JSON.stringify(currentExtent) !== JSON.stringify(boundingExtent)) {

                    let newExtent = this.getNewExtent(boundingExtent);
                    this.map.getView().fit(newExtent);
                }
            }
        }

        if (this.props.view && nextProps.view.projection && nextProps.view.projection !== this.props.view.projection) {
            let props = Object.assign({}, nextProps);
            if (props.view && props.view.extent) {
                props.view.extent = olTransformExtent(props.view.extent, "EPSG:4326", props.view.projection);
            }

            let view = new OlView({
                ...props.view,
                constrainResolution: true
            });
            let wgsExtent = olTransformExtent(this.map.getView().calculateExtent(this.map.getSize()), this.map.getView().getProjection(), "EPSG:4326");
            let newExtent = this.getNewExtent(wgsExtent, props.view.projection);
            this.options.projection = view.getProjection();
            this.map.setView(view);
            this.map.getView().fit(newExtent);
            this.key = 'mapview_' + Math.floor(Math.random() * (9999999999999 - 0 + 1));
            this.registerViewEvents();
        }

        this.checkProps(nextProps);
    }

    getNewExtent(extent, projection = this.map.getView().getProjection()) {
        return olTransformExtent(extent, "EPSG:4326", projection);
    }

    checkProps(props, init = false) {
        const self = this;
        if (props.disableZoom != this.props.disableZoom || (init && typeof props.disableZoom != "undefined" )) {
            this.map.getInteractions().forEach(function (interaction) {
                if (interaction instanceof MouseWheelZoom) {
                    interaction.setActive(!props.disableZoom);
                }
            }, this);

            this.map.getControls().forEach(function (control) {
                if (control instanceof OlZoom) {
                    self.map.removeControl(control);
                }
            }, this);
            if (!props.disableZoom) {
                // add zoom control back
            }

        }

        if (props.disablePan != this.props.disablePan || (init && typeof props.disablePan != "undefined" )) {
            this.map.getInteractions().forEach(function (interaction) {
                if (interaction instanceof DragPan) {
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
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} />
                <div className="openlayers-map" ref={(el)=> this.mapDiv = el}>
                    <div key={this.key}>
                        {this.props.children}
                    </div>
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
        map: PropTypes.instanceOf(OlMap)
    };
}