export const isFunction = (supposedFunction: any) => typeof supposedFunction === 'function';

export const isObject = (supposedObject: any) => (
  typeof supposedObject === 'object' &&
  supposedObject !== null &&
  !Array.isArray(supposedObject)
);

export const isThenable = (supposedThenable: any) => (
  isObject(supposedThenable) &&
  isFunction(supposedThenable.then)
);

export interface Thenable {
  [key: string]: any;
  then: (...args) => void;
};