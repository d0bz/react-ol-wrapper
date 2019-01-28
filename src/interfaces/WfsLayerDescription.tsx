/**
 * @component
 */
export interface WfsLayerDescription {
	url: string;
	geometryPropertyName: string;
	featureType: string;
	featureNS: string;
	cqlFilter: string;
}