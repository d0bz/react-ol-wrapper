import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, Observable, Feature as OlFeature } from 'ol';

import { Fill, Stroke, Circle, Style } from 'ol/style';
import { Polygon, Point, LineString, LinearRing, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection, GeometryType } from 'ol/geom';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import Select from 'ol/interaction/Select';
import { always, never, platformModifierKeyOnly, shiftKeyOnly, singleClick } from 'ol/events/condition';
import { boundingExtent } from 'ol/extent';
import { squaredDistance, closestOnCircle, closestOnSegment } from 'ol/coordinate';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Collection from 'ol/Collection';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';
import { transform } from 'ol/proj';

import { Util } from "../util";
import { MapView } from '../map';
import * as jsts from 'jsts';
import  { Feature }  from '../types/Feature';

const drawStyle = new Style({
    stroke: new Stroke({
        color: '#00ff03',
        width: 2
    }),
    fill: new Fill({
        color: 'rgba(255,0,0,0)'
    }),
    image: new Circle({
        fill: new Fill({ color: 'rgba(0, 255, 0, 0.4)' }),
        stroke: new Stroke({ color: '#00ff03', width: 1.25 }),
        radius: 5
    })
});

const resultStyle = new Style({
    stroke: new Stroke({
        color: '#f00',
        width: 4
    }),
    fill: new Fill({
        color: 'rgba(255,0,0,0)'
    })
});

const lineStyle = [
    new Style({
        stroke: new Stroke({
            color: '#f00',
            width: 4
        })
    }),
    new Style({
        stroke: new Stroke({
            color: '#00ff03',
            width: 1.25
        })
    })
];

const olInteractionDraw:any = Draw;


