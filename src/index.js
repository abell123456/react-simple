import React from './react-simple/index';
import simplePubSub from 'simple-pub-sub';

// Input Component
const Input = React.createClass({
    getInitialState() {
        return {
            value: ''
        };
    },

    onChange(e) {
        const val = e.target.value;

        this.setState({
            value: val
        });

        this.props.changeHandler(val);
    },

    render() {
        return React.createElement('input', {
            onkeyup: this.onChange.bind(this)
        });
    }
});

// Button Component
const Button = React.createClass({
    getInitialState() {
        return {
            text: 'ADD',
            num: 0
        };
    },

    clickHandler(e) {
        this.props.add();

        const num = ++this.state.num;

        this.setState({
            num: num,
            text: 'ADD#' + num
        });
    },

    render() {
        return React.createElement('button', {
            onclick: this.clickHandler.bind(this)
        }, this.state.text);
    }
});


// List Component
const TodoList = React.createClass({
    getInitialState() {
        return {
            items: []
        };
    },

    add(text) {
        const nextItems = this.state.items.concat(text);

        this.setState({
            items: nextItems
        });
    },

    render() {
        const createItem = function(itemText) {
            return React.createElement('li', null, itemText);
        };

        // 添加之后的列表项
        const lists = this.state.items.map(createItem);

        // 将输入框、添加按钮、以及添加之后的list列表作为子元素
        return React.createElement('ul', null, lists);
    },

    componentDidMount() {
        simplePubSub.on('add', function(text) {
            this.add(text);
        }.bind(this));
    }
});

// Container Component
const ContainerComponent = React.createClass({
    getInitialState() {
        return {
            text: ''
        };
    },

    // 输入框输入值的事件变化
    changeHandler(text) {
        // 记录下输入框的state
        this.setState({
            text: text
        });
    },

    add() {
        simplePubSub.trigger('add', this.state.text);
    },

    render() {
        // 输入框元素
        const input = React.createElement(Input, {
            changeHandler: this.changeHandler.bind(this)
        });

        // 添加按钮元素
        const button = React.createElement(Button, {
            add: this.add.bind(this)
        });

        // 列表
        const list = React.createElement(TodoList);

        return React.createElement('div', null, [input, button, list]);
    }
});


React.render(React.createElement(ContainerComponent), document.getElementById('container'));
