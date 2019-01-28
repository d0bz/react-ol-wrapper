import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ol from 'openlayers';
import { Util } from "../util";
import { MapView } from '../map';
import * as jsts from 'jsts';
import  { Feature }  from '../types/Feature';

const resultStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#f00',
        width: 4
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255,0,0,0)'
    })
});

const selectStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#3399cc',
        width: 1
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255,255,255,0.2)'
    })
});

const lineStyle = [
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#f00',
            width: 4
        })
    }),
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#00ff03',
            width: 1.25
        })
    })
];

const openlayers:any = ol;
const olGeom:any = ol.geom;
const olCoordinate:any = ol.coordinate;
const olGeomGeometryType:any = olGeom.GeometryType;
const olInteractionModify:any = ol.interaction.Modify;
const olInteraction:any = ol.interaction;
const olInteractionModifyEventType:any = olInteraction.ModifyEventType;

const REQUEST_ID = "BORDER_EDIT_FEATURE_REQUEST";

export class BorderEdit extends React.Component<any, any> {

    projection: string = "EPSG:3857";
    interaction: ol.interaction.Draw;
    selectInteraction: ol.interaction.Select;
    source: ol.source.Vector;
    layer: ol.layer.Vector;
    resultSource: ol.source.Vector;
    resultLayer: ol.layer.Vector;
    wktWriter: jsts.io.WKTWriter;
    unionGeomWithBuffer: jsts.geom.Geometry;
    dragLineEnding: boolean;
    snappedToBorder: boolean;
    wktFormat: ol.format.WKT;
    jtsParser: jsts.io.OL3Parser;
    features: ol.Collection<ol.Feature>;
    unionFeature: Feature;
    lineFeature: Feature;
    geojsonFormat: ol.format.GeoJSON;
    modifyInteraction: ol.interaction.Modify;
    lineLayer: ol.layer.Vector;
    lineSource: ol.source.Vector;
    geomFactory: jsts.geom.GeometryFactory;
    dragBoxInteraction: ol.interaction.DragBox;
    snapInteraction: ol.interaction.Snap;
    snapFeatures: ol.Collection<ol.Feature>;


    options: any = {};
    events: any = {};

    unselectLastSelected: (Event) => void;

    constructor(props) {
        super(props);
        this.features = new ol.Collection([]);
        this.source = new ol.source.Vector({ wrapX: false, features: this.features });
        this.resultSource = new ol.source.Vector({ wrapX: false });
        this.lineSource = new ol.source.Vector({ wrapX: false });
        this.snapFeatures = new ol.Collection([]);


        this.geojsonFormat = new ol.format.GeoJSON();

        this.jtsParser = new jsts.io.OL3Parser();
        this.jtsParser.inject(ol.geom.Point, ol.geom.LineString, ol.geom.LinearRing, ol.geom.Polygon, ol.geom.MultiPoint, ol.geom.MultiLineString,
            ol.geom.MultiPolygon, ol.geom.GeometryCollection);

        this.wktWriter = new jsts.io.WKTWriter();
        this.wktFormat = new ol.format.WKT();
        this.geomFactory = new jsts.geom.GeometryFactory();

        this.dragBoxInteraction = new ol.interaction.DragBox({
            condition: ol.events.condition.platformModifierKeyOnly
        });

        this.snappedToBorder = false;
        this.dragLineEnding = false;
        this.unionGeomWithBuffer = null;
        this.unionFeature = null;
    }

    render() {
        return null;
    }

    cutLineStringWithEnvelope(lineString, envelope) {
        const self = this;
        const envelopePolygon = self.geomFactory.toGeometry(envelope);

        let coords = lineString.getCoordinates();
        let newCoords = [];

        for (var x = 0; x < coords.length; x++) {
            // include start and end and those who wont intersect with envelope
            if (x == 0 || x == coords.length - 1 || !envelope.contains(coords[x])) {
                newCoords.push(coords[x]);
            }
        }

        // do not let user delete whole geometry
        if (newCoords.length < 2) {
            return lineString;
        }

        return this.geomFactory.createLineString(newCoords);
    }

