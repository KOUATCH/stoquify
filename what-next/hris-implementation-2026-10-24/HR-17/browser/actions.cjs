async function action(operation,input){const r=await fetch('/fixture/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,input})});return r.json()}
exports.getLifecycleTaskWorkspaceAction=i=>action('READ',i);
exports.decideLifecycleTaskAction=i=>action('DECIDE',i);
exports.rescheduleLifecycleTaskSourceAction=i=>action('RESCHEDULE',i);
