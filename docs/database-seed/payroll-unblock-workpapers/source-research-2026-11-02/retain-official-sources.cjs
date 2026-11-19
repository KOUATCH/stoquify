// Public-source evidence collection only. No application imports, secrets, database, or publication.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const sources = [
  ['DGI-CIRCULAIRE-LF2025.pdf', 'https://www.impots.cm/sites/default/files/documents/CIRCULAIRE%20LF2025..pdf', 'https://www.impots.cm/documents/39?page=2', '2025 fiscal implementation circular'],
  ['DGI-CIRCULAIRE-LF2026.pdf', 'https://www.impots.cm/sites/default/files/publications/circulaire%20lf%202026%20VF%20%281%29-compress%C3%A9.pdf', 'https://www.impots.cm/fr/publication/circulaire-loi-des-finances-du-17-decembre-2025', '2026 fiscal implementation circular'],
  ['DGI-BAREME-IRPP.pdf', 'https://www.impots.cm/sites/default/files/documents/BAREME%20IRPP_DSSI%20final.pdf', 'https://www.impots.cm/fr/documents/39', 'Indicative IRPP and other salary withholding table; applicability dates require review'],
  ['DGI-BAREME-TDL.pdf', 'https://www.impots.cm/sites/default/files/documents/BAREME%20TDL_DSSI%20final.pdf', 'https://www.impots.cm/fr/documents/39', 'Indicative salary-base TDL table; applicability dates require review'],
  ['DGI-RETENUES-SOURCE-2025.pdf', 'https://www.impots.cm/sites/default/files/documents/ARRETE%20N%C2%B0001%20DU%2007%20JANV%202025%20VF-compress%C3%A9.pdf', 'https://www.impots.cm/fr/documents/39', '2025 designated withholding entities; synthetic employer applicability not established'],
  ['DGI-RETENUES-SOURCE-2026.pdf', 'https://www.impots.cm/sites/default/files/documents/arr%C3%AAt%C3%A9%20RTS%202026%20VF.pdf', 'https://www.impots.cm/fr/documents/39', '2026 designated withholding entities; synthetic employer applicability not established'],
  ['DGI-CGI-2024.pdf', 'https://www.impots.cm/sites/default/files/documents/CGI%202024%20version%20francaise.pdf', 'https://www.impots.cm/documents/39?page=2', 'Historical baseline only; does not replace consolidated 2025 law or reviewer amendment reconciliation'],
  ['DGI-documents-39.html', 'https://www.impots.cm/fr/documents/39', null, 'Official source catalogue provenance'],
  ['DGI-search-2025.html', 'https://www.impots.cm/index.php/fr/search/node?keys=2025', null, 'Official historical source recovery search'],
];
async function main() {
  const entries = [];
  for (const [file, url, landingUrl, description] of sources) {
    const base = { file, sourceUrl:url, landingUrl, description, authority:'Direction Generale des Impots du Cameroun', retrievedAt:new Date().toISOString(), classification:'OFFICIAL_SOURCE_CANDIDATE_NOT_LEGAL_APPROVAL', approvedEffectiveFrom:null, approvedEffectiveTo:null };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      if (!['www.impots.cm','impots.cm'].includes(new URL(response.url).hostname)) throw new Error('UNEXPECTED_REDIRECT_HOST');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (file.endsWith('.pdf') && bytes.subarray(0,5).toString() !== '%PDF-') throw new Error('NOT_PDF_BYTES');
      fs.writeFileSync(path.join(root,file),bytes);
      const entry = {...base,status:'RETAINED',resolvedUrl:response.url,contentType:response.headers.get('content-type'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
      entries.push(entry); console.log(JSON.stringify({file,status:entry.status,bytes:entry.bytes,sha256:entry.sha256}));
    } catch (error) { const entry={...base,status:'RETRIEVAL_FAILED',error:error.message};entries.push(entry);console.log(JSON.stringify({file,status:entry.status,error:entry.error})); }
    fs.writeFileSync(path.join(root,'retained-source-manifest.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),productionUseAllowed:false,operatorUpdatesAllowed:false,statutoryApproval:false,entries},null,2)+'\n');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
