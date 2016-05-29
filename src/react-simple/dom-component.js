import {instantiateReactComponent, shouldUpdateReactComponent} from './util';
import $ from 'jquery';

// ****** 普通DOM组件类 ******
// component类，用来表示DOM节点在渲染，更新，删除时应该做些什么事情


// 全局的更新深度标识（递归中标识是否递归结束的标识）
let updateDepth = 0;
// 全局的更新队列，所有的差异都存在这里(只针对某一次的DIFF)
let diffQueue = [];


// 差异更新的几种类型
const UPATE_TYPES = {
    MOVE_EXISTING: 1, // 将已存在的更换位置
    REMOVE_NODE: 2, // 只是将element删除
    INSERT_MARKUP: 3 // 新的节点插入
};

class ReactDOMComponent {
    constructor(element) {
        // 存下当前的element对象引用
        this._currentElement = element;
        this._rootNodeID = null;
    }

    mountComponent(rootID) {
        // 赋值标识
        this._rootNodeID = rootID;

        let props = this._currentElement.props;
        let elementType = this._currentElement.type;

        let tagOpen = '<' + elementType;
        let tagClose = '</' + elementType + '>';

        // 加上reactid标识
        tagOpen += ' data-reactid="' + this._rootNodeID + '"';

        // 拼凑出属性
        for (let propKey in props) {
            // 这里要做一下事件的监听，就是从属性props里面解析拿出on开头的事件属性的对应事件监听
            if (/^on[A-Za-z]/.test(propKey)) {
                let eventType = propKey.replace('on', '');
                // 针对当前的节点添加事件代理,以_rootNodeID为命名空间
                $(document).delegate('[data-reactid="' + this._rootNodeID + '"]',
                    eventType + '.' + this._rootNodeID,
                    props[propKey]
                );
            }

            // 对于children属性以及事件监听的属性不需要进行字符串拼接
            // 事件会代理到全局。这边不能拼到dom上不然会产生原生的事件监听
            if (props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)) {
                tagOpen += ' ' + propKey + '=' + props[propKey];
            }
        }

        // 获取子节点渲染出的内容(子节点可能为空)
        let content = '';
        let children = props.children || [];

        let childrenInstances = []; // 用于保存所有的子节点的componet实例，以后会用到
        let me = this;

        children.forEach((child, key) => {
            // 这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
            let childComponentInstance = instantiateReactComponent(child);
            childComponentInstance._mountIndex = key; // 标识该子节点在父节点下的顺序值

            // 将子节点缓存起来
            childrenInstances.push(childComponentInstance);
            // 子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
            let curRootId = me._rootNodeID + '.' + key;
            // 得到子节点的渲染内容
            let childMarkup = childComponentInstance.mountComponent(curRootId);
            // 拼接在一起
            content += ' ' + childMarkup;
        });

        // 留给以后更新时用的这边先不用管（_renderedChildren是个数组，留给DOM Diff用）
        this._renderedChildren = childrenInstances;

