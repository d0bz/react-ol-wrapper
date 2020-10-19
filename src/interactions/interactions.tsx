import * as React from 'react';
import * as PropTypes from 'prop-types';

export class Interactions extends React.Component<any, any> {
    render() {
        return (<div>{this.props.children}</div>);
    }

    static propTypes = {
        type: PropTypes.string
    };

    static defaultProps = {
        type: "Interactions"
    }
}