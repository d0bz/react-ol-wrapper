import * as ol from 'openlayers';

const wktFormat: ol.format.WKT = new ol.format.WKT();

/**
 * @component
 * Feature type definition. When initializing then using default projection as WGS:84
 *
 * <ul>
 * <li>id: Number - default generated randomly 13 digit number. is used to detect when modifying or selecting feature</li>
 * <li>wkt: string - Geometry in wkt, default projection should be WGS:84, if using different then definately include projection property</li>
 * <li>projection: string - Projection value, eg EPSG:3301, EPSG:4326"</li>
 * <li>properties: object - properties that should stay with object, usually filled when requesting features with service</li>
 * </ul>
 */
export class Feature {
    id: string|null = `${Math.floor(Math.random() * (9999999999999 - 0 + 1))}`;
    wkt: string|null;
    properties: Object|null;
    projection: string = "EPSG:4326";
    coordinates: Array<Number>|null;
    _feature: ol.Feature;

    constructor(props?: any, projection?: string) {
        if(props) {
            if (props instanceof ol.Feature) {
                this.readFromMapFeature(props, projection);
            } else {
                if(props.wkt) {
                    this.setGeometry(props.wkt);
                }
                this.setId(props.id || this.id);
                this.setProjection(props.projection || this.projection);
                this.setProperties(props.properties);
            }
        }
    }

    getGeometry(): string | null {
        return this.wkt;
    }

    setGeometry(wkt: string, projection?: string): void {
        this.wkt = wkt;
        let mapFeature = wktFormat.readFeature(this.wkt);
        if(!this._feature){
            this.createFeature();
        }
        const geom:any = mapFeature.getGeometry();
        this.setCoordinates(geom.getCoordinates());

        if(projection) {
            this.setProjection(projection);
        }
    }

    setProjection(projection: string): void {
        this.projection = projection;
    }

    getProjection(): string {
        return this.projection;
    }

    setCoordinates(coordinates: Array<Number>): void {
        this.coordinates = coordinates;
    }

    getCoordinates(): Array<Number> | null {
        return this.coordinates;
    }

    getCoordinatesTransformed(from: string, to:string): Array<Number> | null {
        if(!this._feature){
            this.createFeature();
        }

        const geom:any = this._feature.getGeometry();
        return geom.clone().transform(from, to).getCoordinates();
    }

    createFeature(){
        this._feature = new ol.Feature();
        this._feature.setProperties(this.getProperties());
        this._feature.setId(this.getId());

        if(this.wkt){
            let mapFeature = wktFormat.readFeature(this.wkt);
            this._feature.setGeometry(mapFeature.getGeometry());
            const geom:any = mapFeature.getGeometry();
            this.setCoordinates(geom.getCoordinates());
        }
    }

    readGeoJSON(geoJSON: Object): void {
        const format = new ol.format.GeoJSON();
        try{
            const geometry:any = format.readGeometry(geoJSON);
            if(!this._feature){
                this.createFeature();
            }

            this._feature.setGeometry(geometry);
            this.setGeometry(wktFormat.writeGeometry(geometry));

            this.setCoordinates(geometry.getCoordinates());
        }catch(e){
            throw new Error(e);
        }
    }

    getId(): string | null {
        return this.id;
    }

    setId(id: string | null): void {
        this.id = id;
    }

    getProperties(): any | null {
        return this.properties;
    }

    setProperties(properties: any): void {
        this.properties = properties;
    }

    readFromMapFeature(origFeature: ol.Feature, projection: string): void {
        let feature = origFeature.clone();
        if(projection && this.projection !== projection){
            feature.getGeometry().transform(projection, this.projection);
        }
        this._feature = origFeature;
        this.setGeometry(wktFormat.writeGeometry(feature.getGeometry()));
        const geom:any = feature.getGeometry();
        this.setCoordinates(geom.getCoordinates());
        let properties = feature.getProperties();
        delete properties.geometry;
        delete properties.style;
        this.setProperties(properties);
        if(origFeature.getId()) {
            this.id = `${origFeature.getId()}`;
        }else if(origFeature.get("id")) {
            this.id = `${origFeature.get("id")}`;
        }

        this._feature.setId(this.id);
    }

    getMapFeature(projection?: string): ol.Feature {
        let mapFeature = wktFormat.readFeature(this.wkt);

        if(!this._feature){
            this.createFeature();
        }
        let feature = this._feature;
        feature.setGeometry(mapFeature.getGeometry());
        feature.setProperties(this.properties);


        if(projection && this.projection !== projection){
            feature.getGeometry().transform(this.projection, projection);
        }

        return feature;
    }

}