        // 拼出整个html内容
        return tagOpen + '>' + content + tagClose;
    }

    // 被更改后的下个状态的元素
    receiveComponent(nextElement) {
        let lastProps = this._currentElement.props; // 记录之前的属性
        let nextProps = nextElement.props; // 记录此时的属性

        this._currentElement = nextElement; // 更新当前元素

        // 接收新的元素之后，需要做两点更新：属性更新 & 子节点更新
        // 单独更新属性
        this._updateDOMProperties(lastProps, nextProps);

        // 再更新子节点
        this._updateDOMChildren(nextElement.props.children);
    }

    // 属性更新
    _updateDOMProperties(lastProps, nextProps) {
        let propKey;

        // 遍历，当一个老的属性不在新的属性集合里时，需要删除掉
        for (propKey in lastProps) {
            // 新的属性里有，或者propKey是在原型上的直接跳过，这样剩下的都是不在新属性集合里的，需要删除
            if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
                continue;
            }

            // 对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
            if (/^on[A-Za-z]/.test(propKey)) {
                let eventType = propKey.replace('on', '');
                // 针对当前的节点取消事件代理
                $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
                continue;
            }

            // 从dom上删除不需要的属性
            $('[data-reactid="' + this._rootNodeID + '"]').removeAttr(propKey);
        }

        // 对于新的属性，需要写到dom节点上
        for (propKey in nextProps) {
            // 对于事件监听的属性我们需要特殊处理
            if (/^on[A-Za-z]/.test(propKey)) {
                let eventType = propKey.replace('on', '');
                // 以前如果已经有，说明有了监听，需要先去掉
                lastProps[propKey] && $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
                // 针对当前的节点添加事件代理,以_rootNodeID为命名空间
                $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, nextProps[propKey]);
                continue;
            }

            if (propKey === 'children') {
                continue;
            }

            // 添加新的属性，或者是更新老的同名属性
            $('[data-reactid="' + this._rootNodeID + '"]').prop(propKey, nextProps[propKey]);
        }
    }

    // 更新子节点
    _updateDOMChildren(nextChildrenElements) {
        updateDepth++;
        // _diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
        this._diff(diffQueue, nextChildrenElements);
        updateDepth--;

        // 表明diff结束
        if (updateDepth === 0) {
            // 在需要的时候调用patch，执行具体的dom操作
            this._patch(diffQueue);
            diffQueue = [];
        }
    }

    // _diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue
    _diff(diffQueue, nextChildrenElements) {
        let self = this;

        // 拿到之前的子节点的component类型对象的集合,这个是在刚开始渲染时赋值的
        // _renderedChildren本来是数组，我们搞成map
        let prevChildren = flattenChildren(self._renderedChildren);

        // 生成新的子节点的component对象集合，这里注意，会复用老的component对象
        let nextChildren = generateComponentChildren(prevChildren, nextChildrenElements);

        // 重新赋值_renderedChildren，使用最新的。
        self._renderedChildren = [];

        Object.keys(nextChildren).forEach(key => self._renderedChildren.push(nextChildren[key]));


        let lastIndex = 0; // 代表访问老集合最后一次的位置

        let nextIndex = 0; // 代表到达的新的节点的index

        let name;

        // 通过对比两个集合的差异，组装差异节点添加到队列中
        for (name in nextChildren) {
            // 不是实例属性则跳出循环
            if (!nextChildren.hasOwnProperty(name)) {
                continue;
            }

            let prevChild = prevChildren && prevChildren[name];
            let nextChild = nextChildren[name];

            // 相同的话，说明是使用的同一个component,所以我们需要做移动的操作
            // ***移动***
            if (prevChild === nextChild) {
                // 添加差异对象，记录为：MOVE_EXISTING 类型
                prevChild._mountIndex < lastIndex && diffQueue.push({
                    parentId: self._rootNodeID,
                    parentNode: $('[data-reactid="' + self._rootNodeID + '"]'),
                    type: UPATE_TYPES.MOVE_EXISTING,
                    fromIndex: prevChild._mountIndex,
                    toIndex: nextIndex
                });


                lastIndex = Math.max(prevChild._mountIndex, lastIndex);

            } else { // 如果不相同，说明是新增加的节点
                // 但是如果老的还存在，就是element不同，但是component一样。我们需要把它对应的老的element删除。
                // 这也就是为什么上面复用老的component，而不是新生成一个
                if (prevChild) {
                    // 添加差异对象，类型：REMOVE_NODE
                    diffQueue.push({
                        parentId: self._rootNodeID,
                        parentNode: $('[data-reactid="' + self._rootNodeID + '"]'),
                        type: UPATE_TYPES.REMOVE_NODE,
                        fromIndex: prevChild._mountIndex,
                        toIndex: null
                    });

                    // 如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
                    if (prevChild._rootNodeID) {
                        $(document).undelegate('.' + prevChild._rootNodeID);
                    }

                    lastIndex = Math.max(prevChild._mountIndex, lastIndex);
                }

                // 新增加的节点，也组装差异对象放到队列里
                // 添加差异对象，类型：INSERT_MARKUP
                diffQueue.push({
                    parentId: self._rootNodeID,
                    parentNode: $('[data-reactid="' + self._rootNodeID + '"]'),
                    type: UPATE_TYPES.INSERT_MARKUP,
                    fromIndex: null,
                    toIndex: nextIndex,
                    markup: nextChild.mountComponent(self._rootNodeID + '.' + name) // 新增的节点，多一个此属性，表示新节点的dom内容
                });
            }
            // 更新mount的index
            nextChild._mountIndex = nextIndex;
            nextIndex++;
        }



        // 对于老的节点里有，新的节点里没有的那些，也全都删除掉
        for (name in prevChildren) {
            if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
                // 添加差异对象，类型：REMOVE_NODE
                diffQueue.push({
                    parentId: self._rootNodeID,
                    parentNode: $('[data-reactid="' + self._rootNodeID + '"]'),
                    type: UPATE_TYPES.REMOVE_NODE,
                    fromIndex: prevChildren[name]._mountIndex,
                    toIndex: null
                });

                // 如果以前已经渲染过了，记得先去掉以前所有的事件监听
                if (prevChildren[name]._rootNodeID) {
                    $(document).undelegate('.' + prevChildren[name]._rootNodeID);
                }
            }
        }
    }

    _patch(updates) {
        let update;
        let initialChildren = {};
        let deleteChildren = []; // 存的是jQuery对象
        let updatesLength = updates.length;

        for (let i = 0; i < updatesLength; i++) {
            update = updates[i];

            // 需要做移动/删除元素操作的节点
            if (update.type === UPATE_TYPES.MOVE_EXISTING || update.type === UPATE_TYPES.REMOVE_NODE) {
                let updatedIndex = update.fromIndex;
                // children()方法只会返回所有的一级子元素，该方法即是获取到要更新的元素
                let updatedChild = $(update.parentNode.children().get(updatedIndex));
                let parentID = update.parentID;

                // 所有需要更新的节点都保存下来，方便后面使用
                initialChildren[parentID] = initialChildren[parentID] || [];
                // 使用parentID作为简易命名空间
                initialChildren[parentID][updatedIndex] = updatedChild;

                // 所有需要修改的节点先删除，对于move的，后面再重新插入到正确的位置即可
                deleteChildren.push(updatedChild);
            }
        }

        // 删除所有需要先删除的
        $(deleteChildren).remove();


        // 再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
        for (let k = 0; k < updatesLength; k++) {
            update = updates[k];

            switch (update.type) {
                case UPATE_TYPES.INSERT_MARKUP:
                    insertChildAt(update.parentNode, $(update.markup), update.toIndex);
                    break;
                case UPATE_TYPES.MOVE_EXISTING:
                    insertChildAt(
                        update.parentNode,
                        initialChildren[update.parentID][update.fromIndex],
                        update.toIndex
                    );
                    break;
                case UPATE_TYPES.REMOVE_NODE:
                    // 什么都不需要做，因为上面已经帮忙删除掉了
                    break;
            }
        }
    }
}

