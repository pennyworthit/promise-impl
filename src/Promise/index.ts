import { isFunction, Thenable } from "./introspection";

interface Resolve<T> { (value: T | MyPromise<T>): void; }
interface Reject { (reason: any): void }
interface Executor<T> { (resolve: Resolve<T>, reject: Reject): void; }
interface FulfilledHandler<T> { (value: T): any; }
interface RejectedHandler { (value: any): any; }
interface PromiseHandler<T> {
  onSuccess: FulfilledHandler<T>[];
  onFailure: RejectedHandler[];
};

enum State {
  pending,
  fulfilled,
  rejected,
}

export default class MyPromise<T> {
  /**
   * 转换状态
   */
  private state: State = State.pending;

  /**
   * 结果
   */
  private value: T | Thenable | undefined = undefined;

  /**
   * 操作失败原因
   */
  private reason: any = undefined;

  /**
   * 回调注册
   * 
   * 对于同一个 promise, 多次调用 then 或 catch 时，是需要注册对对应的数组中
   */
  private handlers: PromiseHandler<T> = {
    onSuccess: [],
    onFailure: [],
  };

  constructor(executor: Executor<T>) {
    try {
      executor(this.resolve, this.reject);
    } catch (e) {
      this.reject(e);
    }
  }

  public then(onFulfilled?: FulfilledHandler<T>, onRejected?: RejectedHandler): MyPromise<T> {
    const { state, value, reason } = this;

    const nextPromiseExecutor = (onFulFilledNext: Resolve<T>, onRejectedNext: Reject) => {
      const fulfill = (val) => {
        try {
          if (!isFunction(onFulfilled)) {
            // 上一环的 fulFill 不可执行，那就直接执行本环的
            // 这里，就体现着 Promise 链式调用时，获取到上一个环处理后的值的原因
            onFulFilledNext(val);
          } else {
            // 上一环的 fulFill 可执行，先执行
            // 并取得上一环的结果
            const result = onFulfilled!(val);
            if (result instanceof MyPromise) {
              // 但 result 还是一个 Promise
              // 需要先等待这个嵌套的 Promise 完成
              // 再执行本环的 fulFill 或 reject
              result.then(onFulFilledNext, onRejectedNext);
            } else {
              // result 只是一个普通值
              // 传给下一环作为入参
              // 这里，就体现着 Promise 链式调用时，获取到上一个环处理后的值的原因
              onFulFilledNext(result);
            }
          }
        } catch (e) {
          onRejectedNext(e);
        }
      };
      const reject = (reason) => {
        try {
          if (!isFunction(onRejected)) {
            onRejectedNext(reason);
          } else {
            const result = onRejected!(reason);
            if (result instanceof MyPromise) {
              result.then(onFulFilledNext, onRejectedNext);
            } else {
              onRejectedNext(reason);
            }
          }
        } catch (e) {
          onRejectedNext(e);
        }
      };
      switch (state) {
        case State.pending:
        {
          // then 方法可以多次调用，这里的多次调用指的是对同一个 promise 进行多次的 then 方法调用
          // 对于同一个 promise, 每一次调用 then 方法，就需要将成功或失败回调注册到 promise 上，以便之后按顺序进行回调
          this.handlers.onSuccess.push(fulfill);
          this.handlers.onFailure.push(reject);
          break;
        }
        case State.fulfilled:
        {
          setTimeout(() => {
            fulfill(value);
          }, 0);
          break;
        }
        case State.rejected:
        {
          setTimeout(() => {
            reject(reason);
          }, 0);
          break;
        }
      }
    };

    return new MyPromise(nextPromiseExecutor);
  }

  public catch(onRejected): MyPromise<T> {
    return this.then(undefined, onRejected);
  }

  private resolve = (value: MyPromise<T> | T) => {
    // 必须为 pending 时才能执行，每个 Promise 的 resolve 只执行一次
    if (!this.isPending) return;

    // ⚠️: 有情况，由于 value 是任何类型的数据，所以 value 也可能是一个 promise
    // Aha, surprise!
    // 此时，(value as Promise) 的状态决定了当前 Promise 的状态

    if (value instanceof MyPromise) {
      const onFulFilled = (val) => {
        this.state = State.fulfilled;
        this.value = val;
        // 执行注册的回调
        this.executeRegisteredHandlers(this.handlers.onSuccess, this.value);
      };
      const onRejected = (reason) => {
        this.state = State.rejected;
        this.reason = reason;
        // 执行注册的回调
        this.executeRegisteredHandlers(this.handlers.onFailure, this.reason);
      };
      // value.then(onFulFilled, onRejected);
      value.then((val) => { onFulFilled(val); }, (error) => { onRejected(error); });
    } else {
      this.state = State.fulfilled;
      this.value = value;
      // 执行注册的回调
      this.executeRegisteredHandlers(this.handlers.onSuccess, this.value);
    }
  }

  private reject = (reason) => {
    // 必须为 pending 时才能执行，每个 Promise 的 reject 只执行一次
    if (!this.isPending) return;

    this.state = State.rejected;
    this.reason = reason;

    // 执行注册的回调
    this.executeRegisteredHandlers(this.handlers.onFailure, this.reason);
  }

  private executeRegisteredHandlers = (handlers: (FulfilledHandler<T> | RejectedHandler)[], value) => {
    // const executeHandlers = () => {
    //   // handlers.forEach(ele => ele(value));
    //   let handler: FulfilledHandler<T> | RejectedHandler | undefined;
    //   while (handler = handlers.shift()) {
    //     handler(value);
    //   }
    // };
    handlers.forEach(handler => handler(value));
    // 清空 handlers
    handlers = [];
  }

  private get isPending() : boolean {
    return this.state === State.pending;
  }
}