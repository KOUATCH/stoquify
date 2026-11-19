async function call(command,input){return(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,input})})).json()}
exports.getManagedLeaveWorkspaceAction=input=>call('READ',input)
exports.adjustHrisLeaveBalanceAction=input=>call('ADJUST',input)
exports.executeHrisLeaveEntitlementsAction=input=>call('EXECUTE',input)
exports.decideLeaveCancellationAction=input=>call('DECIDE',input)
exports.requestLeaveCancellationAction=input=>call('CANCEL',input)
exports.requestOperationalTimeAction=input=>call('REQUEST',input)
