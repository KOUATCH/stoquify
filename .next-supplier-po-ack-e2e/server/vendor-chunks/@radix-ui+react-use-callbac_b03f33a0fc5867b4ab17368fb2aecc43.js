"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/@radix-ui+react-use-callbac_b03f33a0fc5867b4ab17368fb2aecc43";
exports.ids = ["vendor-chunks/@radix-ui+react-use-callbac_b03f33a0fc5867b4ab17368fb2aecc43"];
exports.modules = {

/***/ "(ssr)/./node_modules/.pnpm/@radix-ui+react-use-callbac_b03f33a0fc5867b4ab17368fb2aecc43/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs":
/*!******************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@radix-ui+react-use-callbac_b03f33a0fc5867b4ab17368fb2aecc43/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs ***!
  \******************************************************************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   useCallbackRef: () => (/* binding */ useCallbackRef)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"(ssr)/./node_modules/.pnpm/next@15.5.23_@babel+core@7._dc4baac3ef98eb3bf027ff9111b32a12/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js\");\nvar __defProp = Object.defineProperty;\nvar __name = (target, value) => __defProp(target, \"name\", { value, configurable: true });\n\n// src/use-callback-ref.tsx\n\nfunction useCallbackRef(callback) {\n  const callbackRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(callback);\n  react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {\n    callbackRef.current = callback;\n  });\n  return react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => ((...args) => callbackRef.current?.(...args)), []);\n}\n__name(useCallbackRef, \"useCallbackRef\");\n\n//# sourceMappingURL=index.mjs.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvLnBucG0vQHJhZGl4LXVpK3JlYWN0LXVzZS1jYWxsYmFjX2IwM2YzM2EwZmM1ODY3YjRhYjE3MzY4ZmIyYWVjYzQzL25vZGVfbW9kdWxlcy9AcmFkaXgtdWkvcmVhY3QtdXNlLWNhbGxiYWNrLXJlZi9kaXN0L2luZGV4Lm1qcyIsIm1hcHBpbmdzIjoiOzs7OztBQUFBO0FBQ0EsNERBQTRELDJCQUEyQjs7QUFFdkY7QUFDK0I7QUFDL0I7QUFDQSxzQkFBc0IseUNBQVk7QUFDbEMsRUFBRSw0Q0FBZTtBQUNqQjtBQUNBLEdBQUc7QUFDSCxTQUFTLDBDQUFhO0FBQ3RCO0FBQ0E7QUFHRTtBQUNGIiwic291cmNlcyI6WyJFOlxcb2hhZGEgc2Fhc1xcRm9jdXNlZCBwcm9qZWN0c1xcc3RvcXVpZnlcXG5vZGVfbW9kdWxlc1xcLnBucG1cXEByYWRpeC11aStyZWFjdC11c2UtY2FsbGJhY19iMDNmMzNhMGZjNTg2N2I0YWIxNzM2OGZiMmFlY2M0M1xcbm9kZV9tb2R1bGVzXFxAcmFkaXgtdWlcXHJlYWN0LXVzZS1jYWxsYmFjay1yZWZcXGRpc3RcXGluZGV4Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIF9fbmFtZSA9ICh0YXJnZXQsIHZhbHVlKSA9PiBfX2RlZlByb3AodGFyZ2V0LCBcIm5hbWVcIiwgeyB2YWx1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuXG4vLyBzcmMvdXNlLWNhbGxiYWNrLXJlZi50c3hcbmltcG9ydCAqIGFzIFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuZnVuY3Rpb24gdXNlQ2FsbGJhY2tSZWYoY2FsbGJhY2spIHtcbiAgY29uc3QgY2FsbGJhY2tSZWYgPSBSZWFjdC51c2VSZWYoY2FsbGJhY2spO1xuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNhbGxiYWNrUmVmLmN1cnJlbnQgPSBjYWxsYmFjaztcbiAgfSk7XG4gIHJldHVybiBSZWFjdC51c2VNZW1vKCgpID0+ICgoLi4uYXJncykgPT4gY2FsbGJhY2tSZWYuY3VycmVudD8uKC4uLmFyZ3MpKSwgW10pO1xufVxuX19uYW1lKHVzZUNhbGxiYWNrUmVmLCBcInVzZUNhbGxiYWNrUmVmXCIpO1xuZXhwb3J0IHtcbiAgdXNlQ2FsbGJhY2tSZWZcbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5tanMubWFwXG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/.pnpm/@radix-ui+react-use-callbac_b03f33a0fc5867b4ab17368fb2aecc43/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs\n");

/***/ })

};
;