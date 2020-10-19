import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Map } from 'ol';

import { Util } from '../util';

// I wish I can name it as 'layers', not 'Layers'
export class Controls extends React.Component<any, any> {

    options: any = {
        attribution: undefined,
        attributionOptions: undefined,
        rotate: undefined,
        rotateOptions: undefined,
        zoom: undefined,
        zoomOptions: undefined
    };

    constructor(props) {
        super(props);
        this.options = Util.getOptions(Object['assign'](this.options, this.props));
    }

    render() {
        return (<div>{this.props.children}</div>);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    static contextTypes: React.ValidationMap<any> = {
        map: PropTypes.instanceOf(Map)
    };

    static propTypes = {
        type: PropTypes.string
    };

    static defaultProps = {
        type: "Controls"
    }
}