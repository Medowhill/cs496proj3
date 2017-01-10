import React from 'react';

class Completion extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
    	let getStyle = (line, position) => {
            let left = 13 + position * this.props.fontSize / 2;
            let top = 57 + line * this.props.lineHeight;
            let color = (this.props.selected) ? '#96b4dc' : '#ffffff';
    		return {backgroundColor: color, lineHeight: this.props.lineHeight + 'px', color: '#000000', zIndex: '2', position: 'absolute',
            left: left + 'px', top: top + 'px', fontSize: this.props.fontSize + 'px', fontFamily: this.props.fontFamily};
        };
    	
        return(
            <p style={getStyle(this.props.line, this.props.position)}>{this.props.word}</p>
        );
    }
}

export default Completion;