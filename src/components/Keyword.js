import React from 'react';

class Keyword extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
    	let getStyle = (line, position, color) => {
            let _left = 13 + position * 7.7;
            let _top = 57 + line * this.props.lineHeight;
            let _color;
            switch (color) {
                case 0: _color = '#f92672'; break;
                case 1: _color = '#66d9ef'; break;
                case 2: _color = '#fd971f'; break;
                case 3: _color = '#e6cb74'; break;
                case 4: _color = '#ad81ff'; break;
                case 5: _color = '#75715e'; break;
            }
    		return {lineHeight: this.props.lineHeight + 'px', color: _color, zIndex: '1', position: 'absolute', left: _left + 'px', top: _top + 'px', fontSize: this.props.fontSize + 'px', fontFamily: this.props.fontFamily};
        };
    	
        return(
            <p style={getStyle(this.props.line, this.props.position, this.props.color)}>{this.props.word}</p>
        );
    }
}

export default Keyword;