export class Splice extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    splicingFeature: Feature;
    lineFeature: Feature;
    drawInteraction: Draw;
    snapInteraction: Snap;
    modifyInteraction: Modify;
    selectInteraction: Select;
    resultSource: VectorSource;
    resultLayer: VectorLayer;
    lineSource: VectorSource;
    lineLayer: VectorLayer;
    wktWriter: jsts.io.WKTWriter;
    wktReader: jsts.io.WKTReader;
    wktFormat: WKT;
    jtsParser: jsts.io.OL3Parser;
    snapFeatures: Collection<OlFeature>;
    geojsonFormat: GeoJSON;


    options: any = {};

    events: any = {};

    constructor(props) {
        super(props);
        this.resultSource = new VectorSource({ wrapX: false });
        this.lineSource = new VectorSource({ wrapX: false });
        this.snapFeatures = new Collection([]);

        this.geojsonFormat = new GeoJSON();

        this.jtsParser = new jsts.io.OL3Parser();
        this.jtsParser.inject(Point, LineString, LinearRing, Polygon, MultiPoint, MultiLineString,
            MultiPolygon, GeometryCollection);

        this.wktWriter = new jsts.io.WKTWriter();
        this.wktFormat = new WKT();


        // Modified for freehand drawing
        olInteractionDraw.handleUpEvent_ = function (event) {
            let pass = true;
            this.handlePointerMove_(event);
            let circleMode = this.mode_ === olInteractionDraw.Mode_.CIRCLE;
            if (this.shouldHandle_) {
                if (!this.finishCoordinate_) {
                    this.startDrawing_(event);
                    if (this.mode_ === olInteractionDraw.Mode_.POINT) {
                        this.finishDrawing();
                    }
                } else if (this.finishCondition_(event) && (this.freehand_ || circleMode)) {
                    this.finishDrawing();
                } else if (this.atFinish_(event)) {
                    if (this.finishCondition_(event)) {
                        this.finishDrawing();
                    }
                } else {
                    this.addToDrawing_(event);
                }
                pass = false;
            }

            if (!pass && this.stopClick_) {
                event.stopPropagation();
            }
            return pass;
        }
        ;

    }

    render() {
        return null;
    }

    componentDidMount() {
        const self = this;

        this.resultLayer = new VectorLayer({
            source: this.resultSource,
            style: resultStyle
        });

        this.context.mapComp.mapReadyCallbacks.push(() => {
            self.projection = self.context.mapComp.map.getView().getProjection().getCode();
        });

        this.lineLayer = new VectorLayer({
            source: this.lineSource,
            style: lineStyle
        });

        this.resultLayer.setZIndex(100);
        this.lineLayer.setZIndex(101);

        this.context.mapComp.layers.push(this.resultLayer);
        this.context.mapComp.layers.push(this.lineLayer);
    }

    componentWillReceiveProps(nextProps) {
        let self = this;
        if (nextProps !== this.props && nextProps.active !== this.props.active) {

            // interaction activated
            if (nextProps.active) {

                this.startSelection(nextProps);

            } else {
                if (this.selectInteraction) {
                    this.context.mapComp.map.removeInteraction(this.selectInteraction);
                }

                if (this.drawInteraction) {
                    this.drawInteraction.setActive(false);
                    this.context.mapComp.map.removeInteraction(this.drawInteraction);
                }

                if (this.modifyInteraction) {
                    this.context.mapComp.map.removeInteraction(this.modifyInteraction);
                }

                if (this.snapInteraction) {
                    this.context.mapComp.map.removeInteraction(this.snapInteraction);
                }

                this.context.mapComp.map.un('click', self.mapOnClick, self);
                this.resultSource.clear();
                this.lineSource.clear();
                this.splicingFeature = null;
                this.lineFeature = null;
            }
        }

        if (nextProps.active && ((!nextProps.lineFeature && self.lineFeature) || (nextProps.lineFeature && !self.lineFeature))) {
            self.addLineFeature(nextProps.lineFeature);
        }

        if (nextProps.active && (((nextProps.selectFeatures && nextProps.selectFeatures.length == 1) && !self.splicingFeature))) {
            self.addSelectedFeature(nextProps.selectFeatures[0]);
        }
    }

    startSelection(props) {
        const self = this;
        let options = Util.getOptions(Object['assign'](this.options, props));

        if (props.wfsLayerDescription) {
            this.context.mapComp.map.on('click', this.mapOnClick, this);
        }

        this.context.mapComp.map.getLayers().forEach(function (layer) {
            if (layer.getSource() == props.source) {
                options.layers = [layer];
            }
        });

        if (options.layers) {
            this.selectInteraction = new Select(options);
            this.selectInteraction.on("select", (e) => self.areaSelected(e));
            this.context.mapComp.map.addInteraction(this.selectInteraction);
        }
    }

    mapOnClick(evt) {
        const { wfsLayerDescription } = this.props;
        const self = this;

        const coordinate = transform(evt.coordinate, this.projection, 'EPSG:4326');
        const extent = Util.createExtentFromLonLat(coordinate[0], coordinate[1], 0.01);

        const requestNode = Util.buildWFSGetFeatureRequestElement({
            geometryPropertyName: wfsLayerDescription.geometryPropertyName,
            featureType: wfsLayerDescription.featureType,
            featureNS: wfsLayerDescription.featureNS,
            srsName: 'EPSG:4326',
            bbox: extent,
            cqlFilter: wfsLayerDescription.cqlFilter
        });

        Util.requestWFS(requestNode, wfsLayerDescription.url, true).then((resp) => {
            if (resp.features.length > 0) {
                self.spliceFeature(resp.features[0]);
            }
        });
    }

    areaSelected(event) {
        const feature = event.selected[0];
        this.spliceFeature(new Feature(feature, this.projection));
    }

    selectionChanged() {
        // Start line drawing
        const self = this;
        let previousLineLength = 0;

        const deleteLastPoint = (e) => {
            // backspace
            if (e.which == 8) {
                self.drawInteraction.removeLastPoint();
                previousLineLength = lineString.getCoordinates().length;
            }
        };

        this.context.mapComp.map.removeInteraction(this.selectInteraction);

        this.context.mapComp.map.un('click', this.mapOnClick, this);
        this.context.mapComp.map.removeInteraction(this.drawInteraction);

        this.drawInteraction = new Draw({
            source: this.lineSource,
            type: "LineString",
            style: drawStyle,
            finishCondition: function () {
                return false;
            }
        });

        document.addEventListener('keydown', deleteLastPoint, false);

        let listenerKey;
        let lineString;
        this.drawInteraction.on('drawstart', function (e: Draw.Event) {
            let feature = e.feature;
            lineString = feature.getGeometry();
            // finish the drawing when the linestring has 2 vertices
            listenerKey = lineString.on('change', function (e) {
                const lineString = e.target;
                const vertices = lineString.getCoordinates();
                if (vertices.length > 2 && previousLineLength < vertices.length) {
                    previousLineLength = vertices.length;
                    // check if last vertice is outside from base area
                    const lastVertice = vertices[vertices.length - 1];

                    let geomA = self.jtsParser.read(new Point(lastVertice));
                    let geomB = self.wktReader.read(self.splicingFeature.getGeometry());
                    let geomC = self.jtsParser.read(lineString);

                    if (!geomB.contains(geomA)) {
                        if (geomB.intersects(geomC)) {
                            self.drawInteraction.finishDrawing();
                        }
                    }
                } else if (vertices.length == 2 && previousLineLength != vertices.length) {

                    const firstVertice = vertices[0];

                    let geomA = self.jtsParser.read(new Point(firstVertice));
                    let geomB = self.wktReader.read(self.splicingFeature.getGeometry());

                    // must start from outside
                    if (geomB.contains(geomA)) {
                        self.drawInteraction.removeLastPoint();
                        previousLineLength = 0;
                    }
                }
            });
        });

        this.drawInteraction.on('drawend', function (e) {
            Observable.unByKey(listenerKey);
            document.removeEventListener('keydown', deleteLastPoint, false);

            self.drawEnd(e);
        });

        this.snapInteraction = new Snap({
            features: this.snapFeatures,
            pixelTolerance: 20
        });

        this.context.mapComp.map.addInteraction(this.drawInteraction);

        if (this.snapInteraction) {
            this.context.mapComp.map.removeInteraction(this.snapInteraction);
        }
        this.context.mapComp.map.addInteraction(this.snapInteraction);

        this.props.spliceStart(this.splicingFeature);
        //Delay execution of activation of double click zoom function
        this.controlDoubleClickZoom(false);
    }

    drawEnd(evt) {
        const self = this;
        self.lineFeature = new Feature(evt.feature, self.projection);
        this.context.mapComp.map.removeInteraction(this.drawInteraction);


        this.modifyInteraction = new Modify({
            source: this.lineSource,
            deleteCondition: function (event) {
                return shiftKeyOnly(event) &&
                    singleClick(event);
            }
        });

        this.modifyInteraction.on('modifyend', this.modifyEnd, this);
        this.context.mapComp.map.addInteraction(this.modifyInteraction);

        this.cutSelectedGeometry();
        setTimeout(function () {
            self.controlDoubleClickZoom(true);
        }, 300);
    }

    modifyEnd(evt) {
        let innerFeature = new Feature(evt.features.getArray()[0], this.projection);
        this.addLineFeature(innerFeature);
    }

    addLineFeature(feature: Feature|null) {
        if (!this.lineFeature && feature) {
            this.context.mapComp.map.removeInteraction(this.drawInteraction);

            this.modifyInteraction = new Modify({
                source: this.lineSource,
                deleteCondition: function (event) {
                    return shiftKeyOnly(event) &&
                        singleClick(event);
                }
            });

            this.modifyInteraction.on('modifyend', this.modifyEnd, this);
            this.context.mapComp.map.addInteraction(this.modifyInteraction);
        }

        this.lineFeature = feature;
        this.cutSelectedGeometry();

        if (!this.lineFeature) {
            this.lineSource.clear();
            if (this.modifyInteraction) {
                this.context.mapComp.map.removeInteraction(this.modifyInteraction);
            }

            this.selectionChanged();
        } else {
            this.context.mapComp.map.removeInteraction(this.drawInteraction);
            this.context.mapComp.map.removeInteraction(this.snapInteraction);
            this.controlDoubleClickZoom(true);
        }
    }

    addSelectedFeature(feature: Feature) {
        this.splicingFeature = feature;

        if (!this.splicingFeature) {
            this.lineSource.clear();
            this.resultSource.clear();
            this.lineFeature = null;

            if (this.modifyInteraction) {
                this.context.mapComp.map.removeInteraction(this.modifyInteraction);
            }

            if (this.drawInteraction) {
                this.context.mapComp.map.removeInteraction(this.drawInteraction);
            }

            this.startSelection(this.props);
        } else {
            this.spliceFeature(this.splicingFeature);
        }
    }

    cutSelectedGeometry() {
        const self = this;

        let olSplicingFeature = this.splicingFeature && this.splicingFeature.getMapFeature(self.projection);

        if (!self.lineFeature) {

            this.resultSource.clear();
            if (olSplicingFeature) {
                this.resultSource.addFeature(olSplicingFeature);
            }

            this.props.spliceEnd(this.splicingFeature, self.lineFeature);
            return;
        }

        if (!this.splicingFeature) {
            this.resultSource.clear();
            this.props.spliceEnd(this.splicingFeature, self.lineFeature);
            return;
        }


        this.resultSource.clear();

        if (olSplicingFeature) {
            this.resultSource.addFeature(olSplicingFeature);
        }

        // very slow, but when not doing then after drawing and activating modify interaction then snap wont work anymore
        //this.context.mapComp.map.removeInteraction(this.snapInteraction);
        //this.context.mapComp.map.addInteraction(this.snapInteraction);


        this.props.spliceEnd(self.splicingFeature, self.lineFeature);
    }

    spliceFeature(feature: Feature) {
        let olFeature = feature.getMapFeature(this.projection);
        this.context.mapComp.map.getView().fit(olFeature.getGeometry().getExtent());
        this.resultSource.addFeature(olFeature);
        this.splicingFeature = feature;

        this.snapFeatures.clear();
        const bufferFeature = olFeature.clone();
        let bufferGeom = this.jtsParser.read(bufferFeature.getGeometry());
        bufferFeature.setGeometry(this.jtsParser.write(bufferGeom.buffer(0.05)));
        this.snapFeatures.push(bufferFeature);

        this.selectionChanged();
    }

    componentWillUnmount() {
        if (this.selectInteraction) {
            this.context.mapComp.map.removeInteraction(this.selectInteraction);
        }

        if (this.drawInteraction) {
            this.context.mapComp.map.removeInteraction(this.drawInteraction);
        }

        if (this.modifyInteraction) {
            this.context.mapComp.map.removeInteraction(this.modifyInteraction);
        }

        if (this.snapInteraction) {
            this.context.mapComp.map.removeInteraction(this.snapInteraction);
        }

        this.context.mapComp.map.un('click', this.mapOnClick, this);
        this.resultSource.clear();
        this.lineSource.clear();
        this.splicingFeature = null;

        this.context.mapComp.map.removeLayer(this.lineLayer);
        this.context.mapComp.map.removeLayer(this.resultLayer);
    }

    // dblClick must be disabled while drawing, otherwise dblClicking to end drawing will zoom in.
    controlDoubleClickZoom(active) {
        //Find double click interaction
        let interactions = this.context.mapComp.map.getInteractions();
        for (let i = 0; i < interactions.getLength(); i++) {
            let interaction = interactions.item(i);
            if (interaction instanceof DoubleClickZoom) {
                interaction.setActive(active);
            }
        }
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}