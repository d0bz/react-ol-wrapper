import * as React from 'react';

export class Tools extends React.Component<any, any> {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div>{this.props.children}</div>);
    }
}
