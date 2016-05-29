import $ from 'jquery';

// ****** 文本组件类 ******
// component类，用来表示文本在渲染，更新，删除时应该做些什么事情
class ReactDOMTextComponent {
    constructor(text) {
        // 存下当前的字符串
        this._currentElement = '' + text;
        // 用来标识当前component
        this._rootNodeID = null;
    }

    mountComponent(rootID) {
        this._rootNodeID = rootID;

        const currentElement = this._currentElement;

        return `<span data-reactid="${rootID}">${currentElement}</span>`;
    }

    receiveComponent(nextText) {
        let nextStringText = '' + nextText;

        // 跟以前保存的字符串比较(文本字符串的DIFF操作比较简单，就比较是否相同)
        if (nextStringText !== this._currentElement) {
            this._currentElement = nextStringText;


            // 替换整个节点
            $('[data-reactid="' + this._rootNodeID + '"]').html(this._currentElement);
        }
    }
}

export default ReactDOMTextComponent;
