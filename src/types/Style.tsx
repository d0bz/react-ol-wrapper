import * as ol from 'openlayers';

/**
 * @component
 * Style type definition
 *
 * <ul>
 * <li>fillColor: [Number, Number, Number, Number] - default [0, 153, 255, 1]</li>
 * <li>strokeColor: [Number, Number, Number, Number] - default [255, 255, 255, 0.75]</li>
 * <li>strokeWidth: number - default 1.5</li>
 * <li>circleRadius: number</li>
 * <li>imageSrc: string</li>
 * <li>imageAnchor: [Number, Number] - default [0.5, 1]</li>
 * <li>opacity: number - default 1</li>
 * <li>scale: number - default 1</li>
 * </ul>
 */
export class Style {

    fillColor: any = [0, 153, 255, 1];
    strokeColor: any = [255, 255, 255, 0.75];
    strokeWidth: any = 1.5;
    circleRadius: any;
    imageSrc: any;
    imageAnchor: [number, number] = [0.5, 1];
    opacity: number = 1;
    scale: number = 1;

    constructor(properties?: any) {
        if (properties) {
            this.setFillColor(properties.fillColor);
            this.setStrokeColor(properties.strokeColor);
            this.setStrokeWidth(properties.strokeWidth);
            this.setCircleRadius(properties.circleRadius);
            this.setImageSrc(properties.imageSrc);
            this.setOpacity(properties.opacity || this.opacity);
            this.setScale(properties.scale || this.scale);
            this.setImageAnchor(properties.imageAnchor || this.imageAnchor);
        }
    }

    getFillColor(): any | null {
        return this.fillColor;
    }

    setFillColor(color: any): void {
        this.fillColor = color;
    }

    getOpacity(): any | null {
        return this.opacity;
    }

    setOpacity(opacity: any): void {
        this.opacity = opacity;
    }

    setScale(scale: any): void {
        this.scale = scale;
    }

    getStrokeColor(): any | null {
        return this.strokeColor;
    }

    setStrokeColor(color: any): void {
        this.strokeColor = color;
    }

    getStrokeWidth(): any | null {
        return this.strokeWidth;
    }

    setStrokeWidth(width: any): void {
        this.strokeWidth = width;
    }

    getCircleRadius(): any | null {
        return this.circleRadius;
    }

    setCircleRadius(radius: any): void {
        this.circleRadius = radius;
    }

    getImageSrc(): any | null {
        return this.imageSrc;
    }

    setImageSrc(src: any): void {
        this.imageSrc = src;
    }

    getImageAnchor(): any | null {
        return this.imageAnchor;
    }

    setImageAnchor(anchor: any): void {
        this.imageAnchor = anchor;
    }

    getMapStyle(): ol.style.Style {
        if (this.imageSrc) {
            return new ol.style.Style({
                image: new ol.style.Icon(/** @type {module:ol/style/Icon~Options} */ ({
                    anchor: this.imageAnchor,
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    src: this.imageSrc,
                    opacity: this.opacity,
                    scale: this.scale
                }))
            });
        }

        if (this.circleRadius) {
            return new ol.style.Style({
                fill: new ol.style.Fill({ color: this.fillColor }),
                stroke: new ol.style.Stroke({ color: this.strokeColor, width: this.strokeWidth }),
                image: new ol.style.Circle({
                    radius: this.circleRadius,
                    fill: new ol.style.Fill({ color: this.fillColor }),
                    stroke: new ol.style.Stroke({ color: this.strokeColor, width: this.strokeWidth })
                })
            });
        }


        return new ol.style.Style({
            fill: new ol.style.Fill({ color: this.fillColor }),
            stroke: new ol.style.Stroke({ color: this.strokeColor, width: this.fillColor })
        });

    }
}