    componentDidMount() {
        const self = this;
        let options = Util.getOptions(Object['assign'](this.options, this.props));

        this.context.mapComp.mapReadyCallbacks.push(() => {
            self.projection = self.context.mapComp.map.getView().getProjection().getCode();
        });

        this.layer = new ol.layer.Vector({
            source: this.source,
            style: selectStyle
        });

        this.resultLayer = new ol.layer.Vector({
            source: this.resultSource,
            style: resultStyle
        });

        this.lineLayer = new ol.layer.Vector({
            source: this.lineSource,
            style: lineStyle
        });

        this.lineLayer.setZIndex(101);

        if (this.props.zIndex) {
            this.layer.setZIndex(this.props.zIndex);
        } else {
            this.layer.setZIndex(100);
        }

        this.resultLayer.setZIndex(this.layer.getZIndex() - 1);


        this.dragBoxInteraction.on('boxend', function () {
            // features that intersect the box are added to the collection of
            // selected features
            const extent = self.dragBoxInteraction.getGeometry().getExtent();

            const envelope = new jsts.geom.Envelope(extent[0], extent[2], extent[1], extent[3]);
            const envelopePolygon = self.geomFactory.toGeometry(envelope);

            const feature = self.lineSource.getFeatures()[0];
            let geomA = self.jtsParser.read(feature.getGeometry());

            if (geomA.intersects(envelopePolygon)) {
                let jstsLineString = self.cutLineStringWithEnvelope(geomA, envelope);

                const wkt = self.wktWriter.write(jstsLineString);
                const resultFeature = self.wktFormat.readFeature(wkt);

                feature.setGeometry(resultFeature.getGeometry());
                self.modifyInteraction.setActive(false);
                self.modifyInteraction.setActive(true);

                const modifyInteraction:any = self.modifyInteraction;
                self.modifyInteraction.dispatchEvent(new olInteractionModify.Event(olInteractionModifyEventType.MODIFYEND, modifyInteraction.features_, null));

            }
        });

        if (!this.context.mapComp.map) {
            this.context.mapComp.interactions.push(this.dragBoxInteraction);
            this.context.mapComp.layers.push(this.layer);
            this.context.mapComp.layers.push(this.resultLayer);
            this.context.mapComp.layers.push(this.lineLayer);
        } else {
            this.context.mapComp.map.addInteraction(this.dragBoxInteraction);
            this.context.mapComp.map.addLayer(this.layer);
            this.context.mapComp.map.addLayer(this.resultLayer);
            this.context.mapComp.map.addLayer(this.lineLayer);
        }
    }

    componentWillReceiveProps(nextProps) {
        var self = this;
        if (nextProps !== this.props && nextProps.active !== this.props.active) {

            if (this.props.active) {
                this.selectionActive(false, nextProps);

                this.features.clear();
                this.resultSource.clear();
                this.lineSource.clear();
                this.snapFeatures.clear();
                this.lineFeature = null;
                this.unionFeature = null;
            }

            // interaction activated
            if (nextProps.active) {
                this.selectionActive(true, nextProps);
            }
        }

        if (nextProps.active && ((!nextProps.lineFeature && self.lineFeature) || (nextProps.lineFeature && !self.lineFeature))) {
            self.addLineFeature(nextProps.lineFeature);
        }

        if (nextProps.active && self.lineFeature && ((!nextProps.unionFeature && self.unionFeature) || (nextProps.unionFeature && !self.unionFeature))) {
            self.addUnionFeature(nextProps.unionFeature);
        }

        if (nextProps.active && nextProps.features && (nextProps.features.length != this.features.getLength())) {
            self.clearFeatures();
            self.addFeatures(nextProps.features);
        }

    }

    mapOnClick(evt) {
        const coordinate = evt.coordinate;
        const extent = new ol.geom.Circle(coordinate, 0.01).getExtent(); // radius in meters
        this.requestWFSFeatures(extent);
    }

    requestWFSFeatures(extent) {
        const { wfsLayerDescription } = this.props;
        const self = this;

        const requestNode = Util.buildWFSGetFeatureRequestElement({
            geometryPropertyName: wfsLayerDescription.geometryPropertyName,
            featureType: wfsLayerDescription.featureType,
            featureNS: wfsLayerDescription.featureNS,
            srsName: self.context.mapComp.map.getView().getProjection().getCode(),
            bbox: extent,
            cqlFilter: wfsLayerDescription.cqlFilter
        });

        Util.requestWFS(requestNode, wfsLayerDescription.url, true, REQUEST_ID).then((resp) => {
            resp.features.forEach((feature) => {
                self.toggleFeature(feature);
            });

            self.selectionChanged();
        });
    }