// 普通的children是一个数组，此方法把它转换成一个map,key就是element的key,
// 如果是text节点或者element创建时并没有传入key,就直接用在数组里的index标识
function flattenChildren(componentChildren) {
    let child;
    let name;
    let childrenMap = {};

    for (let i = 0, len = componentChildren.length; i < len; i++) {
        child = componentChildren[i];
        name = child && child._currentelement && child._currentelement.key ? child._currentelement.key : i.toString(36);

        childrenMap[name] = child;
    }

    return childrenMap;
}

// 主要用来生成子节点elements的component集合
// 这边注意，有个判断逻辑，如果发现是更新，就会继续使用以前的componentInstance，调用对应的receiveComponent。
// 如果是新的节点，就会重新生成一个新的componentInstance
// 被后面的_diff使用
/**
 * nextChildrenElements: 子元素集合
 * prevChildren: component实例
 */
function generateComponentChildren(prevChildren, nextChildrenElements) {
    let nextChildren = {};

    nextChildrenElements = nextChildrenElements || []; // 没有传入后续的childrenElements则默认为空数组

    $.each(nextChildrenElements, function(index, element) {
        let name = element.key ? element.key : index;
        let prevChild = prevChildren && prevChildren[name];
        let prevElement = prevChild && prevChild._currentElement; // 对应的前一个组件的元素
        let nextElement = element;

        // 调用shouldUpdateReactComponent判断是否是更新
        if (shouldUpdateReactComponent(prevElement, nextElement)) {
            // 更新的话直接递归调用子节点的receiveComponent就好了
            prevChild.receiveComponent(nextElement);
            // 然后继续使用老的component
            nextChildren[name] = prevChild;
        } else {
            // 对于没有老的，那就重新新增一个，重新生成一个component
            let nextChildInstance = instantiateReactComponent(nextElement, null);
            // 使用新的component
            nextChildren[name] = nextChildInstance;
        }
    });

    return nextChildren;
}

// 用于将childNode插入到指定位置
/**
 * parentNode: 父节点
 * childNode: 子节点
 * index: 插入的位置
 */
function insertChildAt(parentNode, childNode, index) {
    let beforeChild = parentNode.children().get(index);

    beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode);
}

export default ReactDOMComponent;
