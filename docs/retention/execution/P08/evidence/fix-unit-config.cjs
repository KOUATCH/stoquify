const fs=require('node:fs'),path=require('node:path')
const file=path.join(__dirname,'jest.unit.cjs')
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace("setupFilesAfterEnv:['<rootDir>/jest.setup.ts']","setupFilesAfterEnv:['<rootDir>/jest.setup.ts',__dirname+'/ui.setup.cjs']"))
