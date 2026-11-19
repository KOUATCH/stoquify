const React = require('react');
module.exports = function Link({href,children,...props}) {return React.createElement('a',{...props,href},children)};
