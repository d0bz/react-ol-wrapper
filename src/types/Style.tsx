import { Fill, Stroke, Circle, Style as OlStyle, Icon, Text } from 'ol/style';
import { pointerMove } from 'ol/events/condition';

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

	defaultStyle: any = new OlStyle({
		fill: new Fill({ color: '' }),
		stroke: new Stroke({ color: '', width: 1 })
	});

	cachedStyle: any;

	fillColor: any = [0, 153, 255, 1];
	strokeColor: any = [255, 255, 255, 0.75];
	strokeWidth: any = 1.5;
	circleRadius: any;
	imageSrc: any;
	imageAnchor: [number, number] = [0.5, 1];
	imageSize: [number, number];
	opacity: number = 1;
	scale: number = 1;
	text: string;
	textSize: number = 10;

	constructor(properties?: any) {
		if (properties) {
			this.setFillColor(properties.fillColor);
			this.setStrokeColor(properties.strokeColor);
			this.setStrokeWidth(properties.strokeWidth);
			this.setCircleRadius(properties.circleRadius);
			this.setImageSrc(properties.imageSrc);
			this.setImageSize(properties.imageSize);
			this.setOpacity(properties.opacity || this.opacity);
			this.setScale(properties.scale || this.scale);
			this.setImageAnchor(properties.imageAnchor || this.imageAnchor);
			this.setText(properties.text, properties.textSize);
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
		if (src) {
			this.imageSrc = src.replace(/#/g, '%23');
		}
	}

	setImageSize(size: [number, number]): void {
		if (size) {
			this.imageSize = size;
		}
	}

	getImageAnchor(): any | null {
		return this.imageAnchor;
	}

	setImageAnchor(anchor: any): void {
		this.imageAnchor = anchor;
	}

	setText(text: string, size: number): void {
		this.text = text ? text.toString() : null;
		if (size) {
			this.textSize = size;
		}
	}

	getMapStyle(): OlStyle {
		if (this.cachedStyle) {
			return this.cachedStyle;
		}

		if (this.imageSrc) {
			this.defaultStyle.setImage(
				new Icon(/** @type {module:ol/style/Icon~Options} */ ({
					anchor: this.imageAnchor,
					anchorXUnits: 'fraction',
					anchorYUnits: 'fraction',
					src: this.imageSrc,
					size: this.imageSize,
					opacity: this.opacity,
					scale: this.scale
				})));

			this.cachedStyle = this.defaultStyle;
			return this.defaultStyle;
		} else if (this.circleRadius) {
			this.defaultStyle.setImage(new Circle({
				radius: this.circleRadius,
				fill: new Fill({ color: this.fillColor }),
				stroke: new Stroke({
					color: this.strokeColor,
					width: this.strokeWidth
				})
			}));
		}

		const stroke = this.defaultStyle.getStroke();
		const fill = this.defaultStyle.getFill();

		fill.setColor(this.fillColor);
		stroke.setColor(this.strokeColor);
		stroke.setWidth(this.strokeWidth);

		if (this.text) {
			this.defaultStyle.setText(
				new Text({
					font: `${this.textSize}px sans-serif`,
					text: this.text,
					fill: fill,
					stroke: stroke
				})
			);
		}

		this.cachedStyle = this.defaultStyle;
		return this.defaultStyle;
	}
}