    areaSelected(event) {
        Util.stopRequestWFS(REQUEST_ID);
        const feature = event.selected[0];
        this.toggleFeature(feature);
        this.selectionChanged();
    }

    selectionChanged() {
        const self = this;
        // when more than one area selected then we can allow user to merge areas
        const features = this.features.getArray();

        if (features.length == 2) {
            self.selectionActive(false, this.props);
            self.modifyFeatures(features);
        }

        this.sendSelectionChanged();
    }

    sendSelectionChanged() {
        const self = this;
        let features = this.features.getArray();
        let innerFeatures = features.map((f) => {
            return new Feature(f, self.projection);
        });

        this.props.selectionChanged(innerFeatures, this.unionFeature, this.lineFeature);
    }

    toggleFeature(feature: Feature) {
        // If feature already exists then remove 
        const self = this;
        let featureFound = false;

        for (var x = this.features.getLength() - 1; x >= 0; x--) {
            let f = this.features.item(x);
            if (f.getId() === feature.getId()) {
                featureFound = true;
                self.features.remove(f);
            }
        }

        if (!featureFound) {
            this.features.push(feature.getMapFeature(self.projection));
        }
    }

    clearFeatures() {
        this.features.clear();
        this.resultSource.clear();
        this.snapFeatures.clear();
        this.lineSource.clear();
    }

    modifyFeatures(features) {
        const self = this;
        let resultFeature = null;

        if (features.length > 1) {

            let geomA = this.jtsParser.read(features[0].getGeometry());
            if (!geomA.isValid()) {
                geomA = geomA.buffer(-0.00001).buffer(0.00001);
            }

            let geomB = self.jtsParser.read(features[1].getGeometry());
            if (!geomB.isValid()) {
                geomB = geomB.buffer(-0.00001).buffer(0.00001);
            }

            // remove overlaping areas which would cause polygon result 
            geomA = geomA.difference(geomB);

            let intersectionGeom = geomA.intersection(geomB);

            if (["GeometryCollection", "MultiLineString"].indexOf(intersectionGeom.getGeometryType()) !== -1) {
                let i = 0;
                let coordinates = [];
                while (intersectionGeom.getGeometryN(i)) {
                    let geom = intersectionGeom.getGeometryN(i);
                    if (geom.getGeometryType().indexOf("LineString") === 0) {
                        let geomCoordinates = geom.getCoordinates();

                        if (!coordinates[coordinates.length] || coordinates[coordinates.length].toString() !== geomCoordinates[0].toString()) {
                            coordinates.push(geomCoordinates[0]);
                        }

                        for (let x = 1; x < geomCoordinates.length; x++) {
                            coordinates.push(geomCoordinates[x]);
                        }
                    } else if (geom.getGeometryType().indexOf("Polygon") === 0) {
                        let geomCoordinates = geom.getExteriorRing().getCoordinates();
                        geomCoordinates.pop();

                        let addToTheEnd = true;
                        for (let x = 0; x < geomCoordinates.length; x++) {
                            // add to the start of coordinates
                            if (geomCoordinates[x].toString() == coordinates[0].toString()) {
                                addToTheEnd = false;
                                let beginning = geomCoordinates.slice(0, x).reverse();
                                let endCoordinates = geomCoordinates.slice(x + 1, geomCoordinates.length).reverse();

                                geomCoordinates = beginning.concat(endCoordinates).reverse();

                                break;
                            }
                        }

                        if (addToTheEnd) {
                            for (let x = 0; x < geomCoordinates.length; x++) {
                                if (!coordinates[coordinates.length] || coordinates[coordinates.length].toString() !== geomCoordinates[x].toString()) {
                                    coordinates.push(geomCoordinates[x]);
                                }
                            }
                        } else {
                            coordinates = geomCoordinates.concat(coordinates);
                        }
                    }
                    i++;
                }
                intersectionGeom = self.geomFactory.createLineString(coordinates);
            }

            if (intersectionGeom.getGeometryType().indexOf("LineString") !== -1) {

                const unionGeom = geomA.union(geomB);

                self.unionGeomWithBuffer = unionGeom.buffer(1);
                const unionWKT = self.wktWriter.write(unionGeom);
                const unionFeature = self.wktFormat.readFeature(unionWKT);

                self.addUnionFeature(new Feature(unionFeature, self.projection));

                self.activateModifyInteraction.call(self);

                const wkt = self.wktWriter.write(intersectionGeom);
                resultFeature = self.wktFormat.readFeature(wkt);
                self.addLineFeature(resultFeature);

                self.selectionActive(false, this.props);
                self.sendSelectionChanged();
            } else {
                this.addLineFeature(null);
                this.addUnionFeature(null);
                this.sendSelectionChanged();

                this.onError("noline");
            }
        }
    }

