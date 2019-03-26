import MyPromise from "./Promise";

console.log('hello');
const promiseA = new MyPromise<number>((resolve, reject) => {
  // setTimeout(() => {
  //   resolve(1);
  // }, 0);
  resolve(1);
  // reject('abc');

  // resolve(new MyPromise<number>((resolve2, reject2) => {
  //   resolve2(1);
  // }));
});

// promiseA.then();
promiseA.then((value) => {
  console.log(value);
  return value;
}).then((value) => {
  console.log(value + 1);
});
promiseA.catch((reason) => {
  console.log(reason);
});

// const promiseB = new Promise<number>((resolve, reject) => {
//   // resolve(1);
//   setTimeout(() => {
//     resolve(1);
//   }, 0);
// });

// promiseB.then((value) => {
//   console.log(value);
//   return value;
// }).then((value) => {
//   console.log(value + 1);
// });