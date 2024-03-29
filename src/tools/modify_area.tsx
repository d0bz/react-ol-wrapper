import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map, Feature as OlFeature } from 'ol';
import { Fill, Stroke, Circle, Style } from 'ol/style';
import { Polygon, Point, LineString, LinearRing, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection, GeometryType } from 'ol/geom';
import DragBox from 'ol/interaction/DragBox';
import Modify from 'ol/interaction/Modify';
import { always, never, platformModifierKeyOnly } from 'ol/events/condition';
import { boundingExtent } from 'ol/extent';
import { equals as olEquals } from 'ol/coordinate';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Collection from 'ol/Collection';
import WKT from 'ol/format/WKT';
import { getUid } from 'ol/util';


import { Util } from '../util';
import { MapView } from '../map';
import * as jsts from 'jsts';
import { Feature } from '../types/Feature';


const modifyStyle = [
    new Style({
        stroke: new Stroke({
            color: '#f00',
            width: 4
        }),
        image: new Circle({
            fill: new Fill({ color: 'rgba(0, 255, 0, 0.4)' }),
            stroke: new Stroke({ color: '#00ff03', width: 1.25 }),
            radius: 5
        })
    }),
    new Style({
        stroke: new Stroke({
            color: '#00ff03',
            width: 1.25
        })
    })
];

const invalidStyle = [
    new Style({
        image: new Circle({
            fill: new Fill({ color: 'rgba(255, 0, 0, 0.4)' }),
            stroke: new Stroke({ color: '#f00', width: 3 }),
            radius: 10
        })
    })
];