    onError(error) {
        if (this.props.onError) {
            this.props.onError(error);
        } else {
            console.error(error);
        }
    }

    modifyEnd(evt) {
        this.addLineFeature(evt.features.getArray()[0]);
        this.sendSelectionChanged();
    }

    addLineFeature(feature) {
        this.lineFeature = feature;

        if (!this.lineFeature) {

            this.selectionActive(true, this.props);
            this.features.clear();
            this.resultSource.clear();
            this.lineSource.clear();
            this.snapFeatures.clear();

            this.selectionChanged();
        } else {
            this.lineSource.clear();
            this.lineSource.addFeature(feature);
        }
    }

    addUnionFeature(feature: Feature|null) {
        const self = this;
        this.unionFeature = feature;

        if (!this.unionFeature) {
            this.selectionActive(true, this.props);
            this.features.clear();
            this.resultSource.clear();
            this.lineSource.clear();
            this.snapFeatures.clear();
        } else {
            this.resultSource.clear();
            this.resultSource.addFeature(this.unionFeature.getMapFeature(self.projection));

            const mapFeature = self.wktFormat.readFeature(this.unionFeature.getGeometry());

            this.snapFeatures.clear();
            this.snapFeatures.push(mapFeature);

            setTimeout(function () {
                self.activateSnapInteraction.call(self);
            }, 100)
        }
    }

    selectionActive(state, nextProps) {
        const self = this;

        if (this.selectInteraction) {
            this.context.mapComp.map.removeInteraction(this.selectInteraction);
        }

        if (self.unselectLastSelected) {
            document.removeEventListener('keydown', self.unselectLastSelected, false);
        }

        this.context.mapComp.map.un('click', self.mapOnClick, self);


        if (state) {
            let options = Util.getOptions(Object['assign'](this.options, nextProps));

            this.context.mapComp.map.getLayers().forEach(function (layer) {
                if (layer.getSource() == nextProps.source) {
                    options.layers = [layer];
                }
            });

            this.selectInteraction = new ol.interaction.Select(options);
            this.selectInteraction.on("select", (e) => self.areaSelected(e));

            if (nextProps.wfsLayerDescription) {
                this.context.mapComp.map.on('click', self.mapOnClick, self);
            }
            //this.selectedFeatures.clear();
            //this.context.mapComp.map.addInteraction(this.selectInteraction);


            self.unselectLastSelected = (e: Event) => {
                // backspace
                const event:any = e;
                if (event.which == 8 && self.features.getLength() > 0) {
                    self.features.removeAt(self.features.getLength() - 1);
                    self.selectionChanged();
                }
            };

            document.addEventListener('keydown', self.unselectLastSelected, false);
        }
    }

