// ****** 超级父类 ******
// 定义ReactClass类,所有自定义的超级父类
export default class ReactClass {
	render() {}

	setState(newState) {
		// 还记得我们在ReactCompositeComponent里面mount的时候做了赋值
		// 所以这里可以拿到对应的ReactCompositeComponent的实例_reactInternalInstance
		this._reactInternalInstance.receiveComponent(null, newState);
	}
}
