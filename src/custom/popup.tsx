import * as React from 'react';
import './popup.css';

export class Popup extends React.Component<any, any> {
    contentClose: HTMLElement;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const { onClose } = this.props;
        const self = this;
        this.contentClose.addEventListener("click", () => {
            if (onClose) {
                onClose();
            }
        });
    }

    render() {
        return (
            <div className="olPopup">
                <a className="olPopupCloser"
                   href="javascript:void(0)"
                   ref={el => this.contentClose = el}
                ></a>
                <div className="olPopupContents">
                    {this.props.children}
                </div>
            </div>
        );
    }
}