    activateSnapInteraction() {
        const self = this;
        if (this.snapInteraction) {
            this.context.mapComp.map.removeInteraction(this.snapInteraction);
        }

        self.snapInteraction = new ol.interaction.Snap({
            features: self.snapFeatures,
            pixelTolerance: 20
        });


        const snapInteraction:any = self.snapInteraction;
        snapInteraction.snapTo = function (pixel, pixelCoordinate, map) {
            var lowerLeft = map.getCoordinateFromPixel([pixel[0] - this.pixelTolerance_, pixel[1] + this.pixelTolerance_]);
            var upperRight = map.getCoordinateFromPixel([pixel[0] + this.pixelTolerance_, pixel[1] - this.pixelTolerance_]);
            var box = ol.extent.boundingExtent([lowerLeft, upperRight]);
            var segments = this.rBush_.getInExtent(box);
            // If snapping on vertices only, don't consider circles
            if (this.vertex_ && !this.edge_) {
                segments = segments.filter(function (segment) {
                    return segment.feature.getGeometry().getType() !== olGeomGeometryType.CIRCLE;
                });
            }
            var snappedToVertex = false;
            var snapped = false;
            self.snappedToBorder = false;

            var vertex = null;
            var vertexPixel = null;
            var dist, pixel1, pixel2, squaredDist1, squaredDist2;
            if (segments.length > 0) {
                this.pixelCoordinate_ = pixelCoordinate;
                segments.sort(this.sortByDistance_);
                var closestSegment = segments[0].segment;
                var isCircle = segments[0].feature.getGeometry().getType() === olGeomGeometryType.CIRCLE;
                if (this.vertex_ && !this.edge_) {
                    pixel1 = map.getPixelFromCoordinate(closestSegment[0]);
                    pixel2 = map.getPixelFromCoordinate(closestSegment[1]);
                    squaredDist1 = olCoordinate.squaredDistance(pixel, pixel1);
                    squaredDist2 = olCoordinate.squaredDistance(pixel, pixel2);
                    dist = Math.sqrt(Math.min(squaredDist1, squaredDist2));
                    snappedToVertex = dist <= this.pixelTolerance_;
                    if (snappedToVertex) {
                        snapped = true;
                        vertex = squaredDist1 > squaredDist2 ? closestSegment[1] : closestSegment[0];
                        vertexPixel = map.getPixelFromCoordinate(vertex);
                    }
                } else if (this.edge_) {
                    if (isCircle) {
                        vertex = olCoordinate.closestOnCircle(pixelCoordinate, /** @type {ol.geom.Circle} */
                            segments[0].feature.getGeometry());
                    } else {
                        vertex = olCoordinate.closestOnSegment(pixelCoordinate, closestSegment);
                    }
                    vertexPixel = map.getPixelFromCoordinate(vertex);
                    if (olCoordinate.distance(pixel, vertexPixel) <= this.pixelTolerance_) {
                        snapped = true;
                        if (this.vertex_ && !isCircle) {
                            pixel1 = map.getPixelFromCoordinate(closestSegment[0]);
                            pixel2 = map.getPixelFromCoordinate(closestSegment[1]);
                            squaredDist1 = olCoordinate.squaredDistance(vertexPixel, pixel1);
                            squaredDist2 = olCoordinate.squaredDistance(vertexPixel, pixel2);
                            dist = Math.sqrt(Math.min(squaredDist1, squaredDist2));
                            snappedToVertex = dist <= this.pixelTolerance_;
                            if (snappedToVertex) {
                                vertex = squaredDist1 > squaredDist2 ? closestSegment[1] : closestSegment[0];
                                vertexPixel = map.getPixelFromCoordinate(vertex);
                            }
                        }
                    }
                }
                if (snapped) {
                    self.snappedToBorder = true;
                    vertexPixel = [Math.round(vertexPixel[0]), Math.round(vertexPixel[1])];
                }
            }
            return (/** @type {ol.SnapResultType} */
                {
                    snapped: snapped,
                    vertex: vertex,
                    vertexPixel: vertexPixel
                });
        }
        ;

        self.context.mapComp.map.addInteraction(self.snapInteraction);
    }

