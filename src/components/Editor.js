import React from 'react';
import axios from 'axios';
import io from 'socket.io-client'
import Keyword from './Keyword.js';
import Completion from './Completion.js';

import Label from 'react-bootstrap/lib/Label';
import Button from 'react-bootstrap/lib/Button';
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import DropdownButton from 'react-bootstrap/lib/DropdownButton';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import Modal from 'react-bootstrap/lib/Modal';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import ControlLabel from  'react-bootstrap/lib/ControlLabel';

class Editor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {highlights: [], height: this.props.defaultHeight, files: [], symbols: [], selected: -1, fileName: 'untitled', executing: false, showModal: false};
        this.isLetter = this.isLetter.bind(this);
        this.isNumber = this.isNumber.bind(this);
        this.parseString = this.parseString.bind(this);
        this.change = this.change.bind(this);
        this.save = this.save.bind(this);
    }

    componentDidMount() {
        this.socket = io('');
        this.socket.on('change', data => {
            if (this.state.fileName != 'untitled' && this.state.fileName == data.name) {
                let start = this.textArea.selectionStart, end = this.textArea.selectionEnd, change = data.code.length - this.textArea.value.length;
                this.textArea.value = data.code;
                this.parseString(this.textArea.value);
                this.textArea.selectionStart = (data.pos < start) ? (start + change) : start;
                this.textArea.selectionEnd = (data.pos < end) ? (end + change) : end;
            }
        });
        this.socket.on('result', data => {
            this.setState({executing: false});
            this.textAreaResult.value = data.result + "\n\nExecution finished.";
        });
        this.socket.on('list', data => {
            let list = [];
            for (let i = 0; i < data.names.length; i++) 
                list.push(data.names[i].name);
            this.setState({files: list});
        });
        this.socket.on('file', data => {
            this.textArea.value = data.code;
            this.parseString(data.code);
        });
        this.socket.emit('list', '');
    }

    isLetter(ch) {
        let l = 'a' <= ch && ch <= 'z';
        let u = 'A' <= ch && ch <= 'Z';
        let d = '0' <= ch && ch <= '9';
        return l || u || d || ch == '_';
    }

    isNumber(str) {
        for (let i = 0; i < str.length; i++)
            if (str.charAt(i) < '0' || '9' < str.charAt(i))
                return false;
        return true;
    }

    keyDownHandle(e) {
        if (e.which == 9)
            e.preventDefault();
        else if (this.state.symbols.length > 0) {
            if (e.which == 40)
                e.preventDefault();
            else if (e.which == 38 && this.state.selected != -1)
                e.preventDefault();
            else if (e.which == 13 && this.state.selected != -1)
                e.preventDefault();
        }
    }

    keyHandle(e) {
        let cont = e.target.value;
        let pos = e.target.selectionEnd;
        let str = String.fromCharCode(e.which);
        switch (e.which) {
            case 40:
                e.target.value = cont.substring(0, pos) + '()' + cont.substring(pos, cont.length);
                e.target.selectionEnd = pos + 1;
                str = '()';
                e.preventDefault();
                this.change(e.target.value, e.target.selectionStart);
                break;
            case 123:
                e.target.value = cont.substring(0, pos) + '{}' + cont.substring(pos, cont.length);
                e.target.selectionEnd = pos + 1;
                str = '{}';
                e.preventDefault();
                this.change(e.target.value, e.target.selectionStart);
                break;
            case 91:
                e.target.value = cont.substring(0, pos) + '[]' + cont.substring(pos, cont.length);
                e.target.selectionEnd = pos + 1;
                str = '[]';
                e.preventDefault();
                this.change(e.target.value, e.target.selectionStart);
                break;
            case 41:
                if (cont.charAt(pos) == ')') {
                    e.target.selectionStart = e.target.selectionEnd = pos + 1;
                    str = '';
                    e.preventDefault();
                    this.change(e.target.value, e.target.selectionStart);
                }
                break;
            case 125:
                if (cont.charAt(pos) == '}') {
                    e.target.selectionStart = e.target.selectionEnd = pos + 1;
                    str = '';
                    e.preventDefault();
                  this.change(e.target.value, e.target.selectionStart);
                }
                break;
            case 93:
                if (cont.charAt(pos) == ']') {
                    e.target.selectionStart = e.target.selectionEnd = pos + 1;
                    str = '';
                    e.preventDefault();
                    this.change(e.target.value, e.target.selectionStart);
                }
                break;
            case 13: // new line
                let count = 0;
                for (let i = 0; i < pos; i++) {
                    if (cont.charAt(i) == '{')
                        count++;
                    else if (cont.charAt(i) == '}')
                        count--;
                }
                if (count > 0) {
                    str = '\n'
                    let len = count * 4;
                    for (let i = 0; i < len; i++)
                        str += ' ';
                    if (cont.charAt(pos - 1) == '{') {
                        str += '\n';
                        for (let i = 0; i < len - 4; i++)
                            str += ' ';
                    }
                    e.target.value = cont.substring(0, pos) + str + cont.substring(pos, cont.length);
                    e.target.selectionEnd = pos + len + 1;
                } else {
                    e.target.value = cont.substring(0, pos) + '\n' + cont.substring(pos, cont.length);
                    e.target.selectionEnd = pos + 1;
                }
                e.preventDefault();
                this.change(e.target.value, e.target.selectionStart);
                break;
        }
    }

    keyUpHandle(e) {
        if (e.which == 9) { // tab
            let cont = e.target.value;
            let pos = e.target.selectionEnd;
            e.target.value = cont.substring(0, pos) + '    ' + cont.substring(pos, cont.length);
            e.target.selectionEnd = pos + 4;
            this.change(e.target.value, e.target.selectionStart);
        } else if (this.state.symbols.length > 0) {
            let s = this.state.selected;
            if (e.which == 40) { // arrow (down)
                s++;
                s %= this.state.symbols.length;
                this.setState({selected: s});
            } else if (e.which == 38) { // arrow (up)
                s--;
                if (s >= 0)
                    this.setState({selected: s});
                else
                    this.setState({selected: s, symbols: []});
            } else if (e.which == 37 || e.which == 39)
                this.setState({selected: -1, symbols: []});
            else if (e.which == 13) {
                let cont = this.textArea.value, sym = this.state.symbols[s];
                this.textArea.value = cont.substring(0, sym.absolutePosition) + sym.word + cont.substring(this.textArea.selectionStart, cont.length);
                this.textArea.selectionStart = this.textArea.selectionEnd = sym.absolutePosition + sym.word.length;
                this.change(this.textArea.value, sym.absolutePosition);
            }
        }
    }

    change(code, pos) {
        this.parseString(code);
        this.socket.emit('change', {code: code, pos: pos, name: this.state.fileName});
    }

    changeHandle(e) {
        this.change(e.target.value, e.target.selectionStart);
    }

    parseString(cont) {
        cont += '\n';
        let str = '', highlight = [], symbols = [], comp = [], line = 0, position = 0, quote = false, comment1 = false, comment2 = false;
        for (let i = 0; i < cont.length; i++) {
            let ch = cont.charAt(i), chn = cont.charAt(i + 1);
            if (this.isLetter(ch)) {
                str += ch;
            } else if (comment1) {
                if (ch == '*' && chn == '/') {
                    str += ch;
                    str += chn;
                    i++;
                    position++;
                    comment1 = false;
                    console.log(str, position);
                    highlight.push({line : line, position : 1 + position - str.length, word : str,_color : 5});
                    str = '';
                } else if (ch == '\n') {
                    console.log(str, position);
                    highlight.push({line : line, position : position - str.length, word : str, color : 5});
                    str = '';
                } else if (ch != ' ' || str != '')
                    str += ch;
            } else if (comment2) {
                if (ch == '\n') {
                    comment2 = false;
                    highlight.push({line : line, position : position - str.length, word : str, color : 5});
                    str = '';
                } else 
                    str += ch;
            } else if (ch == '/' && chn == '*') {
                str = '';
                str += ch + chn;
                position++;
                i++;
                comment1 = true;
            } else if (ch == '/' && chn == '/') {
                str = '';
                str += ch + chn;
                position++;
                i++;
                comment2 = true;
            } else if (quote) {
                str += ch;
                if (ch == '\"') {
                    quote = false;
                    highlight.push({line : line, position : position - str.length + 1, word : str, color : 3});
                    str = '';
                }
            } else if (ch == '\"') {
                str = '';
                str += ch;
                quote = true;
            } else {
                if (this.props.keywordsRed.indexOf(str) != -1)
                    highlight.push({line : line, position : position - str.length, word : str, color : 0});
                else if (this.props.keywordsBlue.indexOf(str) != -1)
                    highlight.push({line : line, position : position - str.length, word : str, color : 1});
                else if (this.props.keywordsOrange.indexOf(str) != -1)
                    highlight.push({line : line, position : position - str.length, word : str, color : 2});
                else if (this.props.keywordsPurple.indexOf(str) != -1)
                    highlight.push({line : line, position : position - str.length, word : str, color : 4});
                else {
                    if (str != '' && !this.isNumber(str) && symbols.indexOf(str) == -1)
                        symbols.push(str);
                    if ('A' <= str.charAt(0) && str.charAt(0) <= 'Z')
                        highlight.push({line : line, position : position - str.length, word : str, color : 1});
                    else if (this.isNumber(str))
                        highlight.push({line : line, position : position - str.length, word : str, color : 4});
                }
                str = '';
            }
            position++;
            if (ch == '\n') {
                line++;
                position = 0;
            }
        }

        let start;
        for (start = this.textArea.selectionStart - 1; start >= 0; start--)
            if (!this.isLetter(cont.charAt(start)))
                break;
        let line_ = 0;
        position = 0;
        for (let i = 0; i < start + 1; i++) {
            position++;
            if (cont.charAt(i) == '\n') {
                line_++;
                position = 0;
            }
        }
        let current = cont.substring(start + 1, this.textArea.selectionStart);
        if (current != '') {
            let l = symbols.concat(this.props.keywordsBlue).concat(this.props.keywordsOrange).concat(this.props.keywordsPurple).concat(this.props.keywordsRed);
            for (let i = 0; i < l.length; i++) {
                if (l[i].indexOf(current) == 0 && l[i] != current)
                    comp.push({word: l[i], absolutePosition: start + 1, position: position, line: ++line_});
            }
        }

        let h = this.props.lineHeight * line + 100;
        this.setState({highlights: highlight, height: (this.props.defaultHeight > h ? this.props.defaultHeight : h), symbols: comp, selected: -1});
    }

    onNew(e) {
        this.textArea.value = '';
        this.setState({fileName: 'untitled'});
        this.parseString('');
    }

    onSave(e) {
        if (this.state.fileName == 'untitled') {
            this.setState({showModal: true});
        } else
            this.save(this.state.fileName);
    }

    save(name) {
        this.socket.emit('save', {name: name, code: this.textArea.value});
    }

    onExecute(e) {
        this.textAreaResult.value = '';
        this.socket.emit('run', {name: this.state.fileName});
        this.setState({executing: true});
    }

    onDelete(e) {
        this.textArea.value = '';
        this.parseString('');
        this.socket.emit('del', {name: this.state.fileName});
        this.socket.emit('change', {code: ''});
        this.setState({fileName: 'untitled'});
    }

    onLoad(key, e) {
        this.setState({fileName: key});
        this.socket.emit('file', {name: key});
    }

    closeModal() {
        this.setState({showModal: false});
    }

    saveModal() {
        if (this.name.value != '') {
            for (let i = 0; i < this.name.value.length; i++) {
                if (!this.isLetter(this.name.value[i]))
                    return;
            }
            this.setState({showModal: false, fileName: this.name.value + this.type.value});
            this.save(this.name.value + this.type.value);
        }
    }

    render() {
        let style_buttonGroup = {margin: this.props.margin + 'px', display: 'block'};

        let style_form = {marginBottom: this.props.margin + 'px'};

        let style_code = {color: '#ffffff', backgroundColor: '#272822', fontSize: this.props.fontSize + 'px', lineHeight: this.props.lineHeight + 'px',
                        width: 'calc(100% - ' + (this.props.margin * 2) + 'px)', height: this.state.height + 'px', margin: this.props.margin + 'px', boxSizing: 'border-box', fontFamily: this.props.fontFamily};

        let style_result = {color: '#000000', backgroundColor: '#ffffff', width : 'calc(100% - ' + (this.props.margin * 2) + 'px)', height: this.props.resultHeight + 'px', margin: this.props.margin + 'px', marginTop: 0,
                        fontSize: this.props.fontSize, fontFamily: this.props.fontFamily};
        return (
            <div>
                <div>
                    {this.state.highlights.map((data, i) => <Keyword position={data.position}
                                                                    line={data.line}
                                                                    word={data.word}
                                                                    color={data.color}
                                                                    fontSize={this.props.fontSize}
                                                                    lineHeight={this.props.lineHeight}
                                                                    fontFamily={this.props.fontFamily}
                                                                    key={i}/>)}
                </div>

                <div>
                    {this.state.symbols.map((data, i) => <Completion position={data.position}
                                                                    line={data.line}
                                                                    word={data.word}
                                                                    fontSize={this.props.fontSize}
                                                                    lineHeight={this.props.lineHeight}
                                                                    fontFamily={this.props.fontFamily}
                                                                    selected={this.state.selected == i}
                                                                    key={i}/>)}
                </div>

                <div>
                    <Modal show={this.state.showModal} onHide={this.closeModal.bind(this)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Save new file</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <form style={style_form}>
                                <ControlLabel>File Name</ControlLabel>
                                <FormControl inputRef={ref => this.name = ref} type='text' placeholder="Enter file name">
                                </FormControl>
                            </form>
                            <FormGroup>
                                <ControlLabel>File Type</ControlLabel>
                                <FormControl inputRef={ref => this.type = ref} componentClass="select">
                                    <option value='.java'>Java file</option>
                                    <option value=''>Resource file</option>
                                </FormControl>
                            </FormGroup>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button onClick={this.closeModal.bind(this)}>Cancel</Button>
                            <Button onClick={this.saveModal.bind(this)}>Save</Button>
                        </Modal.Footer>
                    </Modal>
                </div>

                <div>
                    <ButtonGroup style={style_buttonGroup}>
                        <Button bsStyle='primary'>{this.state.fileName}</Button>
                        <Button onClick={this.onNew.bind(this)}>New</Button>
                        <DropdownButton title='Load' id='load_dropdown'>
                            {this.state.files.map((data, i) => <MenuItem key={i} eventKey={data} onSelect={this.onLoad.bind(this)}>{data}</MenuItem>)}
                        </DropdownButton>
                        <Button onClick={this.onSave.bind(this)}>Save</Button>
                        <Button onClick={this.onDelete.bind(this)} disabled={this.state.fileName=='untitled'}>Delete</Button>
                        <Button onClick={this.onExecute.bind(this)} disabled={this.state.fileName.indexOf('.java') == -1 || this.state.executing}>Execute</Button>
                        <Button href={'http://52.78.19.20:3000/jar/?name=' + this.state.fileName.substring(0, this.state.fileName.length - 5)} disabled={this.state.fileName.indexOf('.java') == -1}>Make .jar</Button>
                    </ButtonGroup>
                    <textArea onKeyDown={this.keyDownHandle.bind(this)} onKeyPress={this.keyHandle.bind(this)} onKeyUp={this.keyUpHandle.bind(this)} onChange={this.changeHandle.bind(this)}
                        ref={ref => this.textArea = ref} style={style_code} spellCheck="false"></textArea>
                    <textArea ref={ref => this.textAreaResult = ref} style={style_result} disabled></textArea>
                </div>
            </div>
        );
    }
}

Editor.defaultProps = {
    keywordsRed: ['abstract', 'continue', 'for', 'new', 'switch', 'assert', 'default', 'package', 'synchronized', 'do', 'if', 'private', 'break', 'implements', 'protected', 'throw', 'else', 'import', 'public', 'throws', 'case', 'enum', 
    'instanceof', 'return', 'transient', 'catch', 'extends', 'try', 'final', 'interface', 'static', 'class', 'finally', 'strictfp', 'volatile', 'native', 'while'],
    keywordsBlue: ['void', 'boolean', 'char', 'int', 'short', 'long', 'double', 'float'],
    keywordsOrange: ['this', 'super'],
    keywordsPurple: ['true', 'false'],
    fontSize: 14,
    lineHeight: 21,
    defaultHeight: 600,
    resultHeight: 200,
    margin: 10,
    fontFamily: 'Consolas'
};

export default Editor;