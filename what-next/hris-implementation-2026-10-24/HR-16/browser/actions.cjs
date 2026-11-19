async function action(operation,input){const r=await fetch('/fixture/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,input})});return r.json()}
exports.getOwnCorrectionWorkspaceAction=i=>action('OWN',i);
exports.submitOwnCorrectionAction=i=>action('SUBMIT',i);
exports.amendOwnCorrectionAction=i=>action('AMEND',i);
exports.getCorrectionQueueAction=i=>action('QUEUE',i);
exports.getCorrectionReviewAction=i=>action('REVIEW',i);
exports.decideCorrectionAction=i=>action('DECIDE',i);
exports.requestOwnOperationalTimeAction=i=>action('TIME',i);
exports.cancelOwnLeaveRequestAction=i=>action('CANCEL',i);
