import ReactDOMTextComponent from './text-component';
import ReactDOMComponent from './dom-component';
import ReactCompositeComponent from './composite-component';

// node: new ReactELement()
export const instantiateReactComponent = function(node) {
    // 文本节点的情况
    if (typeof node === 'string' || typeof node === 'number') {
        return new ReactDOMTextComponent(node);
    }
    // 浏览器默认节点的情况
    if (typeof node === 'object' && typeof node.type === 'string') {
        // 注意这里，使用了一种新的component
        return new ReactDOMComponent(node);
    }
    // 自定义的元素节点
    if (typeof node === 'object' && typeof node.type === 'function') {
        // 注意这里，使用新的component,专门针对自定义元素
        return new ReactCompositeComponent(node);
    }
};


// 用来判定两个element需不需要更新
// 这里的key是我们createElement的时候可以选择性的传入的。
// 用来标识这个element，当发现key不同时，我们就可以直接重新渲染，不需要去更新了。
export const shouldUpdateReactComponent = function(prevElement, nextElement) {
    if (prevElement != null && nextElement != null) {
        const prevType = typeof prevElement;
        const nextType = typeof nextElement;

        if (prevType === 'string' || prevType === 'number') {
            return nextType === 'string' || nextType === 'number';
        } else {
            return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
        }
    }

    return false;
};
