// jsdom does not expose these standard browser encoders. No application setup,
// environment file, persistence adapter, network or action is loaded here.
const { TextEncoder, TextDecoder } = require('node:util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