    activateModifyInteraction() {
        const self = this;

        if (this.modifyInteraction) {
            this.context.mapComp.map.removeInteraction(this.modifyInteraction);
        }

        self.modifyInteraction = new ol.interaction.Modify({
            source: self.lineSource,
            deleteCondition: function (event) {
                return ol.events.condition.shiftKeyOnly(event) &&
                    ol.events.condition.singleClick(event);
            }
        });

        self.dragLineEnding = false;
        const modifyInteraction:any = self.modifyInteraction;
        modifyInteraction.handleDownEvent_ = function (evt) {
            self.dragLineEnding = false;

            if (!this.condition_(evt)) {
                return false;
            }
            this.handlePointerAtPixel_(evt.pixel, evt.map);
            var pixelCoordinate = evt.map.getCoordinateFromPixel(evt.pixel);
            this.dragSegments_.length = 0;
            this.modified_ = false;
            var vertexFeature = this.vertexFeature_;
            if (vertexFeature) {
                var insertVertices = [];
                var geometry = /** @type {ol.geom.Point} */
                    vertexFeature.getGeometry();
                var vertex = geometry.getCoordinates();
                var vertexExtent = ol.extent.boundingExtent([vertex]);
                var segmentDataMatches = this.rBush_.getInExtent(vertexExtent);
                var componentSegments = {};
                const olInteractionModify:any = ol.interaction.Modify;
                segmentDataMatches.sort(olInteractionModify.compareIndexes_);
                for (var i = 0, ii = segmentDataMatches.length; i < ii; ++i) {
                    var segmentDataMatch = segmentDataMatches[i];
                    var segment = segmentDataMatch.segment;
                    var uid = openlayers.getUid(segmentDataMatch.feature);
                    var depth = segmentDataMatch.depth;
                    if (depth) {
                        uid += '-' + depth.join('-');
                        // separate feature components
                    }
                    if (!componentSegments[uid]) {
                        componentSegments[uid] = new Array(2);
                    }
                    if (segmentDataMatch.geometry.getType() === olGeomGeometryType.CIRCLE && segmentDataMatch.index === olInteractionModify.MODIFY_SEGMENT_CIRCLE_CIRCUMFERENCE_INDEX) {
                        var closestVertex = olInteractionModify.closestOnSegmentData_(pixelCoordinate, segmentDataMatch);
                        if (olCoordinate.equals(closestVertex, vertex) && !componentSegments[uid][0]) {
                            this.dragSegments_.push([segmentDataMatch, 0]);
                            componentSegments[uid][0] = segmentDataMatch;
                        }
                    } else if (olCoordinate.equals(segment[0], vertex) && !componentSegments[uid][0]) {
                        this.dragSegments_.push([segmentDataMatch, 0]);
                        componentSegments[uid][0] = segmentDataMatch;

                        let geom = segmentDataMatch.feature.getGeometry();

                        if (
                            (geom.getFirstCoordinate()[0] == vertex[0] && geom.getFirstCoordinate()[1] == vertex[1]) ||
                            (geom.getLastCoordinate()[0] == vertex[0] && geom.getLastCoordinate()[1] == vertex[1])
                        ) {
                            self.dragLineEnding = true;
                        }

                    } else if (olCoordinate.equals(segment[1], vertex) && !componentSegments[uid][1]) {
                        // prevent dragging closed linestrings by the connecting node
                        if ((segmentDataMatch.geometry.getType() === olGeomGeometryType.LINE_STRING || segmentDataMatch.geometry.getType() === olGeomGeometryType.MULTI_LINE_STRING) && componentSegments[uid][0] && componentSegments[uid][0].index === 0) {
                            continue;
                        }
                        this.dragSegments_.push([segmentDataMatch, 1]);
                        componentSegments[uid][1] = segmentDataMatch;

                        let geom = segmentDataMatch.feature.getGeometry();

                        if (
                            (geom.getFirstCoordinate()[0] == vertex[0] && geom.getFirstCoordinate()[1] == vertex[1]) ||
                            (geom.getLastCoordinate()[0] == vertex[0] && geom.getLastCoordinate()[1] == vertex[1])
                        ) {
                            self.dragLineEnding = true;
                        }


                    } else if (this.insertVertexCondition_(evt) && openlayers.getUid(segment) in this.vertexSegments_ && !componentSegments[uid][0] && !componentSegments[uid][1]) {
                        insertVertices.push([segmentDataMatch, vertex]);
                    }
                }
                if (insertVertices.length) {
                    this.willModifyFeatures_(evt);
                }
                for (var j = insertVertices.length - 1; j >= 0; --j) {
                    this.insertVertex_.apply(this, insertVertices[j]);
                }
            }
            return !!this.vertexFeature_;
        }
        ;


        modifyInteraction.handleDragEvent_ = function (evt) {
            this.ignoreNextSingleClick_ = false;
            this.willModifyFeatures_(evt);

            var vertex = evt.coordinate;
            for (var i = 0, ii = this.dragSegments_.length; i < ii; ++i) {
                var dragSegment = this.dragSegments_[i];
                var segmentData = dragSegment[0];
                var depth = segmentData.depth;
                var geometry = segmentData.geometry;
                var coordinates;
                var segment = segmentData.segment;
                var index = dragSegment[1];

                while (vertex.length < geometry.getStride()) {
                    vertex.push(segment[index][vertex.length]);
                }

                switch (geometry.getType()) {
                    case olGeomGeometryType.POINT:
                        coordinates = vertex;
                        segment[0] = segment[1] = vertex;
                        break;
                    case olGeomGeometryType.MULTI_POINT:
                        coordinates = geometry.getCoordinates();
                        coordinates[segmentData.index] = vertex;
                        segment[0] = segment[1] = vertex;
                        break;
                    case olGeomGeometryType.LINE_STRING:

                        if ((self.dragLineEnding && self.snappedToBorder) ||
                            (
                                !self.dragLineEnding &&
                                self.unionGeomWithBuffer.contains(self.geomFactory.createPoint(new jsts.geom.Coordinate({ x: vertex[0], y: vertex[1] })))
                            )
                        ) {
                            coordinates = geometry.getCoordinates();
                            coordinates[segmentData.index + index] = vertex;
                            segment[index] = vertex;
                        }
                        break;
                    case olGeomGeometryType.MULTI_LINE_STRING:
                        coordinates = geometry.getCoordinates();
                        coordinates[depth[0]][segmentData.index + index] = vertex;
                        segment[index] = vertex;
                        break;
                    case olGeomGeometryType.POLYGON:
                        coordinates = geometry.getCoordinates();
                        coordinates[depth[0]][segmentData.index + index] = vertex;
                        segment[index] = vertex;
                        break;
                    case olGeomGeometryType.MULTI_POLYGON:
                        coordinates = geometry.getCoordinates();
                        coordinates[depth[1]][depth[0]][segmentData.index + index] = vertex;
                        segment[index] = vertex;
                        break;
                    case olGeomGeometryType.CIRCLE:
                        segment[0] = segment[1] = vertex;
                        if (segmentData.index === olInteractionModify.MODIFY_SEGMENT_CIRCLE_CENTER_INDEX) {
                            this.changingFeature_ = true;
                            geometry.setCenter(vertex);
                            this.changingFeature_ = false;
                        } else { // We're dragging the circle's circumference:
                            this.changingFeature_ = true;
                            geometry.setRadius(olCoordinate.distance(geometry.getCenter(), vertex));
                            this.changingFeature_ = false;
                        }
                        break;
                    default:
                    // pass
                }

                if (coordinates) {
                    this.setGeometryCoordinates_(geometry, coordinates);
                }
            }
            this.createOrUpdateVertexFeature_(vertex);
        };

        self.modifyInteraction.on('modifyend', self.modifyEnd, self);
        self.context.mapComp.map.addInteraction(self.modifyInteraction);

    }

