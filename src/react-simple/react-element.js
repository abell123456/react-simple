// ****** Virtual DOM类 ******
// ReactElement就是虚拟dom的概念，具有一个type属性代表当前的节点类型，还有节点的属性props
// 比如对于div这样的节点type就是div，props就是那些props,attributes
// 另外这里的key,可以用来标识这个element，用于优化以后的更新，这里可以先不管，知道有这么个东西就好了
export default class ReactElement {
	constructor(type, key, props) {
		this.type = type;
		this.key = key;
		this.props = props;
	}
}