export class ModifyArea extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: Modify;
    dragBoxInteraction: DragBox;
    source: VectorSource;
    featuresCollection: Collection<OlFeature>;
    layer: VectorLayer;
    invalidLocationsLayer: VectorLayer;
    invalidLocationsSource: VectorSource;
    wktWriter: jsts.io.WKTWriter;
    wktFormat: WKT;
    jtsParser: jsts.io.OL3Parser;
    geomFactory: jsts.geom.GeometryFactory;

    options: any = {
        condition: undefined,
        deleteCondition: undefined,
        pixelTolerance: undefined,
        style: undefined,
        features: undefined,
        wrapX: undefined
    };

    events: any = {
        'change': undefined,
        'change:active': undefined,
        'modifyend': undefined,
        'modifystart': undefined,
        'propertychange': undefined
    };

    constructor(props) {
        super(props);

        this.featuresCollection = new Collection([]);
        this.source = new VectorSource({ wrapX: false, features: this.featuresCollection });
        this.invalidLocationsSource = new VectorSource({ wrapX: false });

        this.jtsParser = new jsts.io.OL3Parser();
        this.jtsParser.inject(Point, LineString, LinearRing, Polygon, MultiPoint, MultiLineString,
            MultiPolygon, GeometryCollection);

        this.wktWriter = new jsts.io.WKTWriter();
        this.wktFormat = new WKT();
        this.geomFactory = new jsts.geom.GeometryFactory();
    }

    render() {
        return null;
    }

    cutPolygonWithEnvelope(polygon, envelope) {
        const self = this;
        const envelopePolygon = self.geomFactory.toGeometry(envelope);

        let coords = polygon.getExteriorRing().getCoordinates();
        let newCoords = [];
        coords.forEach(function (coord) {
            if (!envelope.contains(coord)) {
                newCoords.push(coord)
            }
        });

        // do not let user delete whole geometry
        if (newCoords.length < 4) {
            return null;
        }

        if (newCoords[0].x != newCoords[newCoords.length - 1].x || newCoords[0].y != newCoords[newCoords.length - 1].y) {
            newCoords.push(newCoords[0]);
        }


        var linearRing = this.geomFactory.createLinearRing(newCoords);

        let i = 0;
        let holeGeometries = [];

        while (polygon.getInteriorRingN(i)) {
            if (polygon.getInteriorRingN(i).intersects(envelopePolygon)) {
                let coords = polygon.getInteriorRingN(i).getCoordinates();
                let newCoords = [];
                coords.forEach(function (coord) {
                    if (!envelope.contains(coord)) {
                        newCoords.push(coord)
                    }
                });

                try {
                    if (newCoords.length > 0) {
                        if (newCoords[0].x != newCoords[newCoords.length - 1].x || newCoords[0].y != newCoords[newCoords.length - 1].y) {
                            newCoords.push(newCoords[0]);
                        }

                        let hole = self.geomFactory.createLinearRing(newCoords);
                        if (hole.isValid()) {
                            holeGeometries.push(hole);
                        }
                    }
                } catch (e) {
                }

            } else {
                holeGeometries.push(polygon.getInteriorRingN(i));
            }

            i++;
        }

        var jstsPolygon = self.geomFactory.createPolygon(linearRing, holeGeometries);

        return jstsPolygon;
    }

    checkAreaValidity(feature) {
        const self = this;
        let geomInvalid = false;
        let jstsGeom = self.jtsParser.read(feature.getGeometry());

        const isValidOp = new jsts.operation.valid.IsValidOp();
        let valid = isValidOp.checkValid(jstsGeom);
        self.invalidLocationsSource.clear();

        if (isValidOp.getValidationError()) {
            geomInvalid = true;
            const errorCoordinate = isValidOp.getValidationError().getCoordinate();
            const olFeature = new OlFeature(new Point([errorCoordinate.x, errorCoordinate.y]));
            self.invalidLocationsSource.addFeature(olFeature);
        }

        return geomInvalid;
    }

    componentDidMount() {
        let self = this;
        let options = Util.getOptions(Object['assign'](this.options, this.props));

        this.layer = new VectorLayer({
            source: this.source,
            style: modifyStyle
        });

        this.context.mapComp.mapReadyCallbacks.push(() => {
            self.projection = self.context.mapComp.map.getView().getProjection().getCode();
        });

        this.invalidLocationsLayer = new VectorLayer({
            source: this.invalidLocationsSource,
            style: invalidStyle
        });

        if (this.props.zIndex) {
            this.layer.setZIndex(this.props.zIndex);
        } else {
            this.layer.setZIndex(100);
        }

        this.invalidLocationsLayer.setZIndex(this.layer.getZIndex() + 1);

        this.featuresCollection.extend(this.props.modifyFeatures || []);

        options.features = this.featuresCollection;
        options.style = modifyStyle;


        let deleteKeyDown = false;
        document.onkeypress = function (evt) {
            let charCode = evt.keyCode || evt.which;
            if (charCode === 127) {
                deleteKeyDown = true;
            }
        };

        document.onkeyup = function (evt) {
            deleteKeyDown = false;
            const int: any = self.interaction;
            int.dragSegments_ = [];
        };

        options.deleteCondition = function (evt) {
            if (deleteKeyDown) {
                return always(evt);
            } else {
                return never(evt);
            }
        };

        this.interaction = new Modify(options);

        this.dragBoxInteraction = new DragBox({
            condition: platformModifierKeyOnly
        });


        this.interaction.on('modifyend', function (e: Modify.Event) {
            let features = e.features.getArray();
            self.invalidLocationsSource.clear();
            let geomInvalid = false;


            for (var i = 0; i < features.length; i++) {
                geomInvalid = self.checkAreaValidity(features[i]);

                if (!geomInvalid) {

                    let jstsGeom = self.jtsParser.read(features[i].getGeometry());

                    if (jstsGeom.getGeometryType() == 'MultiPolygon') {
                        let i = 1;
                        let newGeom = jstsGeom.getGeometryN(0);
                        while (jstsGeom.getGeometryN(i)) {
                            newGeom = newGeom.union(jstsGeom.getGeometryN(i));
                            i++;
                        }

                        jstsGeom = newGeom;
                    }

                    const wkt = self.wktWriter.write(jstsGeom);
                    const resultFeature = self.wktFormat.readFeature(wkt);

                    features[i].setGeometry(resultFeature.getGeometry());
                }


            }

            const innerFeatures = features.map((f) => new Feature(f, self.projection));

            self.props.modifyend && self.props.modifyend(innerFeatures, geomInvalid);

        });

        this.dragBoxInteraction.on('boxend', function () {
            // features that intersect the box are added to the collection of
            // selected features
            const extent = self.dragBoxInteraction.getGeometry().getExtent();

            const envelope = new jsts.geom.Envelope(extent[0], extent[2], extent[1], extent[3]);
            const envelopePolygon = self.geomFactory.toGeometry(envelope);

            const feature = self.featuresCollection.getArray()[0];
            let geomA = self.jtsParser.read(feature.getGeometry());

            if (geomA.intersects(envelopePolygon)) {
                let jstsPolygon = null;
                if (geomA.getGeometryType() == "MultiPolygon") {
                    let i = 0;
                    let polygonGeometries = [];

                    while (geomA.getGeometryN(i)) {
                        let cutGeometry = self.cutPolygonWithEnvelope(geomA.getGeometryN(i), envelope);
                        if (cutGeometry) {
                            polygonGeometries.push(cutGeometry);
                        }
                        i++;
                    }

                    // if no geometries left then keep first one
                    if (polygonGeometries.length == 0) {
                        polygonGeometries.push(geomA.getGeometryN(0));
                    }

                    jstsPolygon = self.geomFactory.createMultiPolygon(polygonGeometries);
                } else {
                    jstsPolygon = self.cutPolygonWithEnvelope(geomA, envelope);
                    if (!jstsPolygon) {
                        jstsPolygon = geomA;
                    }
                }


                const wkt = self.wktWriter.write(jstsPolygon);
                const resultFeature = self.wktFormat.readFeature(wkt);

                feature.setGeometry(resultFeature.getGeometry());
                self.interaction.setActive(false);
                self.interaction.setActive(true);

                self.interaction.dispatchEvent(new Modify.Event(self.interaction.ModifyEventType.MODIFYEND, interaction.features_, null));

            }
        });

        const interaction: any = self.interaction;
        interaction.handleMoveEvent_ = function (evt, vertextCalculated = false) {
            if (!deleteKeyDown) {
                return;
            }

            if (!this.vertexFeature_) {
                this.handlePointerAtPixel_(evt.pixel, evt.map);
            }

            var pixelCoordinate = evt.map.getCoordinateFromPixel(evt.pixel);
            this.dragSegments_.length = 0;
            this.modified_ = false;
            var vertexFeature = this.vertexFeature_;
            if (vertexFeature) {
                var insertVertices = [];
                var geometry = /** @type {Point} */
                    vertexFeature.getGeometry();
                var vertex = geometry.getCoordinates();
                var vertexExtent = boundingExtent([vertex]);
                var segmentDataMatches = this.rBush_.getInExtent(vertexExtent);
                var componentSegments = {};
                const modifyInteraction: any = Modify;
                segmentDataMatches.sort(modifyInteraction.compareIndexes_);

                if (segmentDataMatches && segmentDataMatches.length > 0 && ((segmentDataMatches[0].feature.getGeometry().getCoordinates()[0][0] instanceof Array && segmentDataMatches[0].feature.getGeometry().getCoordinates()[0].length > 4) || segmentDataMatches[0].feature.getGeometry().getCoordinates().length > 4)) {
                    for (var i = 0, ii = segmentDataMatches.length; i < ii; ++i) {
                        var segmentDataMatch = segmentDataMatches[i];
                        var segment = segmentDataMatch.segment;
                        var uid = getUid(segmentDataMatch.feature);
                        var depth = segmentDataMatch.depth;
                        if (depth) {
                            uid += '-' + depth.join('-');
                            // separate feature components
                        }
                        if (!componentSegments[uid]) {
                            componentSegments[uid] = new Array(2);
                        }

                        if (segmentDataMatch.geometry.getType() === GeometryType.CIRCLE && segmentDataMatch.index === modifyInteraction.MODIFY_SEGMENT_CIRCLE_CIRCUMFERENCE_INDEX) {
                            var closestVertex = modifyInteraction.closestOnSegmentData_(pixelCoordinate, segmentDataMatch);
                            if (olEquals(closestVertex, vertex) && !componentSegments[uid][0]) {
                                this.dragSegments_.push([segmentDataMatch, 0]);
                                componentSegments[uid][0] = segmentDataMatch;
                            }
                        } else if (olEquals(segment[0], vertex) && !componentSegments[uid][0]) {
                            this.dragSegments_.push([segmentDataMatch, 0]);
                            componentSegments[uid][0] = segmentDataMatch;
                        } else if (olEquals(segment[1], vertex) && !componentSegments[uid][1]) {
                            // prevent dragging closed linestrings by the connecting node
                            if ((segmentDataMatch.geometry.getType() === GeometryType.LINE_STRING || segmentDataMatch.geometry.getType() === GeometryType.MULTI_LINE_STRING) && componentSegments[uid][0] && componentSegments[uid][0].index === 0) {
                                continue;
                            }
                            this.dragSegments_.push([segmentDataMatch, 1]);
                            componentSegments[uid][1] = segmentDataMatch;
                        }
                    }
                }
            }

            if (this.dragSegments_.length > 0) {
                this.removePoint();
                return this.handleMoveEvent_(evt, true);
            }

            return !!this.vertexFeature_;
        };

        let olEvents = Util.getEvents(this.events, this.props);
        for (let eventName in olEvents) {
            this.interaction.on(eventName, olEvents[eventName]);
        }

        if (!this.context.mapComp.map) {
            this.context.mapComp.interactions.push(this.interaction);
            this.context.mapComp.interactions.push(this.dragBoxInteraction);
            this.context.mapComp.layers.push(this.layer);
            this.context.mapComp.layers.push(this.invalidLocationsLayer);
        } else {
            this.context.mapComp.map.addInteraction(this.interaction);
            this.context.mapComp.map.addInteraction(this.dragBoxInteraction);
            this.context.mapComp.map.addLayer(this.layer);
            this.context.mapComp.map.addLayer(this.invalidLocationsLayer);
        }

    }

    componentWillReceiveProps(nextProps) {
        const self = this;
        if (nextProps !== this.props) {

            if (nextProps.modifyFeatures !== undefined && nextProps.modifyFeatures instanceof Array) {
                this.source.clear();
                this.invalidLocationsSource.clear();


                if (nextProps.modifyFeatures && nextProps.modifyFeatures.length > 0) {
                    this.interaction.setActive(false);

                    if (nextProps.modifyFeatures.length == 1) {
                        const mapFeature = nextProps.modifyFeatures[0].getMapFeature(this.projection);
                        this.source.addFeature(mapFeature);

                        this.checkAreaValidity(mapFeature);


                    } else {
                        this.source.addFeatures(nextProps.modifyFeatures.map((f) => f.getMapFeature(self.projection)));
                    }

                    this.interaction.setActive(true);
                }
            } else {
                this.source.clear();
            }
        }
    }

    componentWillUnmount() {
        this.context.mapComp.map.removeInteraction(this.interaction);
        this.context.mapComp.map.removeInteraction(this.dragBoxInteraction);
        this.context.mapComp.map.removeLayer(this.layer);
        this.context.mapComp.map.removeLayer(this.invalidLocationsLayer);
        this.featuresCollection.clear();
        this.invalidLocationsSource.clear();
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(Map)
    };
}