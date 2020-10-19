import * as React from 'react';
import * as PropTypes from 'prop-types';

// I wish I can name it as 'layers', not 'Layers'
export class Layers extends React.Component<any, any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div>{this.props.children}</div>);
    }

    static propTypes = {
        type: PropTypes.string
    };

    static defaultProps = {
        type: "Layers"
    }
}
