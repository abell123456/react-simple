import {instantiateReactComponent} from './util';
import ReactClass from './react-class';
import ReactElement from './react-element';
import $ from 'jquery';

// ****** React实例 ******
const React = {
    nextReactRootIndex: 0,

    createClass(spec) {
        // 生成一个子类
        let Constructor = function(props) {
            // 构造函数里初始化props、state
            this.props = props;
            this.state = this.getInitialState ? this.getInitialState() : null;
        };

        // 原型继承，继承超级父类
        Constructor.prototype = new ReactClass();
        Constructor.prototype.constructor = Constructor;

        // 混入spec到原型
        Object.assign(Constructor.prototype, spec);

        // 总结起来，通过Constructor new出来的实例有：
        // props、state、render、setState
        return Constructor;
    },

    // type: 1、createClass()；2、element、3、text
    // config：配置项，value、onkeyup等
    // children：子元素
    createElement(type, config, children) {
        let props = {};
        let propName;

        config = config || {};

        // 看有没有key，用来标识element的类型，方便以后高效的更新，这里可以先不管
        let key = config.key || null;

        // 复制config里的内容到props
        for (propName in config) {
            if (config.hasOwnProperty(propName) && propName !== 'key') {
                props[propName] = config[propName];
            }
        }

        // 处理children,全部挂载到props的children属性上
        // 支持两种写法，如果只有一个参数，直接赋值给children，否则做合并处理
        let childrenLength = arguments.length - 2;

        if (childrenLength === 1) {
            // 保证props的children属性是一个数组
            props.children = $.isArray(children) ? children : [children];
        } else if (childrenLength > 1) {
            let childArray = Array(childrenLength);

            for (let i = 0; i < childrenLength; i++) {
                childArray[i] = arguments[i + 2];
            }

            props.children = childArray;
        }

        return new ReactElement(type, key, props);
    },

    render(element, container) {
        let componentInstance = instantiateReactComponent(element);

        let markup = componentInstance.mountComponent(React.nextReactRootIndex++);

        $(container).html(markup);

        // 触发完成mount的事件
        $(document).trigger('mountReady');
    }
};

export default React;