    addFeatures(features) {
        if (features && features.length > 1) {
            if (features.length > 2) {
                features = features.slice(0, 2); // max 2 elements
            }
            this.features.clear();
            this.features.extend(features);

            this.modifyFeatures(features);
        } else if (features && features.length == 1) {

            this.features.extend(features);

        } else {
            this.selectionActive(true, this.props);
        }
    }

    componentWillUnmount() {
        this.selectionActive(false, this.props);

        if (this.modifyInteraction) {
            this.context.mapComp.map.removeInteraction(this.modifyInteraction);
        }

        if (this.dragBoxInteraction) {
            this.context.mapComp.map.removeInteraction(this.dragBoxInteraction);
        }

        if (this.snapInteraction) {
            this.context.mapComp.map.removeInteraction(this.snapInteraction);
        }

        this.features.clear();
        this.resultSource.clear();
        this.lineSource.clear();
        this.snapFeatures.clear();


        this.context.mapComp.map.removeLayer(this.layer);
        this.context.mapComp.map.removeLayer(this.resultLayer);
        this.context.mapComp.map.removeLayer(this.lineLayer);
    }

    static contextTypes: React.ValidationMap<any> = {
        mapComp: PropTypes.instanceOf(MapView),
        map: PropTypes.instanceOf(ol.Map)
    };
}